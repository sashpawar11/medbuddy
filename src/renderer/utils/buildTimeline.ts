import type {
  AnalysisRecord,
  TimelineEvent,
  TimelineData,
  StructuredMetric,
  StructuredAnomaly,
  StructuredFlag,
} from '../../shared/types';

// ──────────────────────────────────────────────────────────────
// Timeline Data Assembler
// Pure client-side function — no new IPC or DB calls needed.
// Transforms existing AnalysisRecord[] into TimelineData.
// ──────────────────────────────────────────────────────────────

let eventCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++eventCounter}`;
}

const MONTH_NAMES: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

/**
 * Normalizes raw date strings into standard ISO format.
 * Rejects template placeholders like "YYYY-MM-DD" or empty strings.
 */
export function parseDate(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (
    !clean ||
    clean.toLowerCase().includes('yyyy') ||
    clean.toLowerCase() === 'undefined' ||
    clean.toLowerCase() === 'null'
  ) {
    return null;
  }

  // 1. Check ISO format YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year >= 1970 && year <= 2040) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000Z`;
    }
  }

  // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (year >= 1970 && year <= 2040) {
      let actualDay = day;
      let actualMonth = month;
      if (month > 12 && day <= 12) {
        actualDay = month;
        actualMonth = day;
      }
      if (actualMonth >= 1 && actualMonth <= 12 && actualDay >= 1 && actualDay <= 31) {
        return `${year}-${String(actualMonth).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}T00:00:00.000Z`;
      }
    }
  }

  // 3. DD-Mon-YYYY (e.g. 15-Sep-2026, 12 Mar 2024, 15/September/2026)
  const dMonYMatch = clean.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(\d{4})/);
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const monStr = dMonYMatch[2].toLowerCase();
    const year = parseInt(dMonYMatch[3], 10);
    const month = MONTH_NAMES[monStr] || MONTH_NAMES[monStr.slice(0, 3)];
    if (month && year >= 1970 && year <= 2040 && day >= 1 && day <= 31) {
      return `${year}-${month}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
    }
  }

  // 4. Mon DD, YYYY (e.g. Sep 15, 2026 or September 15, 2026)
  const monDYMatch = clean.match(/^([a-zA-Z]{3,9})[-/\s]+(\d{1,2}),?[-/\s]+(\d{4})/);
  if (monDYMatch) {
    const monStr = monDYMatch[1].toLowerCase();
    const day = parseInt(monDYMatch[2], 10);
    const year = parseInt(monDYMatch[3], 10);
    const month = MONTH_NAMES[monStr] || MONTH_NAMES[monStr.slice(0, 3)];
    if (month && year >= 1970 && year <= 2040 && day >= 1 && day <= 31) {
      return `${year}-${month}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
    }
  }

  // 5. Native Date fallback
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yr = d.getFullYear();
    if (yr >= 1970 && yr <= 2040) {
      return d.toISOString();
    }
  }

  return null;
}

/**
 * Scans medical OCR report text for explicit report/collection dates.
 */
