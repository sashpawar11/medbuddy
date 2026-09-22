import { z } from 'zod';

export const StructuredMetricSchema = z.object({
  name: z.string().min(1, 'Metric name cannot be empty'),
  value: z.union([z.number(), z.string()]),
  unit: z.string().default(''),
  referenceRange: z.string().optional(),
  status: z.enum(['normal', 'borderline', 'flagged']).default('normal'),
  history: z.array(
    z.object({
      date: z.string(),
      value: z.union([z.number(), z.string()]),
    })
  ).optional().default([]),
  sourceDocumentIds: z.array(z.string()).optional().default([]),
});

export const StructuredFlagSchema = z.object({
  title: z.string().min(1, 'Flag title cannot be empty'),
  severity: z.enum(['low', 'moderate', 'high']).default('moderate'),
  explanation: z.string().min(1, 'Explanation cannot be empty'),
  relatedMetric: z.string().optional(),
});

export const StructuredHighlightMarkerSchema = z.object({
  marker: z.string().min(1, 'Marker name is required'),
  status: z.enum(['normal', 'borderline', 'flagged']).default('normal'),
  note: z.string().min(1, 'Clinical note is required'),
  value: z.union([z.number(), z.string()]).optional(),
});

export const StructuredAnomalySchema = z.object({
  title: z.string().min(1, 'Anomaly title is required'),
  category: z.enum(['discrepancy', 'sharp_trend', 'missing_followup', 'critical_outlier', 'scan_alert', 'general']).default('general'),
  observation: z.string().min(1, 'Observation description is required'),
  pinpointNotes: z.array(z.string()).default([]),
  severity: z.enum(['low', 'moderate', 'high']).default('moderate'),
  relatedDocuments: z.array(z.string()).optional().default([]),
});

export const StructuredDiscussionPointSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  question: z.string().min(1, 'Question is required'),
  urgency: z.enum(['routine', 'priority', 'follow_up']).default('routine'),
  relatedMarkers: z.array(z.string()).optional().default([]),
  rationale: z.string().optional().default(''),
});

export const StructuredAnalysisResultSchema = z.object({
  schemaVersion: z.string().default('1.1'),
  summary: z.string().min(1, 'Summary is required'),
  keyHighlights: z.array(z.string()).optional().default([]),
  highlightedMarkers: z.array(StructuredHighlightMarkerSchema).optional().default([]),
  documentDateRange: z.object({
    earliest: z.string().optional(),
    latest: z.string().optional(),
  }).optional(),
  metrics: z.array(StructuredMetricSchema).default([]),
  flags: z.array(StructuredFlagSchema).default([]),
  anomalies: z.array(StructuredAnomalySchema).optional().default([]),
  recommendations: z.array(z.string()).default([]),
  discussionPoints: z.array(StructuredDiscussionPointSchema).optional().default([]),
  extractedEntities: z.object({
    reportTypes: z.array(z.string()).optional().default([]),
    providers: z.array(z.string()).optional().default([]),
  }).default({}),
  sourceDocuments: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
    })
  ).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
});

export type StructuredAnalysisResultOutput = z.infer<typeof StructuredAnalysisResultSchema>;

export const CURRENT_PROMPT_VERSION = '1.1.0';

/**
 * Standard JSON Schema matching StructuredAnalysisResultSchema for OpenAI/LM Studio json_schema structured output.
 */
export const HEALTH_OVERVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'string' },
    summary: { type: 'string' },
    keyHighlights: {
      type: 'array',
      items: { type: 'string' },
    },
    highlightedMarkers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          marker: { type: 'string' },
          status: { type: 'string', enum: ['normal', 'borderline', 'flagged'] },
          note: { type: 'string' },
          value: { type: ['number', 'string'] },
        },
        required: ['marker', 'status', 'note'],
      },
    },
    documentDateRange: {
      type: 'object',
      properties: {
        earliest: { type: 'string' },
        latest: { type: 'string' },
      },
    },
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: ['number', 'string'] },
          unit: { type: 'string' },
          referenceRange: { type: 'string' },
          status: {
            type: 'string',
            enum: ['normal', 'borderline', 'flagged'],
          },
          history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                value: { type: ['number', 'string'] },
              },
              required: ['date', 'value'],
            },
          },
          sourceDocumentIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name', 'value', 'status'],
      },
    },
    flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['low', 'moderate', 'high'],
          },
          explanation: { type: 'string' },
          relatedMetric: { type: 'string' },
        },
        required: ['title', 'severity', 'explanation'],
      },
    },
    anomalies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['discrepancy', 'sharp_trend', 'missing_followup', 'critical_outlier', 'scan_alert', 'general'],
          },
          observation: { type: 'string' },
          pinpointNotes: {
            type: 'array',
            items: { type: 'string' },
          },
          severity: {
            type: 'string',
            enum: ['low', 'moderate', 'high'],
          },
          relatedDocuments: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['title', 'category', 'observation', 'pinpointNotes', 'severity'],
      },
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
    },
    discussionPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          question: { type: 'string' },
          urgency: {
            type: 'string',
            enum: ['routine', 'priority', 'follow_up'],
          },
          relatedMarkers: {
            type: 'array',
            items: { type: 'string' },
          },
          rationale: { type: 'string' },
        },
        required: ['topic', 'question', 'urgency'],
      },
    },
    extractedEntities: {
      type: 'object',
      properties: {
        reportTypes: {
          type: 'array',
          items: { type: 'string' },
        },
        providers: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    sourceDocuments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
        },
        required: ['id', 'filename'],
      },
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
  },
  required: ['schemaVersion', 'summary', 'metrics', 'flags', 'recommendations'],
};

