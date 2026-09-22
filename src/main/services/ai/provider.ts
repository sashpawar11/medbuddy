import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { ProviderProfile, ConnectionTestResult } from '../../../shared/types';
import { logger } from '../logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InternalHttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}

interface InternalHttpResponse {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/**
 * Perform an HTTP/HTTPS request using Node.js native networking.
 * Avoids any undici / fetch 300s headersTimeout and provides full streaming control.
 */
function makeNodeHttpRequest(options: InternalHttpRequestOptions): Promise<InternalHttpResponse> {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(options.url);
    } catch (e: any) {
      return reject(new Error(`Invalid URL '${options.url}': ${e.message}`));
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };

    if (options.body && !reqHeaders['Content-Length']) {
      reqHeaders['Content-Length'] = String(Buffer.byteLength(options.body, 'utf8'));
    }

    const requestOptions: http.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : isHttps ? 443 : 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: reqHeaders,
    };

    let settled = false;
    let timeoutTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    const req = client.request(requestOptions, (res) => {
      res.setEncoding('utf8');
      let responseBody = '';

      res.on('data', (chunk: string) => {
        responseBody += chunk;
        if (options.onChunk) {
          try {
            options.onChunk(chunk);
          } catch {
            // Ignore callback error
          }
        }
      });

      res.on('end', () => {
        cleanup();
        if (!settled) {
          settled = true;
          resolve({
            statusCode: res.statusCode || 200,
            statusMessage: res.statusMessage || '',
            headers: res.headers,
            body: responseBody,
          });
        }
      });

      res.on('error', (err) => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });

    req.setSocketKeepAlive(true, 10000);
    req.setNoDelay(true);

    if (options.timeoutMs && options.timeoutMs > 0) {
      req.setTimeout(options.timeoutMs, () => {
        cleanup();
        if (!settled) {
          settled = true;
          const seconds = Math.round(options.timeoutMs! / 1000);
          req.destroy(new Error(`ETIMEDOUT: Request timed out after ${seconds}s`));
        }
      });
    }

    req.on('error', (err) => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    if (options.signal) {
      if (options.signal.aborted) {
        cleanup();
        settled = true;
        req.destroy(new Error('Request was aborted'));
        return;
      }
      options.signal.addEventListener('abort', () => {
        cleanup();
        if (!settled) {
          settled = true;
          req.destroy(new Error('Request was aborted'));
        }
      });
    }

    if (options.body) {
      req.write(options.body, 'utf8');
    }
    req.end();
  });
}

export class AIProviderService {
  /**
   * Normalize endpoint URL ensuring proper protocol and path.
   */
  private normalizeBaseUrl(url: string): string {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    return clean;
  }