export function extractDateFromReportText(text: string): string | null {
  if (!text) return null;

  // Search first 3000 characters where medical report headers, collection dates, and registration dates reside
  const headerSnippet = text.slice(0, 3000);

  // 1. Explicit medical collection / report date prefixes
  const prefixRegex = /(?:date\s+of\s+collection|collection\s+date|specimen\s+collected|sample\s+collected|report\s+date|date\s+of\s+report|reported\s+on|test\s+date|date\s+of\s+exam|study\s+date|encounter\s+date|date\s+of\s+service|registration\s+date|order\s+date|dated|date)\s*[:\-–]?\s*([0-9a-zA-Z\s,./-]+)/i;
  const match = headerSnippet.match(prefixRegex);
  if (match && match[1]) {
    const candidate = match[1].trim().split(/\n|\r|\t|;|\|/)[0].trim();
    const parsed = parseDate(candidate);
    if (parsed) return parsed;
  }

  // 2. Scan for standalone dates in DD-Mon-YYYY format (e.g. 15-Sep-2026, 12 Mar 2024)
  const textDateMatch = headerSnippet.match(/\b(\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+\d{4})\b/i);
  if (textDateMatch && textDateMatch[1]) {
    const parsed = parseDate(textDateMatch[1]);
    if (parsed) return parsed;
  }

  // 3. Scan for standalone YYYY-MM-DD or DD/MM/YYYY
  const numDateMatch = headerSnippet.match(/\b(20\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01]))\b/)
    || headerSnippet.match(/\b((?:0[1-9]|[12]\d|3[01])[-/.](?:0[1-9]|1[0-2])[-/.](?:19|20)\d{2})\b/);
  if (numDateMatch && numDateMatch[1]) {
    const parsed = parseDate(numDateMatch[1]);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Scans filename for dates like 2024-03-12, 2024_03_12, 12-03-2024, etc.
 */
export function extractDateFromFilename(filename: string): string | null {
  if (!filename) return null;

  // YYYY-MM-DD or YYYY_MM_DD
  const ymdMatch = filename.match(/\b(20\d{2}[-_](?:0[1-9]|1[0-2])[-_](?:0[1-9]|[12]\d|3[01]))\b/);
  if (ymdMatch && ymdMatch[1]) {
    const parsed = parseDate(ymdMatch[1].replace(/_/g, '-'));
    if (parsed) return parsed;
  }

  // DD-MM-YYYY or DD_MM_YYYY
  const dmyMatch = filename.match(/\b((?:0[1-9]|[12]\d|3[01])[-_](?:0[1-9]|1[0-2])[-_]20\d{2})\b/);
  if (dmyMatch && dmyMatch[1]) {
    const parsed = parseDate(dmyMatch[1].replace(/_/g, '-'));
    if (parsed) return parsed;
  }

  // DD-Mon-YYYY (e.g. 15Sep2026 or 15-Sep-2026)
  const dMonMatch = filename.match(/\b(\d{1,2}[-_]?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-_]?\d{4})\b/i);
  if (dMonMatch && dMonMatch[1]) {
    const parsed = parseDate(dMonMatch[1].replace(/_/g, '-'));
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Multi-tier clinical date resolution strategy:
 * 1. Checks result.documentDateRange.latest or earliest
 * 2. Checks metrics[].history[].date
 * 3. Scans source_documents[].extracted_text for collection/report dates
 * 4. Scans source_documents[].filename for date patterns
 * 5. Falls back to document created_at or analysis created_at
 */
export function findExactReportDate(analysis: AnalysisRecord): string {
  const result = analysis.result_json;

  // Tier 1: AI-extracted document date range
  const rangeLatest = parseDate(result?.documentDateRange?.latest);
  if (rangeLatest) return rangeLatest;
  const rangeEarliest = parseDate(result?.documentDateRange?.earliest);
  if (rangeEarliest) return rangeEarliest;

  // Tier 2: Dates from extracted lab biomarkers
  const metricDates: string[] = [];
  if (result?.metrics && Array.isArray(result.metrics)) {
    for (const m of result.metrics) {
      if (m.history && Array.isArray(m.history)) {
        for (const h of m.history) {
          const parsed = parseDate(h.date);
          if (parsed) metricDates.push(parsed);
        }
      }
    }
  }
  if (metricDates.length > 0) {
    metricDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return metricDates[0];
  }

  // Tier 3: OCR text from source clinical records
  if (analysis.source_documents && analysis.source_documents.length > 0) {
    for (const doc of analysis.source_documents) {
      if (doc.extracted_text) {
        const fromText = extractDateFromReportText(doc.extracted_text);
        if (fromText) return fromText;
      }
    }

    // Tier 4: Filename date patterns
    for (const doc of analysis.source_documents) {
      if (doc.filename) {
        const fromFile = extractDateFromFilename(doc.filename);
        if (fromFile) return fromFile;
      }
    }

    // Tier 5: Document creation date
    if (analysis.source_documents[0]?.created_at) {
      const docDate = parseDate(analysis.source_documents[0].created_at);
      if (docDate) return docDate;
    }
  }

  return parseDate(analysis.created_at) || new Date().toISOString();
}

/**
 * Determine severity badge from metric status.
 */
function metricSeverity(status: string): 'normal' | 'borderline' | 'flagged' {
  if (status === 'flagged') return 'flagged';
  if (status === 'borderline') return 'borderline';
  return 'normal';
}

/**
 * Compute trend direction between two numeric values.
 */
function trendDirection(current: number | string, previous: number | string): 'up' | 'down' | 'stable' {
  const cur = typeof current === 'number' ? current : parseFloat(String(current));
  const prev = typeof previous === 'number' ? previous : parseFloat(String(previous));
  if (isNaN(cur) || isNaN(prev)) return 'stable';
  const diff = cur - prev;
  const threshold = Math.abs(prev) * 0.02; // 2% change threshold
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

/**
 * Extract biomarker events from a single metric.
 * If the metric has history[], each history entry becomes a timeline event.
 * Otherwise, a single event is created using the analysis date.
 */
function extractMetricEvents(
  metric: StructuredMetric,
  analysisId: string,
  analysisDate: string,
  groupId: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const history = metric.history || [];

  if (history.length > 0) {
    // Create an event for each dated measurement
    const sortedHistory = [...history].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (!da || !db) return 0;
      return new Date(da).getTime() - new Date(db).getTime();
    });

    sortedHistory.forEach((point, idx) => {
      const date = parseDate(point.date) || analysisDate;
      const prevPoint = idx > 0 ? sortedHistory[idx - 1] : null;

      events.push({
        id: nextId('bio'),
        date,
        type: 'biomarker',
        title: `${metric.name}: ${point.value} ${metric.unit || ''}`.trim(),
        severity: metricSeverity(metric.status),
        metric: {
          name: metric.name,
          value: point.value,
          unit: metric.unit,
          referenceRange: metric.referenceRange,
          status: metric.status,
          trendDirection: prevPoint
            ? trendDirection(point.value, prevPoint.value)
            : undefined,
          previousValue: prevPoint?.value,
          previousDate: prevPoint ? (parseDate(prevPoint.date) || undefined) : undefined,
          history: metric.history,
        },
        sourceAnalysisId: analysisId,
        groupId,
      });
    });
  } else {
    // Single-point metric
    events.push({
      id: nextId('bio'),
      date: analysisDate,
      type: 'biomarker',
      title: `${metric.name}: ${metric.value} ${metric.unit || ''}`.trim(),
      severity: metricSeverity(metric.status),
      metric: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        referenceRange: metric.referenceRange,
        status: metric.status,
      },
      sourceAnalysisId: analysisId,
      groupId,
    });
  }

  return events;
}

