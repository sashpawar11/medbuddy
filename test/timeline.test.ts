import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  buildTimeline, 
  groupEventsByYear, 
  filterEventsByDateRange, 
  filterEventsByType, 
  filterEventsBySeverity,
  extractDateFromReportText,
  extractDateFromFilename,
  parseDate,
} from '../src/renderer/utils/buildTimeline';
import type { AnalysisRecord } from '../src/shared/types';

describe('Health Chronicle / Medical History Timeline', () => {
  const mockAnalyses: AnalysisRecord[] = [
    {
      id: 'analysis_1',
      cache_key: 'ck_1',
      scope_type: 'folder',
      scope_id: 'folder_1',
      scope_name: 'Bloodwork & Metabolism',
      member_id: 'mem_1',
      member_name: 'Rajesh Kumar',
      provider_profile_id: 'prov_1',
      prompt_version: '1.1.0',
      created_at: '2026-09-15T10:00:00Z',
      source_documents: [
        {
          id: 'doc_1',
          folder_id: 'folder_1',
          filename: 'CBC_Report_Sep2026.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          storage_path: '/vault/doc1.pdf',
          content_hash: 'hash1',
          ocr_status: 'done',
          created_at: '2026-09-15T09:00:00Z',
          updated_at: '2026-09-15T09:00:00Z',
        },
      ],
      result_json: {
        schemaVersion: '1.1',
        summary: 'Mild anemia detected with low hemoglobin level.',
        documentDateRange: {
          earliest: '2026-09-15',
          latest: '2026-09-15',
        },
        metrics: [
          {
            name: 'Hemoglobin',
            value: 10.2,
            unit: 'g/dL',
            referenceRange: '12.0-18.0',
            status: 'flagged',
            history: [
              { date: '2025-01-10', value: 12.8 },
              { date: '2026-09-15', value: 10.2 },
            ],
          },
          {
            name: 'WBC',
            value: 6500,
            unit: 'cells/mcL',
            referenceRange: '4000-11000',
            status: 'normal',
          },
        ],
        flags: [
          {
            title: 'Mild Anemia',
            severity: 'high',
            explanation: 'Hemoglobin at 10.2 g/dL indicates mild anemia.',
            relatedMetric: 'Hemoglobin',
          },
        ],
        anomalies: [
          {
            title: 'Sharp Decline in Hemoglobin',
            category: 'sharp_trend',
            observation: 'Hemoglobin dropped from 12.8 to 10.2 over 20 months.',
            pinpointNotes: ['CBC Jan 2025: 12.8 g/dL', 'CBC Sep 2026: 10.2 g/dL'],
            severity: 'high',
          },
        ],
        recommendations: ['Consult physician regarding iron deficiency'],
        extractedEntities: {
          reportTypes: ['Complete Blood Count'],
          providers: ['Metropolis Healthcare'],
        },
        sourceDocuments: [{ id: 'doc_1', filename: 'CBC_Report_Sep2026.pdf' }],
        confidence: 'high',
      },
    },
    {
      id: 'analysis_2',
      cache_key: 'ck_2',
      scope_type: 'folder',
      scope_id: 'folder_2',
      scope_name: 'Abdominal Ultrasound',
      member_id: 'mem_1',
      member_name: 'Rajesh Kumar',
      provider_profile_id: 'prov_1',
      prompt_version: '1.1.0',
      created_at: '2024-11-20T10:00:00Z',
      source_documents: [],
      result_json: {
        schemaVersion: '1.1',
        summary: 'Gallstones identified on ultrasound.',
        documentDateRange: {
          earliest: '2024-11-20',
          latest: '2024-11-20',
        },
        metrics: [],
        flags: [
          {
            title: 'Cholelithiasis',
            severity: 'moderate',
            explanation: 'Presence of multiple gallstones in gallbladder lumen.',
          },
        ],
        recommendations: ['Follow-up surgical consultation'],
        extractedEntities: {
          reportTypes: ['Ultrasound Abdomen'],
          providers: ['Apollo Diagnostic Center'],
        },
        sourceDocuments: [],
        confidence: 'high',
      },
    },
  ];

  it('correctly assembles TimelineData from AnalysisRecords', () => {
    const timeline = buildTimeline(mockAnalyses, 'mem_1', 'Rajesh Kumar');

    assert.strictEqual(timeline.memberId, 'mem_1');
    assert.strictEqual(timeline.memberName, 'Rajesh Kumar');
    assert.strictEqual(timeline.stats.totalReports, 2);
    assert.strictEqual(timeline.stats.anomalyCount, 1);
    assert.strictEqual(timeline.stats.flaggedCount, 4); // 2 Hemoglobin measurements + Anemia flag + High severity anomaly
    assert.ok(timeline.events.length >= 3, 'Should have report and anomaly events');
  });

  it('correctly groups events by year', () => {
    const timeline = buildTimeline(mockAnalyses, 'mem_1', 'Rajesh Kumar');
    const byYear = groupEventsByYear(timeline.events);

    assert.ok(byYear.has(2026), 'Should contain year 2026');
    assert.ok(byYear.has(2024), 'Should contain year 2024');
    assert.ok(byYear.get(2026)!.length >= 2, '2026 should have report and anomaly');
  });

  it('computes trend direction correctly', () => {
    const timeline = buildTimeline(mockAnalyses, 'mem_1', 'Rajesh Kumar');
    const report2026 = timeline.events.find((e) => e.type === 'report' && e.title.includes('Blood Count'));
    assert.ok(report2026, 'Should find 2026 blood report');

    const hemo = report2026?.childEvents?.find((c) => c.metric?.name === 'Hemoglobin');
    assert.ok(hemo, 'Should find Hemoglobin child biomarker');
    assert.strictEqual(hemo?.metric?.trendDirection, 'down', 'Hemoglobin should show downward trend (12.8 -> 10.2)');
    assert.strictEqual(hemo?.metric?.previousValue, 12.8);
    assert.ok(hemo?.metric?.history && hemo.metric.history.length === 2, 'Should preserve history points');
  });

  it('filters events by type and severity', () => {
    const timeline = buildTimeline(mockAnalyses, 'mem_1', 'Rajesh Kumar');

    // Type filter: anomaly
    const anomaliesOnly = filterEventsByType(timeline.events, new Set(['anomaly']));
    assert.strictEqual(anomaliesOnly.length, 1);
    assert.strictEqual(anomaliesOnly[0].type, 'anomaly');

    // Severity filter: flagged
    const flaggedOnly = filterEventsBySeverity(timeline.events, new Set(['flagged']));
    assert.ok(flaggedOnly.length > 0, 'Should return flagged events');
  });

  it('filters events by date range', () => {
    const timeline = buildTimeline(mockAnalyses, 'mem_1', 'Rajesh Kumar');
    const start2026 = new Date('2026-01-01');
    const end2026 = new Date('2026-12-31');

    const filtered = filterEventsByDateRange(timeline.events, start2026, end2026);
    assert.ok(filtered.every((e) => new Date(e.date).getFullYear() === 2026), 'All events must be in 2026');
  });

  it('extracts exact report date from OCR text and filenames', () => {
    // 1. Text with "Date of Collection: 14-Sep-2024"
    const text1 = `
      METROPOLIS HEALTHCARE LAB
      Patient: Rajesh Kumar
      Date of Collection: 14-Sep-2024
      Report Date: 15-Sep-2024
      Test: Complete Blood Count
    `;
    const date1 = extractDateFromReportText(text1);
    assert.ok(date1, 'Should find date in report text');
    assert.strictEqual(new Date(date1).getUTCFullYear(), 2024);
    assert.strictEqual(new Date(date1).getUTCMonth(), 8); // Sep is 8 (0-indexed)
    assert.strictEqual(new Date(date1).getUTCDate(), 14);

    // 2. Filename with date "Bloodwork-LipidPanel-2023-11-05.pdf"
    const date2 = extractDateFromFilename('Bloodwork-LipidPanel-2023-11-05.pdf');
    assert.ok(date2, 'Should find date in filename');
    assert.strictEqual(new Date(date2).getUTCFullYear(), 2023);
    assert.strictEqual(new Date(date2).getUTCMonth(), 10); // Nov is 10
    assert.strictEqual(new Date(date2).getUTCDate(), 5);

    // 3. Normalized date parsing
    assert.strictEqual(parseDate('YYYY-MM-DD'), null, 'Template placeholder should return null');
    assert.strictEqual(parseDate('undefined'), null);
    assert.ok(parseDate('15.09.2026'));
  });
});