  /**
   * Test connection to the AI provider endpoint and list available models.
   */
  public async testConnection(profile: Partial<ProviderProfile>): Promise<ConnectionTestResult> {
    const rawUrl = profile.base_url || 'http://localhost:1234/v1';
    const baseUrl = this.normalizeBaseUrl(rawUrl);
    const startTime = Date.now();

    logger.info('ai', `Testing connection to provider: ${baseUrl} (${profile.provider_type})`);

    try {
      // Try OpenAI-compatible /models endpoint first
      let modelsUrl = `${baseUrl}/models`;
      if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
        modelsUrl = `${baseUrl}/v1/models`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (profile.api_key && profile.api_key.trim().length > 0) {
        headers['Authorization'] = `Bearer ${profile.api_key.trim()}`;
      }

      let res: InternalHttpResponse;
      try {
        res = await makeNodeHttpRequest({
          url: modelsUrl,
          method: 'GET',
          headers,
          timeoutMs: 8000,
        });
      } catch (err: any) {
        // If Ollama native port without /v1, try Ollama's native /api/tags
        if (profile.provider_type === 'ollama' || baseUrl.includes('11434')) {
          const ollamaUrl = `${baseUrl.replace(/\/v1$/, '')}/api/tags`;
          res = await makeNodeHttpRequest({
            url: ollamaUrl,
            method: 'GET',
            headers,
            timeoutMs: 8000,
          });
        } else {
          throw err;
        }
      }

      const latencyMs = Date.now() - startTime;

      if (res.statusCode < 200 || res.statusCode >= 300) {
        return {
          success: false,
          latencyMs,
          message: `HTTP ${res.statusCode}: ${res.statusMessage}. ${res.body.slice(0, 200)}`,
        };
      }

      const data = JSON.parse(res.body);
      const availableModels: string[] = [];

      // Extract model IDs from OpenAI format { data: [{ id: '...' }] } or Ollama { models: [{ name: '...' }] }
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.id) availableModels.push(item.id);
        }
      } else if (Array.isArray(data.models)) {
        for (const item of data.models) {
          if (item.name) availableModels.push(item.name);
          else if (item.model) availableModels.push(item.model);
        }
      }

      logger.info('ai', `Connection successful to ${baseUrl}`, {
        latencyMs,
        modelsCount: availableModels.length,
      });

      return {
        success: true,
        latencyMs,
        message: `Connected successfully in ${latencyMs}ms. Found ${availableModels.length} loaded model(s).`,
        availableModels,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let errorMsg = err.message || String(err);

      if (errorMsg.includes('ETIMEDOUT')) {
        errorMsg = `Connection timed out after 8s. Verify that ${baseUrl} is reachable and responding.`;
      } else if (errorMsg.includes('ECONNREFUSED')) {
        errorMsg = `Connection refused at ${baseUrl}. Ensure your local AI server (LM Studio or Ollama) is running.`;
      }

      logger.warn('ai', `Connection test failed for ${baseUrl}: ${errorMsg}`);

      return {
        success: false,
        latencyMs,
        message: errorMsg,
      };
    }
  }

  /**
   * Execute chat completion against OpenAI-compatible endpoint with SSE streaming support.
   */
  public async chatCompletion(params: {
    profile: ProviderProfile;
    messages: ChatMessage[];
    temperature?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    responseFormat?: any;
    onHeartbeat?: (elapsedSeconds: number, tokenCount?: number) => void;
  }): Promise<{ content: string; latencyMs: number }> {
    const { profile, messages, temperature = 0.1, timeoutMs, signal, responseFormat, onHeartbeat } = params;
    
    // Default 20 minutes (1200 seconds) for local models evaluating large document contexts
    const effectiveTimeoutMs =
      timeoutMs !== undefined
        ? timeoutMs
        : profile.timeout_seconds && profile.timeout_seconds > 0
        ? profile.timeout_seconds * 1000
        : 1200000;

    const rawUrl = profile.base_url || 'http://localhost:1234/v1';
    const baseUrl = this.normalizeBaseUrl(rawUrl);

    // Build chat completions URL
    let completionsUrl = `${baseUrl}/chat/completions`;
    if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) {
      completionsUrl = `${baseUrl}/v1/chat/completions`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
    };
    if (profile.api_key && profile.api_key.trim().length > 0) {
      headers['Authorization'] = `Bearer ${profile.api_key.trim()}`;
    }

    // Enable streaming to keep TCP socket active and provide real-time token feedback
    const bodyObj: Record<string, any> = {
      model: profile.model || 'local-model',
      messages,
      temperature,
      stream: true,
      max_tokens: 8192,
    };
    if (responseFormat) {
      bodyObj.response_format = responseFormat;
    }
    const bodyStr = JSON.stringify(bodyObj);

    logger.info('ai', `Calling chat completion: ${profile.name} (${profile.model})`, {
      endpoint: completionsUrl,
      messagesCount: messages.length,
      timeoutSeconds: effectiveTimeoutMs > 0 ? Math.round(effectiveTimeoutMs / 1000) : 'none',
      streaming: true,
      hasJsonSchema: Boolean(responseFormat),
    });

    const startTime = Date.now();
    let tokenCount = 0;
    let accumulatedContent = '';
    let accumulatedReasoning = '';
    let sseBuffer = '';

    const heartbeatInterval = setInterval(() => {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      onHeartbeat?.(elapsedSeconds, tokenCount);
    }, 1000);

    const handleChunk = (chunk: string) => {
      sseBuffer += chunk;
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // skip comments / ping
        if (trimmed === 'data: [DONE]' || trimmed === 'data:[DONE]') continue;

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (typeof delta.content === 'string' && delta.content.length > 0) {
                accumulatedContent += delta.content;
                tokenCount++;
              }
              if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
                accumulatedReasoning += delta.reasoning_content;
                tokenCount++;
              }
            }
          } catch {
            // Incomplete JSON or non-JSON data line
          }
        }
      }
    };

    try {
      const res = await makeNodeHttpRequest({
        url: completionsUrl,
        method: 'POST',
        headers,
        body: bodyStr,
        timeoutMs: effectiveTimeoutMs,
        signal,
        onChunk: handleChunk,
      });

      // Flush any remaining line in sseBuffer
      if (sseBuffer.trim().startsWith('data:')) {
        const trimmed = sseBuffer.trim();
        if (trimmed !== 'data: [DONE]' && trimmed !== 'data:[DONE]') {
          try {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              accumulatedContent += delta.content;
              tokenCount++;
            }
          } catch {}
        }
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errSnippet = res.body.slice(0, 300);
        try {
          const errObj = JSON.parse(res.body);
          if (errObj.error?.message) errSnippet = errObj.error.message;
        } catch {}

        // If json_schema is rejected by older or non-compliant provider endpoints, fallback to standard text mode
        if (responseFormat && (res.statusCode === 400 || res.statusCode === 422)) {
          logger.warn('ai', `Provider returned HTTP ${res.statusCode} with json_schema (${errSnippet}). Falling back to text mode with prompt-guided JSON...`);
          return this.chatCompletion({
            ...params,
            responseFormat: undefined,
          });
        }

        throw new Error(`AI Provider returned HTTP ${res.statusCode} (${res.statusMessage}): ${errSnippet}`);
      }

      // Check if server replied with non-SSE JSON (e.g. streaming not supported by model/server)
      if (!accumulatedContent && !accumulatedReasoning && res.body.trim().length > 0) {
        try {
          const json = JSON.parse(res.body);
          if (json.choices?.[0]?.message?.content) {
            accumulatedContent = json.choices[0].message.content;
          }
        } catch {}
      }

      // If content is empty but reasoning is present (some thinking models output only in reasoning)
      let finalContent = accumulatedContent;
      if (!finalContent.trim() && accumulatedReasoning.trim()) {
        finalContent = accumulatedReasoning;
      }

      const latencyMs = Date.now() - startTime;

      if (!finalContent || finalContent.trim().length === 0) {
        throw new Error('AI Provider returned an empty response. Verify model output in LM Studio / Ollama.');
      }

      logger.info('ai', `Completion finished in ${latencyMs}ms`, {
        tokensGenerated: tokenCount,
      });

      return { content: finalContent, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let msg = err.message || String(err);

      if (msg.includes('ETIMEDOUT') || err.code === 'ETIMEDOUT') {
        msg = `AI request timed out after ${(effectiveTimeoutMs / 1000).toFixed(0)}s. Increase timeout in AI Provider Setup for larger local models.`;
      } else if (msg.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
        msg = `Connection refused at ${completionsUrl}. Please ensure LM Studio or Ollama is running and has the model loaded.`;
      } else if (msg.includes('ECONNRESET') || err.code === 'ECONNRESET') {
        msg = `Connection was reset by AI server at ${baseUrl}. This often happens if the local model exceeded memory (OOM) or the server crashed.`;
      }

      logger.error('ai', `Chat completion failed: ${msg}`, { latencyMs });
      throw new Error(msg);
    } finally {
      clearInterval(heartbeatInterval);
    }
  }
}

export const aiProvider = new AIProviderService();
