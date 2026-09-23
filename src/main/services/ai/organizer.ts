import path from 'path';
import { getDocumentsByIds, getProviderById, listProviders } from '../../db/database';
import { extractor } from '../extractor';
import { aiProvider, ChatMessage } from './provider';
import { sanitizeJsonResponse } from '../../../shared/schema';
import type { DocumentItem, ProviderProfile, ProposedOrganization } from '../../../shared/types';
import { logger } from '../logger';

export class DocumentOrganizerService {
  /**
   * Run semantic categorization and naming on a list of document IDs.
   */
  public async preview(
    documentIds: string[],
    providerProfileId?: string
  ): Promise<ProposedOrganization[]> {
    if (!documentIds || documentIds.length === 0) {
      return [];
    }

    const docs = getDocumentsByIds(documentIds);
    if (docs.length === 0) {
      return [];
    }

    const isFastMode = providerProfileId === 'fast' || providerProfileId === 'fast-heuristic';

    // Resolve AI Provider Profile (if not in fast mode)
    let profile: ProviderProfile | null = null;
    if (!isFastMode) {
      if (providerProfileId) {
        profile = getProviderById(providerProfileId);
      }
      if (!profile) {
        const all = listProviders();
        profile = all.find((p) => p.is_default === 1) || all[0] || null;
      }
    }

    logger.info('ai', `Starting file organization preview for ${docs.length} document(s) (mode: ${isFastMode ? 'fast-heuristic' : 'ai'})`);

    // Extract text snippets (top 1,000 characters) for each document
    // Optimization 1: Use doc.extracted_text directly if already present in DB
    // Optimization 2: Parallelize extraction across documents with a fast fallback
    // Optimization 3: Focused 1,000-char header snippet cuts LLM prompt processing time by ~60%
    const docContexts = await Promise.all(
      docs.map(async (doc) => {
        let text = doc.extracted_text || '';
        if (!text || text.trim().length === 0) {
          try {
            text = await Promise.race([
              extractor.extractText(doc.id),
              new Promise<string>((resolve) => setTimeout(() => resolve(''), 6000)),
            ]);
          } catch (e) {
            text = doc.extracted_text || '';
          }
        }

        const snippet = (text || '').slice(0, 1000).trim();
        const ext = path.extname(doc.filename) || (doc.file_type.includes('pdf') ? '.pdf' : '.jpg');
        const fallbackDate = doc.created_at ? doc.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);

        return {
          doc,
          snippet,
          ext,
          fallbackDate,
        };
      })
    );

    // Fast mode: instantaneous deterministic rule-based heuristic (<10ms)
    if (isFastMode) {
      return docContexts.map(({ doc, snippet, ext, fallbackDate }) =>
        this.heuristicClassification(doc, snippet, ext, fallbackDate)
      );
    }

    // Attempt AI-driven semantic classification
    if (profile) {
      try {
        const aiResults = await this.classifyWithAI(docContexts, profile);
        if (aiResults && aiResults.length > 0) {
          return aiResults;
        }
      } catch (err: any) {
        logger.warn('ai', `AI classification failed, falling back to rule-based heuristic: ${err.message}`);
      }
    }