/**
 * Escapes unescaped double quotes inside JSON string property and array values.
 */
function escapeInnerQuotes(jsonStr: string): string {
  const lines = jsonStr.split('\n');
  const fixedLines = lines.map((line) => {
    // Matches "propertyName": "value..."
    const propMatch = line.match(/^(\s*"[^"]+"\s*:\s*")([\s\S]*?)("\s*,?\s*)$/);
    if (propMatch) {
      const prefix = propMatch[1];
      let val = propMatch[2];
      const suffix = propMatch[3];
      val = val.replace(/(?<!\\)"/g, '\\"');
      return prefix + val + suffix;
    }
    // Matches "arrayValue..." in array elements
    const arrMatch = line.match(/^(\s*")([\s\S]*?)("\s*,?\s*)$/);
    if (arrMatch) {
      const prefix = arrMatch[1];
      let val = arrMatch[2];
      const suffix = arrMatch[3];
      val = val.replace(/(?<!\\)"/g, '\\"');
      return prefix + val + suffix;
    }
    return line;
  });
  return fixedLines.join('\n');
}

/**
 * Auto-repairs truncated or syntax-flawed JSON strings from local LLMs.
 * Escapes inner unescaped quotes, closes unclosed quotes, trims dangling incomplete keys/values,
 * and closes open brackets/braces in order.
 */
export function repairJsonString(str: string): string {
  let s = str.trim();
  // Strip trailing markdown fences if present
  s = s.replace(/```\s*$/, '').trim();

  // 1. Escape unescaped inner quotes in property and array string values
  s = escapeInnerQuotes(s);

  // 2. Remove trailing commas before closing braces/brackets
  s = s.replace(/,(\s*[}\]])/g, '$1');

  // 2. Track bracket stack and string escape state
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && inString) {
      escaped = !escaped;
      continue;
    }
    if (ch === '"' && !escaped) {
      inString = !inString;
    }
    escaped = false;
  }

  // If ended inside an open string, close it
  if (inString) {
    s += '"';
  }

  // 3. Strip trailing dangling keys, colons, or commas
  s = s.replace(/,\s*"[^"]*"\s*:\s*"?$/, '');
  s = s.replace(/,\s*"[^"]*"\s*$/, '');
  s = s.replace(/:\s*"?$/, ': null');
  s = s.replace(/,\s*$/, '');

  // 4. Re-calculate bracket stack after trimming dangling keys
  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && inString) {
      escaped = !escaped;
      continue;
    }
    if (ch === '"' && !escaped) {
      inString = !inString;
    } else if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' && stack[stack.length - 1] === '{') {
        stack.pop();
      } else if (ch === ']' && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
    escaped = false;
  }

  // Close remaining open brackets in reverse order
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') s += '}';
    else if (last === '[') s += ']';
  }

  // Clean any newly created trailing commas before closed brackets
  s = s.replace(/,(\s*[}\]])/g, '$1');

  return s;
}

/**
 * Clean LLM response string by stripping thinking tags, preamble text, markdown code fences,
 * and automatically repairing truncated or malformed JSON syntax.
 */
export function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  // Strip <think>...</think> reasoning blocks (Qwen, DeepSeek, etc.)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Extract from markdown code fences if present anywhere in the response
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // If there is still leading text outside the JSON object, extract from first '{'
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    } else {
      // Truncated: take everything from the first brace
      cleaned = cleaned.substring(firstBrace).trim();
    }
  }

  // Test if it parses directly as valid JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Attempt auto-repair on truncated or syntax-flawed JSON
    try {
      const repaired = repairJsonString(cleaned);
      JSON.parse(repaired);
      return repaired;
    } catch {
      // If repair fails, return cleaned string for standard error reporting
      return cleaned;
    }
  }
}

