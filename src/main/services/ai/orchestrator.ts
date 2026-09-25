import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { extractor } from '../extractor';
import { aiProvider, ChatMessage } from './provider';
import {
  getAnalysisByCacheKey,
  storeAnalysisResult,
  getProviderById,
  getDocumentsByIds,
  listProviders,
} from '../../db/database';
import {
  StructuredAnalysisResultSchema,
  CURRENT_PROMPT_VERSION,
  HEALTH_OVERVIEW_JSON_SCHEMA,
  sanitizeJsonResponse,
  StructuredAnalysisResultOutput
} from '../../../shared/schema';
import type {
  AnalysisRecord,
  DocumentItem,
  ProviderProfile,
  AIProgressEvent
} from '../../../shared/types';
import { logger } from '../logger';

export class AIOrchestrator {
  private broadcastProgress(event: AIProgressEvent) {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('ai:progress', event);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Compute deterministic cache key = sha256(sortedDocumentHashes + promptVersion + providerId + model).
   */
  public computeCacheKey(
    documents: DocumentItem[],
    promptVersion: string,
    providerProfileId: string,
    modelName: string
  ): string {
    const sortedHashes = documents
      .map((d) => d.content_hash)
      .sort()
      .join(':');
    return crypto
      .createHash('sha256')
      .update(`${sortedHashes}_${promptVersion}_${providerProfileId}_${modelName}`)
      .digest('hex');
  }

  /**
   * Build the structured system prompt enforcing PRD §9 JSON contract.
   */
  /**
   * Build the structured system prompt enforcing PRD §9 JSON contract.
   */
  private buildSystemPrompt(): string {
    return `You are MedBuddy, an intelligent personal medical assistant and clinical document synthesis system.
Your job is to synthesize personal medical records (lab reports, clinical summaries, imaging notes, OPD prescriptions) into a high-impact, structured health overview.

DISCLAIMER: The summaries and metrics are for personal organization and informational overview only, not clinical diagnoses or medical advice.

You MUST respond with a single, valid, raw JSON object matching this schema:
{
  "schemaVersion": "1.1",
  "summary": "In-depth, comprehensive clinical synthesis (3-5 rich sentences). Use markdown bold (**term**) sparingly to emphasize key diagnoses, primary findings, or abnormal values (e.g. '**Invasive Carcinoma**', '**elevated ESR (35 mm/hr)**', '**HER2 negative**'). Summarize the overall health trajectory, organ systems evaluated, key positive or stable findings, and pinpoint areas requiring follow-up.",
  "keyHighlights": [
    "High-impact takeaway summarizing patient status",
    "Key trend or finding across the records"
  ],
  "highlightedMarkers": [
    {
      "marker": "Biomarker or Test Name (e.g. LDL Cholesterol, HbA1c, SGPT, Hemoglobin)",
      "value": "142 mg/dL",
      "status": "normal" | "borderline" | "flagged",
      "note": "Concise high-impact clinical note (e.g. 'Elevated 43% above reference range; trending upward across 2 visits')"
    }
  ],
  "documentDateRange": {
    "earliest": "YYYY-MM-DD (Exact earliest clinical report/collection date found in records)",
    "latest": "YYYY-MM-DD (Exact latest clinical report/collection date found in records)"
  },
  "metrics": [
    {
      "name": "Test or Biomarker Name (e.g. LDL Cholesterol, Fasting Blood Glucose, TSH, Systolic BP)",
      "value": 142,
      "unit": "mg/dL",
      "referenceRange": "0-99",
      "status": "normal" | "borderline" | "flagged",
      "history": [
        { "date": "YYYY-MM-DD", "value": 118 }
      ],
      "sourceDocumentIds": ["doc_id"]
    }
  ],
  "flags": [
    {
      "title": "Short descriptive issue (e.g. LDL trending upward above normal)",
      "severity": "low" | "moderate" | "high",
      "explanation": "Clear explanation of why this is flagged based on values and dates.",
      "relatedMetric": "LDL Cholesterol"
    }
  ],
  "anomalies": [
    {
      "title": "Short title of sharp observation or anomaly",
      "category": "discrepancy" | "sharp_trend" | "missing_followup" | "critical_outlier" | "scan_alert" | "general",
      "observation": "Detailed pinpoint clinical observation explaining the irregularity, rapid change, medication discrepancy, or unaddressed abnormal finding.",
      "pinpointNotes": [
        "Record 1 (Date): Specific observation or value cited",
        "Record 2 (Date): Correlated or conflicting finding cited"
      ],
      "severity": "low" | "moderate" | "high",
      "relatedDocuments": ["filename or doc_id"]
    }
  ],
  "discussionPoints": [
    {
      "topic": "Clinical area (e.g. Lipid Management, Glycemic Control, Oncology Review)",
      "question": "Exact, practical question to ask the physician at the next appointment.",
      "urgency": "priority" | "routine" | "follow_up",
      "relatedMarkers": ["LDL Cholesterol", "ApoB"],
      "rationale": "Why this question matters based on the analyzed records."
    }
  ],
  "recommendations": [
    "Direct discussion point or preparation step for the appointment."
  ],
  "extractedEntities": {
    "reportTypes": ["Lipid Panel", "CBC", "OPD Clinical Note"],
    "providers": ["LabCorp", "Quest Diagnostics", "Manipal Hospital"]
  },
  "sourceDocuments": [
    { "id": "doc_id", "filename": "report.pdf" }
  ],
  "confidence": "high" | "medium" | "low"
}

STRICT CLINICAL GUIDELINES:
1. ONLY return the JSON object. Do NOT wrap in markdown backticks. Do NOT include commentary.
2. In the Executive Health Summary, provide a genuine clinical synthesis with depth and weight. Do not provide a generic one-liner.
3. Identify 3-6 highlightedMarkers that represent the primary clinical drivers of this patient profile.
4. Carefully scrutinize cross-document relationships for anomalies (discrepancies between reports, sharp velocity shifts in biomarkers, missing follow-ups for flagged tests, or non-digital scanned notes).
5. In discussionPoints, frame 3-5 high-yield, specific questions with clinical rationale to empower the patient during physician consultations.
6. Prioritize the top 12-18 most clinically significant biomarkers in the metrics list. Group multi-date values in the history array chronologically.
7. NEVER use unescaped double quotes inside text values. Use single quotes for clinic names, test names, and notes (e.g. 'Lipid Panel' or 'Sunrise Oncology', not "Lipid Panel").
8. EXACT REPORT DATES: In documentDateRange (and in metric history dates), you MUST extract the exact clinical report date, specimen collection date, test date, or exam date written inside the document text or header (e.g. 'Collection Date: 12-Mar-2024' -> '2024-03-12'). If analyzing a single report or single date, set both earliest and latest to that exact date. NEVER default to current/today's date or placeholder strings.`;
  }

  /**
   * Execute analysis pipeline on the provided document IDs.
   */
  public async analyze(params: {
    scopeType: 'file' | 'selection' | 'folder';
    scopeId: string;
    documentIds: string[];
    providerProfileId: string;
    forceRefresh?: boolean;
  }): Promise<AnalysisRecord> {
    const { scopeType, scopeId, documentIds, providerProfileId, forceRefresh = false } = params;

    if (!documentIds || documentIds.length === 0) {
      throw new Error('No documents selected for analysis.');
    }

    const docs = getDocumentsByIds(documentIds);
    if (docs.length === 0) {
      throw new Error('None of the specified documents could be found.');
    }

    // Resolve provider profile
    let profile = getProviderById(providerProfileId);
    if (!profile) {
      const all = listProviders();
      profile = all.find((p) => p.is_default === 1) || all[0];
    }
    if (!profile) {
      throw new Error('No AI provider profile configured. Please add one in Settings.');
    }

    // 1. Cache Check
    const cacheKey = this.computeCacheKey(docs, CURRENT_PROMPT_VERSION, profile.id, profile.model);

    if (!forceRefresh) {
      const cached = getAnalysisByCacheKey(cacheKey);
      if (cached) {
        logger.info('ai', `Cache hit for analysis: ${cacheKey.slice(0, 10)}... (Instant retrieval)`);
        this.broadcastProgress({
          stage: 'complete',
          message: 'Retrieved overview from local cache.',
          progressPercent: 100,
        });
        return cached;
      }
    }

    logger.info('ai', `Starting analysis on ${docs.length} document(s) using ${profile.name} (${profile.model})`);

    // 2. Extract Document Content
    this.broadcastProgress({
      stage: 'extracting',
      message: `Extracting text from ${docs.length} document(s)...`,
      progressPercent: 15,
    });

    const docSections: string[] = [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      this.broadcastProgress({
        stage: 'extracting',
        message: `Reading document ${i + 1} of ${docs.length}: ${doc.filename}`,
        currentDocument: doc.filename,
        progressPercent: 15 + Math.round(((i + 1) / docs.length) * 20),
      });

      let text = await extractor.extractText(doc.id);
      // Cap individual document text to 20,000 characters (~4,500 tokens) to prevent context overflow on local hardware
      if (text.length > 20000) {
        text = text.slice(0, 20000) + '\n[...remaining content truncated to fit local context limits...]';
      }
      docSections.push(
        `=== DOCUMENT [ID: ${doc.id}] Filename: ${doc.filename} ===\n${text}\n=== END OF DOCUMENT [ID: ${doc.id}] ===`
      );
    }

    // 3. Prepare Prompt
    this.broadcastProgress({
      stage: 'preparing_prompt',
      message: 'Synthesizing document records for model context...',
      progressPercent: 40,
    });

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = `Please analyze the following ${docs.length} medical document(s) and generate the structured JSON health overview:\n\n${docSections.join('\n\n')}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 4. Model Inference
    this.broadcastProgress({
      stage: 'inferring',
      message: `Analyzing with ${profile.name} (${profile.model})... This may take a moment.`,
      progressPercent: 55,
    });

    let rawContent: string;
    try {
      const resp = await aiProvider.chatCompletion({
        profile,
        messages,
        temperature: 0.1,
        responseFormat: {
          type: 'json_schema',
          json_schema: {
            name: 'medbuddy_health_overview',
            strict: true,
            schema: HEALTH_OVERVIEW_JSON_SCHEMA,
          },
        },
        onHeartbeat: (elapsedSec, tokenCount) => {
          const tokenInfo = tokenCount && tokenCount > 0 ? ` • ${tokenCount} tokens generated` : '';
          this.broadcastProgress({
            stage: 'inferring',
            message: `Evaluating locally with ${profile.model}... (${elapsedSec}s elapsed${tokenInfo})`,
            progressPercent: Math.min(88, 55 + Math.round(elapsedSec / 8)),
          });
        },
      });
      rawContent = resp.content;
    } catch (err: any) {
      this.broadcastProgress({
        stage: 'error',
        message: err.message,
      });
      throw err;
    }

    // 5. Validation & 1-Step Corrective Retry
    this.broadcastProgress({
      stage: 'validating',
      message: 'Validating structured analysis schema...',
      progressPercent: 85,
    });

    let validatedResult: StructuredAnalysisResultOutput | null = null;
    let parseErrorDescription = '';

    // Attempt 1: Parse and validate initial output
    try {
      const cleaned = sanitizeJsonResponse(rawContent);
      const parsed = JSON.parse(cleaned);
      const valResult = StructuredAnalysisResultSchema.safeParse(parsed);

      if (valResult.success) {
        validatedResult = valResult.data;
      } else {
        parseErrorDescription = valResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      }
    } catch (err: any) {
      parseErrorDescription = `JSON syntax error: ${err.message}`;
    }

    // Attempt 2: Corrective Retry if initial attempt was invalid
    if (!validatedResult) {
      logger.warn('ai', `Initial JSON validation failed (${parseErrorDescription}). Triggering 1-step corrective retry.`);
      this.broadcastProgress({
        stage: 'retrying',
        message: 'Applying corrective retry to format structured overview...',
        progressPercent: 90,
      });

      const correctiveMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `You previously generated an analysis draft that failed validation due to: [${parseErrorDescription}].

Here is your previous output draft:
---
${rawContent.slice(0, 4000)}
---

Fix the syntax and schema errors and output ONLY the complete, corrected, valid JSON object matching the schema. No markdown backticks, no other text.`,
        },
      ];

      try {
        const retryResp = await aiProvider.chatCompletion({
          profile,
          messages: correctiveMessages,
          temperature: 0.0,
          responseFormat: {
            type: 'json_schema',
            json_schema: {
              name: 'medbuddy_health_overview',
              strict: true,
              schema: HEALTH_OVERVIEW_JSON_SCHEMA,
            },
          },
        });

        const retryCleaned = sanitizeJsonResponse(retryResp.content);
        const retryParsed = JSON.parse(retryCleaned);
        const retryValidation = StructuredAnalysisResultSchema.safeParse(retryParsed);

        if (retryValidation.success) {
          validatedResult = retryValidation.data;
          logger.info('ai', 'Corrective retry succeeded!');
        } else {
          throw new Error(`Schema validation failed on retry: ${retryValidation.error.errors.map((e) => e.message).join(', ')}`);
        }
      } catch (retryErr: any) {
        logger.error('ai', 'Corrective retry failed', { error: retryErr.message });
        this.broadcastProgress({
          stage: 'error',
          message: `Model failed to output structured JSON: ${retryErr.message}`,
        });
        throw new Error(
          `The local AI model was unable to generate valid structured data (${retryErr.message}). Check that the model is suitable for JSON instructions.`
        );
      }
    }

    // Ensure sourceDocuments field includes current docs
    if (validatedResult.sourceDocuments.length === 0) {
      validatedResult.sourceDocuments = docs.map((d) => ({ id: d.id, filename: d.filename }));
    }

    // 6. Save to Cache Database
    const record = storeAnalysisResult(
      cacheKey,
      scopeType,
      scopeId,
      profile.id,
      CURRENT_PROMPT_VERSION,
      validatedResult,
      docs.map((d) => d.id)
    );

    this.broadcastProgress({
      stage: 'complete',
      message: 'Health overview successfully generated!',
      progressPercent: 100,
    });

    logger.info('ai', `Analysis complete and cached. ID: ${record.id}`);
    return record;
  }
}

export const orchestrator = new AIOrchestrator();