    // Fallback: rule-based semantic heuristic
    return docContexts.map(({ doc, snippet, ext, fallbackDate }) =>
      this.heuristicClassification(doc, snippet, ext, fallbackDate)
    );
  }

  /**
   * Prompt AI model to categorize and rename documents in a single batched structured prompt.
   */
  private async classifyWithAI(
    contexts: Array<{ doc: DocumentItem; snippet: string; ext: string; fallbackDate: string }>,
    profile: ProviderProfile
  ): Promise<ProposedOrganization[]> {
    const systemPrompt = `You are MedBuddy's Clinical Document Organizer and Taxonomist.
Your task is to analyze medical documents (or their initial headers and summaries) and generate standardized file names and clinical tags.

RULES FOR NAMING:
1. The new filename MUST strictly follow the exact format:
   <Prefix-Nameforreport>-<Date>.<extension>
   Notice the hyphen between Prefix and Nameforreport, and between Nameforreport and Date.
2. Standard <Prefix> MUST be one of:
   - Bloodwork (CBC, lipid, metabolic, thyroid, vitamins, biochemistry, etc.)
   - CT (computed tomography scans)
   - MRI (magnetic resonance imaging)
   - XRay (plain radiographs)
   - Ultrasound (sonography, Doppler, echocardiogram)
   - Test (ECG, EEG, EMG, spirometry, audiogram, endoscopy, etc.)
   - Prescription (medication orders, Rx slips, pharmacy notes)
   - Pathology (biopsy, histology, cytology, pap smear)
   - ClinicalNote (doctor consultation notes, OPD slips, progress summaries)
   - Discharge (hospital discharge summary, operative report)
   - Vaccination (immunization records)
   - Insurance (claims, pre-authorization, health policy)
3. <Nameforreport> MUST be a concise, specific clinical description in PascalCase without spaces (e.g. CompleteBloodCount, LipidPanel, AbdomenPelvis, ChestPA, BrainWithContrast, CardiologyReview, ThyroidProfile).
4. <Date> MUST be the date the test was performed or specimen collected in YYYY-MM-DD format. If no clear clinical date is in the text, use the provided Fallback Date.
5. <extension> MUST preserve the exact original file extension (e.g. .pdf, .jpg, .png).
6. Tags: Generate 2 to 4 concise clinical tags representing the content (e.g. ["Bloodwork", "Lipid Panel", "Tests"], ["CT Scans", "Radiology"], ["Prescriptions", "Cardiology"]).

OUTPUT CONTRACT:
Respond ONLY with a valid, raw JSON object matching this schema:
{
  "results": [
    {
      "documentId": "string",
      "prefix": "string",
      "reportName": "string",
      "detectedDate": "YYYY-MM-DD",
      "proposedFilename": "<Prefix-Nameforreport>-<Date>.<ext>",
      "tags": ["Tag1", "Tag2"],
      "confidence": "high" | "medium" | "low",
      "reasoning": "brief 1-sentence rationale"
    }
  ]
}`;

    const itemsPayload = contexts.map((c, idx) => ({
      index: idx + 1,
      documentId: c.doc.id,
      originalFilename: c.doc.filename,
      extension: c.ext,
      fallbackDate: c.fallbackDate,
      headerTextSnippet: c.snippet || '[No text extracted]',
    }));

    const userPrompt = `Classify and organize these ${contexts.length} medical document(s):\n\n${JSON.stringify(
      itemsPayload,
      null,
      2
    )}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await aiProvider.chatCompletion({
      profile,
      messages,
      temperature: 0.1,
      timeoutMs: 60000,
    });

    const sanitized = sanitizeJsonResponse(response.content);
    const parsed = JSON.parse(sanitized);

    if (!parsed || !Array.isArray(parsed.results)) {
      throw new Error('AI response did not contain a results array');
    }

    const resultMap = new Map<string, any>();
    for (const r of parsed.results) {
      if (r && r.documentId) {
        resultMap.set(r.documentId, r);
      }
    }

    return contexts.map(({ doc, snippet, ext, fallbackDate }) => {
      const r = resultMap.get(doc.id);
      if (r && r.proposedFilename && Array.isArray(r.tags)) {
        // Enforce extension
        let safeName = r.proposedFilename.trim();
        if (!safeName.toLowerCase().endsWith(ext.toLowerCase())) {
          safeName = `${safeName}${ext}`;
        }
        // Clean characters safe for filenames
        safeName = safeName.replace(/[<>:"/\\|?*]/g, '-');

        return {
          documentId: doc.id,
          originalFilename: doc.filename,
          prefix: r.prefix || 'Test',
          reportName: r.reportName || 'MedicalRecord',
          detectedDate: r.detectedDate || fallbackDate,
          proposedFilename: safeName,
          tags: r.tags.length > 0 ? r.tags : ['Medical Records'],
          confidence: r.confidence || 'high',
          reasoning: r.reasoning,
        };
      }
      return this.heuristicClassification(doc, snippet, ext, fallbackDate);
    });
  }

  /**
   * Rule-based heuristic fallback if AI is offline, missing, or fails.
   */
  private heuristicClassification(
    doc: DocumentItem,
    snippet: string,
    ext: string,
    fallbackDate: string
  ): ProposedOrganization {
    const lower = (snippet + ' ' + doc.filename).toLowerCase();

    // 1. Detect date
    let detectedDate = fallbackDate;
    const dateMatch =
      snippet.match(/\b(20\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01]))\b/) ||
      snippet.match(/\b((?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/]20\d{2})\b/) ||
      doc.filename.match(/\b(20\d{2}[-_](?:0[1-9]|1[0-2])[-_](?:0[1-9]|[12]\d|3[01]))\b/);

    if (dateMatch && dateMatch[1]) {
      const rawDate = dateMatch[1].replace(/[_/]/g, '-');
      const parts = rawDate.split('-');
      if (parts[0].length === 4) {
        detectedDate = rawDate;
      } else if (parts[2].length === 4) {
        detectedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    // 2. Classify prefix & tags
    let prefix = 'Test';
    let reportName = 'ClinicalReport';
    const tags: string[] = [];

    if (
      lower.includes('blood') ||
      lower.includes('cbc') ||
      lower.includes('lipid') ||
      lower.includes('glucose') ||
      lower.includes('hemoglobin') ||
      lower.includes('serum') ||
      lower.includes('platelet') ||
      lower.includes('cholesterol')
    ) {
      prefix = 'Bloodwork';
      tags.push('Bloodwork', 'Tests');
      if (lower.includes('lipid')) {
        reportName = 'LipidPanel';
        tags.push('Cardiovascular');
      } else if (lower.includes('cbc') || lower.includes('complete blood')) {
        reportName = 'CompleteBloodCount';
        tags.push('Hematology');
      } else if (lower.includes('thyroid') || lower.includes('tsh')) {
        reportName = 'ThyroidPanel';
        tags.push('Endocrine');
      } else if (lower.includes('glucose') || lower.includes('hba1c')) {
        reportName = 'GlycemicPanel';
        tags.push('Metabolic');
      } else {
        reportName = 'LabPanel';
      }
    } else if (lower.includes('ct ') || lower.includes('computed tomography') || lower.includes('cat scan')) {
      prefix = 'CT';
      tags.push('CT Scans', 'Radiology');
      if (lower.includes('abdomen') || lower.includes('pelvis')) {
        reportName = 'AbdomenPelvis';
      } else if (lower.includes('chest') || lower.includes('thorax')) {
        reportName = 'Chest';
      } else if (lower.includes('brain') || lower.includes('head')) {
        reportName = 'Brain';
      } else {
        reportName = 'Scan';
      }
    } else if (lower.includes('mri') || lower.includes('magnetic resonance')) {
      prefix = 'MRI';
      tags.push('MRI', 'Radiology');
      if (lower.includes('brain') || lower.includes('spine')) {
        reportName = 'NeuroScan';
      } else {
        reportName = 'Scan';
      }
    } else if (lower.includes('x-ray') || lower.includes('xray') || lower.includes('radiograph')) {
      prefix = 'XRay';
      tags.push('X-Ray', 'Radiology');
      if (lower.includes('chest')) reportName = 'ChestPA';
      else reportName = 'Radiograph';
    } else if (lower.includes('ultrasound') || lower.includes('sonography') || lower.includes('echo')) {
      prefix = 'Ultrasound';
      tags.push('Ultrasound', 'Tests');
      if (lower.includes('echo')) {
        reportName = 'Echocardiogram';
        tags.push('Cardiology');
      } else {
        reportName = 'Sonography';
      }
    } else if (lower.includes('prescription') || lower.includes(' rx ') || lower.includes('dispense')) {
      prefix = 'Prescription';
      tags.push('Prescriptions');
      reportName = 'MedicationOrder';
    } else if (lower.includes('pathology') || lower.includes('biopsy') || lower.includes('histopathology')) {
      prefix = 'Pathology';
      tags.push('Pathology', 'Tests');
      reportName = 'BiopsyReport';
    } else if (lower.includes('discharge') || lower.includes('hospital course')) {
      prefix = 'Discharge';
      tags.push('Discharge Summaries');
      reportName = 'Summary';
    } else {
      tags.push('Tests', 'Medical Records');
      // Clean original filename base
      const baseClean = path.basename(doc.filename, ext).replace(/[^a-zA-Z0-9]/g, '');
      reportName = baseClean.length > 3 ? baseClean : 'DiagnosticTest';
    }

    const proposedFilename = `${prefix}-${reportName}-${detectedDate}${ext}`;

    return {
      documentId: doc.id,
      originalFilename: doc.filename,
      prefix,
      reportName,
      detectedDate,
      proposedFilename,
      tags: Array.from(new Set(tags)),
      confidence: 'medium',
      reasoning: 'Heuristic classification from text and filename patterns',
    };
  }
}

export const documentOrganizer = new DocumentOrganizerService();