/**
 * Extract flag events from analysis flags.
 */
function extractFlagEvents(
  flags: StructuredFlag[],
  analysisId: string,
  analysisDate: string,
  groupId: string,
): TimelineEvent[] {
  return flags.map((flag) => ({
    id: nextId('flag'),
    date: analysisDate,
    type: 'flag' as const,
    title: flag.title,
    severity: flag.severity === 'high' ? 'flagged' as const : 'borderline' as const,
    finding: {
      explanation: flag.explanation,
      severity: flag.severity,
    },
    sourceAnalysisId: analysisId,
    groupId,
  }));
}

/**
 * Extract anomaly events.
 */
function extractAnomalyEvents(
  anomalies: StructuredAnomaly[],
  analysisId: string,
  analysisDate: string,
): TimelineEvent[] {
  return anomalies.map((anom) => ({
    id: nextId('anom'),
    date: analysisDate,
    type: 'anomaly' as const,
    title: anom.title,
    severity: anom.severity === 'high' ? 'flagged' as const : 'borderline' as const,
    finding: {
      explanation: anom.observation,
      category: anom.category,
      pinpointNotes: anom.pinpointNotes,
      severity: anom.severity,
    },
    sourceAnalysisId: analysisId,
  }));
}

/**
 * Build a complete TimelineData object from an array of AnalysisRecords.
 *
 * @param analyses  All available analysis records
 * @param memberId  Optional — filter to a specific family member
 * @param memberName  Display name for the member
 */
