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
    limit: number = 8
  ): Promise<CitedChunk[]> {
    if (!memberId) return [];

    // Ensure member's documents are indexed into chunks
    await documentChunker.ensureMemberDocumentsChunked(memberId);

    // Perform query with strict profile isolation enforced in SQL
    return searchChunksFts(memberId, query, limit);
  }

  /**
   * Build the clinical grounding system prompt for the scoped profile.
   */
  private buildSystemPrompt(member: FamilyMember, chunks: CitedChunk[]): string {
    const dobInfo = member.dob ? `, DOB: ${member.dob}` : '';
    const relationshipInfo = member.relationship ? `, Relationship: ${member.relationship}` : '';

    let chunksSection = '';
    if (chunks.length > 0) {
      chunksSection = chunks
        .map((c, idx) => {
          const dateStr = c.documentDate ? ` | Date: ${c.documentDate}` : '';
          return `--- Source Document [${idx + 1}]: "${c.filename}" (Page ${c.pageNumber}${dateStr}, DocID: ${c.documentId}) ---\n${c.snippet}`;
        })
        .join('\n\n');
    } else {
      chunksSection = `[No relevant medical documents or records found for ${member.name}.]`;
    }

    return `You are MedBuddy Assistant, a highly capable, compassionate personal medical records assistant.
You are reviewing personal medical records strictly for family member: "${member.name}"${relationshipInfo}${dobInfo}.

MANDATORY CLINICAL DIRECTIVES:
1. STRICT PROFILE SCOPE: You ONLY have access to medical documents for ${member.name}. Do NOT invent, assume, or speculate on records from other individuals.
2. GROUNDED CLINICAL CITATIONS: Every claim regarding lab results, vitals, diagnoses, clinical notes, medications, or doctor visits MUST cite the exact source document and date (e.g. "[Source: CBC_Report.pdf • 2024-06-02 • Page 1]").
3. CHRONOLOGY & TRENDS: Always mention the date of tests and note whether biomarker values or symptoms are improving, stable, or worsening over time. Include the numeric value, unit, and reference range when provided in the records.
4. UNKNOWN INFORMATION: If the requested information is not documented in the provided records, clearly and politely inform the user that it does not appear in ${member.name}'s uploaded records.
5. MEDICAL DISCLAIMER: Provide clear, objective summaries for personal organization and informational reference only. Always advise the patient or caregiver to review abnormal findings or clinical questions with their healthcare provider.

RETRIEVED CLINICAL RECORDS FOR ${member.name.toUpperCase()}:
${chunksSection}`;
  }

  /**
   * Send a chat message, search profile records, and stream LLM response.
   */
  public async sendMessage(params: {
    sessionId?: string;
    memberId: string;
    prompt: string;
    providerProfileId?: string;
  }): Promise<{ messageId: string; sessionId: string }> {
    const { memberId, prompt } = params;
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

    // 4. Retrieve Profile-Scoped Document Chunks (Strict Isolation)
    logger.info('ai', `Searching profile documents for ${member.name} (${member.id})`, {
      query: prompt.slice(0, 60),
    });
    const retrievedChunks = await this.searchProfileDocuments(member.id, prompt, 8);

    // 5. Persist User Message
    createChatMessage({
      sessionId,
      role: 'user',
      content: prompt,
      scopedMemberId: member.id,
    });

    // 6. Build Conversation Context & System Prompt
    const systemPrompt = this.buildSystemPrompt(member, retrievedChunks);

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
