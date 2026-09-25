import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import {
  getMemberById,
  getChatSessionById,
  createChatSession,
  createChatMessage,
  getChatMessages,
  listProviders,
  getProviderById,
  searchChunksFts,
  updateChatSessionTitle,
  listDocumentsForMember,
} from '../../db/database';
import { documentChunker } from './chunker';
import { aiProvider, ChatMessage } from './provider';
import { logger } from '../logger';
import type {
  CitedChunk,
  ChatMessageItem,
  ChatSessionItem,
  SendChatMessageParams,
  ChatStreamEvent,
  ProviderProfile,
  FamilyMember,
  DocumentItem,
} from '../../../shared/types';

export class ChatOrchestrator {
  private activeAbortControllers = new Map<string, AbortController>();

  /**
   * Broadcast stream events to all active renderer windows.
   */
  private broadcastStream(event: ChatStreamEvent): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('chat:stream', event);
        }
      }
    } catch (e: any) {
      logger.warn('ai', `Failed to broadcast chat stream event: ${e.message}`);
    }
  }

  /**
   * Search documents strictly scoped to a specific profile.
   */
  public async searchProfileDocuments(
    memberId: string,
    query: string,
    limit: number = 16,
    documentIds?: string[]
  ): Promise<CitedChunk[]> {
    if (!memberId) return [];

    // Ensure member's documents are indexed into chunks
    await documentChunker.ensureMemberDocumentsChunked(memberId);

    // Perform query with strict profile isolation enforced in SQL
    return searchChunksFts(memberId, query, limit, documentIds);
  }

  /**
   * Build the clinical grounding system prompt for the scoped profile.
   */
  private buildSystemPrompt(
    member: FamilyMember,
    chunks: CitedChunk[],
    allMemberDocs: DocumentItem[] = [],
    selectedDocIds?: string[]
  ): string {
    const dobInfo = member.dob ? `, DOB: ${member.dob}` : '';
    const relationshipInfo = member.relationship ? `, Relationship: ${member.relationship}` : '';

    const isSpecificScope = selectedDocIds && selectedDocIds.length > 0;
    const scopedDocs = isSpecificScope
      ? allMemberDocs.filter((d) => selectedDocIds.includes(d.id))
      : allMemberDocs;

    let archiveCatalog = '';
    if (scopedDocs.length > 0) {
      archiveCatalog = scopedDocs
        .map((d, idx) => {
          const dateStr = d.created_at ? ` (Uploaded: ${d.created_at.split('T')[0]})` : '';
          return `  ${idx + 1}. "${d.filename}"${dateStr}`;
        })
        .join('\n');
    } else {
      archiveCatalog = '  [No documents currently in active scope]';
    }

    let chunksSection = '';
    if (chunks.length > 0) {
      chunksSection = chunks
        .map((c, idx) => {
          const dateStr = c.documentDate ? ` | Date: ${c.documentDate}` : '';
          return `--- Source Document [${idx + 1}]: "${c.filename}" (Page ${c.pageNumber}${dateStr}, DocID: ${c.documentId}) ---\n${c.snippet}`;
        })
        .join('\n\n');
    } else {
      chunksSection = `[No specific document excerpts matched the query for ${member.name}.]`;
    }

    const scopeTitle = isSpecificScope
      ? `ACTIVE USER-SELECTED DOCUMENTS (${scopedDocs.length} of ${allMemberDocs.length} total files for ${member.name.toUpperCase()})`
      : `PATIENT PROFILE REPOSITORY (${allMemberDocs.length} total document(s) on file)`;

    const scopeDirective = isSpecificScope
      ? `1. STRICT SPECIFIC DOCUMENT SCOPE: The user has explicitly selected only the ${scopedDocs.length} document(s) listed above for this query. Strictly ground your answer in these chosen documents only. Do not invent or assume information from other unselected records.`
      : `1. STRICT PROFILE SCOPE & REPOSITORY AWARENESS: You have access to ${member.name}'s complete record archive containing all ${allMemberDocs.length} document(s) listed above. The retrieved excerpts provide detailed passages for the current query.`;

    return `You are MedBuddy Assistant, a highly capable, compassionate personal medical records assistant.
You are reviewing personal medical records strictly for family member: "${member.name}"${relationshipInfo}${dobInfo}.

${scopeTitle}:
${archiveCatalog}

RELEVANT CLINICAL EXCERPTS FOR CURRENT QUERY:
${chunksSection}

MANDATORY CLINICAL DIRECTIVES:
${scopeDirective}
2. ACCURATE REPOSITORY REPORTING: If asked about the patient's records, test history, or specific parameters, reference the documents available in the active scope. If a specific biomarker, test result, or detail is not present in the provided excerpts or documents, state clearly that it is not documented across ${member.name}'s reviewed records.
3. GROUNDED CLINICAL CITATIONS: Every claim regarding lab results, vitals, diagnoses, clinical notes, medications, or doctor visits MUST cite the exact source document and date (e.g. "[Source: CBC_Report.pdf • 2024-06-02 • Page 1]").
4. CHRONOLOGY & TRENDS: Always mention the date of tests and note whether biomarker values or symptoms are improving, stable, or worsening over time. Include the numeric value, unit, and reference range when provided in the records.
5. UNKNOWN INFORMATION: If the requested information is not documented in the provided records, clearly and politely inform the user that it does not appear in ${member.name}'s uploaded records.
6. MEDICAL DISCLAIMER: Provide clear, objective summaries for personal organization and informational reference only. Always advise the patient or caregiver to review abnormal findings or clinical questions with their healthcare provider.`;
  }

  /**
   * Send a chat message, search profile records, and stream LLM response.
   */
  public async sendMessage(params: {
    sessionId?: string;
    memberId: string;
    prompt: string;
    providerProfileId?: string;
    documentIds?: string[];
  }): Promise<{ messageId: string; sessionId: string }> {
    const { memberId, prompt, documentIds } = params;
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    // 1. Resolve Member Profile
    const member = getMemberById(memberId);
    if (!member) {
      throw new Error(`Profile member not found: ${memberId}`);
    }

    // 2. Resolve AI Provider Profile
    let provider: ProviderProfile | null = null;
    if (params.providerProfileId) {
      provider = getProviderById(params.providerProfileId);
    }
    if (!provider) {
      const providers = listProviders();
      provider = providers.find((p) => p.is_default === 1) || providers[0] || null;
    }

    if (!provider) {
      throw new Error('No AI provider configured. Please configure LM Studio or Ollama in Provider Settings.');
    }

    // 3. Resolve or Create Chat Session
    let session: ChatSessionItem | null = null;
    if (params.sessionId) {
      session = getChatSessionById(params.sessionId);
    }

    if (!session) {
      // Generate concise session title from the first query
      const cleanPrompt = prompt.replace(/\s+/g, ' ').trim();
      const generatedTitle = cleanPrompt.length > 40 ? cleanPrompt.slice(0, 37) + '...' : cleanPrompt;
      session = createChatSession({
        memberId: member.id,
        title: generatedTitle,
        providerProfileId: provider.id,
        modelName: provider.model,
      });
    }

    const sessionId = session.id;

    // 4. Retrieve Profile-Scoped Document Chunks (Strict Isolation & Diverse Coverage)
    logger.info('ai', `Searching profile documents for ${member.name} (${member.id})`, {
      query: prompt.slice(0, 60),
      documentIdsCount: documentIds?.length,
    });
    const retrievedChunks = await this.searchProfileDocuments(member.id, prompt, 16, documentIds);

    // 5. Persist User Message
    createChatMessage({
      sessionId,
      role: 'user',
      content: prompt,
      scopedMemberId: member.id,
    });

    // 6. Build Conversation Context & System Prompt with Full Profile Document Catalog
    const allMemberDocs = listDocumentsForMember(member.id);
    const systemPrompt = this.buildSystemPrompt(member, retrievedChunks, allMemberDocs, documentIds);

    // Retrieve prior turns in this session (bounded to last 8 turns)
    const priorMessages = getChatMessages(sessionId);
    // Take recent messages excluding the one just inserted
    const contextHistory = priorMessages.slice(-8, -1);

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of contextHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        llmMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user prompt
    llmMessages.push({
      role: 'user',
      content: prompt,
    });

    // 7. Setup Streaming Controller & Unique Assistant Message ID
    const assistantMessageId = 'cm_' + crypto.randomUUID().slice(0, 12);
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionId, abortController);

    // Notify UI that generation has started
    this.broadcastStream({
      sessionId,
      messageId: assistantMessageId,
      tokenDelta: '',
      citedChunks: retrievedChunks,
      done: false,
    });

    const startTime = Date.now();
    let accumulatedContent = '';
    let accumulatedReasoning = '';
    let tokenCount = 0;

    // Asynchronous background streaming execution
    (async () => {
      try {
        const rawUrl = provider.base_url || 'http://localhost:1234/v1';
        logger.info('ai', `Chat streaming initiated with model: ${provider.model} at ${rawUrl}`, {
          sessionId,
          member: member.name,
          chunksCount: retrievedChunks.length,
        });

        // Execute chat completion with streaming SSE
        const result = await aiProvider.chatCompletion({
          profile: provider,
          messages: llmMessages,
          temperature: 0.2,
          signal: abortController.signal,
          onHeartbeat: (_elapsed, count) => {
            if (count) tokenCount = count;
          },
          onTokenDelta: (delta) => {
            this.broadcastStream({
              sessionId,
              messageId: assistantMessageId,
              tokenDelta: delta,
              citedChunks: retrievedChunks,
              done: false,
            });
          },
          onReasoningDelta: (delta) => {
            accumulatedReasoning += delta;
            this.broadcastStream({
              sessionId,
              messageId: assistantMessageId,
              reasoningDelta: delta,
              citedChunks: retrievedChunks,
              done: false,
            });
          },
        });

        const latencyMs = Date.now() - startTime;
        accumulatedContent = result.content;
        if (result.reasoningContent) {
          accumulatedReasoning = result.reasoningContent;
        }

        // Persist completed Assistant Message to Database
        createChatMessage({
          id: assistantMessageId,
          sessionId,
          role: 'assistant',
          content: accumulatedContent,
          reasoningContent: accumulatedReasoning || undefined,
          scopedMemberId: member.id,
          citedChunks: retrievedChunks,
          latencyMs,
          tokenCount,
        });

        // Broadcast final complete event
        this.broadcastStream({
          sessionId,
          messageId: assistantMessageId,
          tokenDelta: accumulatedContent,
          citedChunks: retrievedChunks,
          done: true,
        });

        logger.info('ai', `Chat response completed for ${member.name}`, {
          sessionId,
          latencyMs,
          chars: accumulatedContent.length,
        });
      } catch (err: any) {
        const isAborted = abortController.signal.aborted || err.message?.includes('aborted');
        const latencyMs = Date.now() - startTime;

        if (isAborted) {
          logger.info('ai', `Chat generation aborted by user for session: ${sessionId}`);
          if (accumulatedContent.length > 0) {
            createChatMessage({
              id: assistantMessageId,
              sessionId,
              role: 'assistant',
              content: accumulatedContent + '\n\n*(Generation stopped by user)*',
              scopedMemberId: member.id,
              citedChunks: retrievedChunks,
              latencyMs,
            });
          }
          this.broadcastStream({
            sessionId,
            messageId: assistantMessageId,
            done: true,
            error: 'Generation stopped.',
          });
        } else {
          logger.error('ai', `Chat generation error: ${err.message}`, { sessionId });
          const errorMessage = `⚠️ MedBuddy was unable to complete the query: ${err.message}. Please check that your AI provider (${provider.name}) is running.`;
          createChatMessage({
            id: assistantMessageId,
            sessionId,
            role: 'assistant',
            content: errorMessage,
            scopedMemberId: member.id,
            citedChunks: [],
            latencyMs,
          });
          this.broadcastStream({
            sessionId,
            messageId: assistantMessageId,
            tokenDelta: errorMessage,
            done: true,
            error: err.message,
          });
        }
      } finally {
        this.activeAbortControllers.delete(sessionId);
      }
    })();

    return { messageId: assistantMessageId, sessionId };
  }

  /**
   * Abort an active streaming response for a session.
   */
  public abortStream(sessionId: string): void {
    const controller = this.activeAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(sessionId);
      logger.info('ai', `Aborted chat stream for session: ${sessionId}`);
    }
  }
}

export const chatOrchestrator = new ChatOrchestrator();