export function buildTimeline(
  analyses: AnalysisRecord[],
  memberId?: string | null,
  memberName?: string,
): TimelineData {
  // Reset counter per build
  eventCounter = 0;

  // Filter to member if specified
  const filtered = memberId
    ? analyses.filter((a) => a.member_id === memberId)
    : analyses;

  const allEvents: TimelineEvent[] = [];
  const reportEvents: TimelineEvent[] = [];

  for (const analysis of filtered) {
    const result = analysis.result_json;
    const groupId = `report-${analysis.id}`;

    // Determine the exact clinical report date matching the document
    const analysisDate = findExactReportDate(analysis);

    // Build the report-type label
    const reportTypes = result.extractedEntities?.reportTypes || [];
    const reportTitle = reportTypes.length > 0
      ? reportTypes.join(', ')
      : (analysis.scope_name || 'Medical Analysis');

    const providers = result.extractedEntities?.providers || [];
    const subtitle = providers.length > 0 ? providers.join(' · ') : undefined;

    // Create child events for this report
    const childBiomarkers: TimelineEvent[] = [];
    const childFlags: TimelineEvent[] = [];

    // Extract biomarker events
    for (const metric of result.metrics || []) {
      const metricEvents = extractMetricEvents(metric, analysis.id, analysisDate, groupId);
      // For grouped display, we only take the latest reading as a child
      // Full history events go into the flat list
      if (metricEvents.length > 0) {
        childBiomarkers.push(metricEvents[metricEvents.length - 1]);
      }
      allEvents.push(...metricEvents);
    }

    // Extract flag events
    const flagEvents = extractFlagEvents(result.flags || [], analysis.id, analysisDate, groupId);
    childFlags.push(...flagEvents);
    allEvents.push(...flagEvents);

    // Extract anomaly events (these are standalone, not grouped under a report)
    const anomalyEvents = extractAnomalyEvents(result.anomalies || [], analysis.id, analysisDate);
    allEvents.push(...anomalyEvents);

    // Source document info
    const sourceDoc = analysis.source_documents?.[0];

    // Create the report-level container event
    const reportEvent: TimelineEvent = {
      id: nextId('rpt'),
      date: analysisDate,
      type: 'report',
      title: reportTitle,
      subtitle,
      severity: childFlags.some((f) => f.severity === 'flagged')
        ? 'flagged'
        : childBiomarkers.some((b) => b.severity === 'borderline') || childFlags.some((f) => f.severity === 'borderline')
        ? 'borderline'
        : 'normal',
      sourceDocumentId: sourceDoc?.id,
      sourceDocumentFilename: sourceDoc?.filename,
      sourceAnalysisId: analysis.id,
      groupId,
      childEvents: [...childBiomarkers, ...childFlags],
    };

    reportEvents.push(reportEvent);
  }

  // Deduplicate biomarker events (same name + date + value = duplicate)
  const seen = new Set<string>();
  const dedupedEvents = allEvents.filter((e) => {
    if (e.type !== 'biomarker' || !e.metric) return true;
    const key = `${e.metric.name}|${e.date}|${e.metric.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Merge report-level events + standalone events, sort newest-first
  const combinedEvents = [...reportEvents, ...dedupedEvents.filter((e) => e.type === 'anomaly')];
  combinedEvents.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da; // newest first
  });

  // Compute date range
  const allDates = combinedEvents.map((e) => new Date(e.date).getTime()).filter((t) => !isNaN(t));
  const earliest = allDates.length > 0 ? new Date(Math.min(...allDates)).toISOString() : '';
  const latest = allDates.length > 0 ? new Date(Math.max(...allDates)).toISOString() : '';

  // Compute stats
  const flaggedCount = dedupedEvents.filter((e) => e.severity === 'flagged').length;
  const anomalyCount = dedupedEvents.filter((e) => e.type === 'anomaly').length;
  const biomarkerNames = new Set(
    dedupedEvents.filter((e) => e.type === 'biomarker' && e.metric).map((e) => e.metric!.name)
  );

  return {
    memberId: memberId || 'all',
    memberName: memberName || 'All Members',
    events: combinedEvents,
    dateRange: { earliest, latest },
    stats: {
      totalEvents: combinedEvents.length,
      totalReports: reportEvents.length,
      flaggedCount,
      anomalyCount,
      trackedBiomarkers: biomarkerNames.size,
    },
  };
}

/**
 * Group timeline events by year for section-based rendering.
 */
export function groupEventsByYear(events: TimelineEvent[]): Map<number, TimelineEvent[]> {
  const groups = new Map<number, TimelineEvent[]>();
  for (const event of events) {
    const year = new Date(event.date).getFullYear();
    if (isNaN(year)) continue;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(event);
  }
  return groups;
}

/**
 * Filter events by date range.
 */
export function filterEventsByDateRange(
  events: TimelineEvent[],
  startDate: Date,
  endDate: Date,
): TimelineEvent[] {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return events.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= start && t <= end;
  });
}

/**
 * Filter events by type.
 */
export function filterEventsByType(
  events: TimelineEvent[],
  types: Set<string>,
): TimelineEvent[] {
  if (types.size === 0) return events;
  return events.filter((e) => {
    if (types.has(e.type)) return true;
    // Also include report events if any of their children match
    if (e.type === 'report' && e.childEvents) {
      return e.childEvents.some((c) => types.has(c.type));
    }
    return false;
  });
}

/**
 * Filter events by severity.
 */
export function filterEventsBySeverity(
  events: TimelineEvent[],
  severities: Set<string>,
): TimelineEvent[] {
  if (severities.size === 0) return events;
  return events.filter((e) => {
    if (severities.has(e.severity)) return true;
    // Include report events if any child matches
    if (e.type === 'report' && e.childEvents) {
      return e.childEvents.some((c) => severities.has(c.severity));
    }
    return false;
  });
}
