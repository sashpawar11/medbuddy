import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  FileCheck2,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  ChevronLeft,
  Copy,
  Check,
  Stethoscope,
  TrendingUp,
  FlaskConical,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  GitCompare,
  CheckCircle2,
  ArrowRight,
  Clock,
  FileDown,
  Loader2,
} from 'lucide-react';
import type {
  AnalysisRecord,
  DocumentItem,
  StructuredMetric,
  StructuredFlag,
} from '../../../shared/types';
import { DisclaimerBar } from '../common/DisclaimerBar';
import { StatusChip } from '../common/StatusChip';
import { Button } from '../common/Button';
import { BiomarkerRangeBar } from './BiomarkerRangeBar';

interface Props {
  analysis: AnalysisRecord;
  onBack?: () => void;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
  onPreviewDoc?: (doc: DocumentItem) => void;
  onOpenChronicle?: () => void;
  onShowToast?: (type: 'success' | 'error', text: string) => void;
}

/** Date formatter: "Sep 23, 2026" */
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Smart clinical narrative renderer:
 * 1. Honors explicit markdown bold (**term**) if provided by the LLM
 * 2. Tastefully highlights key medical terms, lab numbers with units, and diagnoses
 */
function renderHighlightedNarrative(
  summaryText: string,
  highlightTerms: string[] = []
): React.ReactNode {
  if (!summaryText) return null;

  // Case 1: Text contains markdown bold syntax **...**
  if (summaryText.includes('**')) {
    const parts = summaryText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2);
        return (
          <strong
            key={idx}
            className="font-semibold text-primary dark:text-ink-50 underline decoration-vault-400/40 underline-offset-2"
          >
            {clean}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  // Case 2: Auto-detect clinical findings, lab values with units, and key diagnoses
  const termsToHighlight = new Set<string>();

  // Add detected biomarker / clinical findings names
  highlightTerms.forEach((t) => {
    if (t && t.length > 2) termsToHighlight.add(t);
  });

  // Standard high-impact clinical phrases to emphasize gently
  const standardKeyPhrases = [
    'Invasive Carcinoma',
    'Grade I',
    'Grade II',
    'Grade III',
    'Grade IV',
    'HER2',
    'ER/PR negative',
    'ER/PR positive',
    'ER positive',
    'PR positive',
    'ER negative',
    'PR negative',
    'metastatic',
    'hyperglycemia',
    'mild anemia',
    'anemia',
    'cholelithiasis',
    'active inflammatory process',
    'lymph nodes',
  ];

  standardKeyPhrases.forEach((p) => {
    if (summaryText.toLowerCase().includes(p.toLowerCase())) {
      termsToHighlight.add(p);
    }
  });

  // Regex matching lab values with units (e.g. 161 mg/dL, 35 mm/hr, 77.7 fL) and terms
  const termPatterns = Array.from(termsToHighlight)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const patternParts = [
    '\\b\\d+(?:\\.\\d+)?\\s*(?:mg\\/dL|mm\\/hr|g\\/dl|fL|uIU\\/dl|thou\\/uL|gm\\/dL|%|U\\/L)\\b',
    ...termPatterns,
  ].filter(Boolean);

  if (patternParts.length === 0) {
    return summaryText;
  }

  const combinedRegex = new RegExp(`(${patternParts.join('|')})`, 'gi');
  const tokens = summaryText.split(combinedRegex);

  return tokens.map((token, idx) => {
    if (token.match(combinedRegex)) {
      return (
        <strong
          key={idx}
          className="font-semibold text-primary dark:text-ink-50 bg-vault-50/70 dark:bg-vault-950/60 dark:text-vault-200 px-1 py-0.5 rounded text-[13.5px] border border-vault-200/50 dark:border-vault-800/60 inline-block my-0.5"
        >
          {token}
        </strong>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

export const OverviewDashboard: React.FC<Props> = ({
  analysis,
  onBack,
  onRegenerate,
  onDelete,
  onPreviewDoc,
  onOpenChronicle,
  onShowToast,
}) => {
  const result = analysis.result_json;
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAllNormal, setShowAllNormal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const memberPrefix = analysis.member_name ? `${analysis.member_name}_` : '';
      const dateStr = new Date(analysis.created_at || Date.now())
        .toISOString()
        .slice(0, 10);
      const safeName = (analysis.scope_name || `${memberPrefix}${dateStr}_generated_summary`)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const defaultFilename = `${safeName}.pdf`;

      if (window.medbuddy?.exportPdf) {
        const res = await window.medbuddy.exportPdf(defaultFilename);
        if (res.success) {
          onShowToast?.('success', 'Medical report exported to PDF successfully');
        } else if (!res.canceled && res.error) {
          onShowToast?.('error', `Failed to export PDF: ${res.error}`);
        }
      } else {
        window.print();
      }
    } catch (err: any) {
      onShowToast?.('error', `PDF export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medbuddy_overview_${analysis.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyDoctorQuestions = () => {
    let text = `MedBuddy — Physician Discussion Points (${analysis.scope_name || 'Medical Overview'})\n`;
    text += `Generated: ${formatDate(analysis.created_at)}\n\n`;

    if (result.discussionPoints && result.discussionPoints.length > 0) {
      result.discussionPoints.forEach((dp, i) => {
        text += `${i + 1}. [${dp.urgency.toUpperCase()}] ${dp.topic}: ${dp.question}\n`;
        if (dp.rationale) text += `   Clinical Rationale: ${dp.rationale}\n`;
        if (dp.relatedMarkers && dp.relatedMarkers.length > 0) {
          text += `   Related Biomarkers: ${dp.relatedMarkers.join(', ')}\n`;
        }
        text += '\n';
      });
    } else if (result.recommendations && result.recommendations.length > 0) {
      result.recommendations.forEach((rec, i) => {
        text += `${i + 1}. ${rec}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingleQuestion = (questionText: string, index: number) => {
    navigator.clipboard.writeText(questionText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Metrics segmentation
  const allMetrics = result.metrics || [];
  const flaggedMetrics = allMetrics.filter(
    (m) => m.status === 'flagged' || m.status === 'borderline'
  );
  const normalMetrics = allMetrics.filter(
    (m) => m.status === 'normal' || (!m.status && !flaggedMetrics.includes(m))
  );

  // Flags from result
  const flags = result.flags || [];

  // Match flags with metrics or synthesize out-of-range clinical finding items
  interface ClinicalFindingItem {
    id: string;
    name: string;
    value?: number | string;
    unit?: string;
    referenceRange?: string;
    severity: 'low' | 'moderate' | 'high';
    status: 'normal' | 'borderline' | 'flagged';
    explanation: string;
  }

  const clinicalFindings: ClinicalFindingItem[] = [];

  // 1. Add from flagged metrics
  flaggedMetrics.forEach((m, idx) => {
    const matchedFlag = flags.find(
      (f) =>
        f.relatedMetric?.toLowerCase() === m.name.toLowerCase() ||
        m.name.toLowerCase().includes(f.relatedMetric?.toLowerCase() || '___')
    );

    clinicalFindings.push({
      id: `metric-${idx}`,
      name: m.name,
      value: m.value,
      unit: m.unit,
      referenceRange: m.referenceRange,
      severity: matchedFlag?.severity || (m.status === 'flagged' ? 'high' : 'moderate'),
      status: m.status,
      explanation:
        matchedFlag?.explanation ||
        `Measured ${m.value} ${m.unit || ''}, outside standard reference range (${
          m.referenceRange || 'unspecified'
        }).`,
    });
  });

  // 2. Add any standalone flags not already paired with a metric
  flags.forEach((f, idx) => {
    const alreadyIncluded = clinicalFindings.some(
      (cf) =>
        cf.name.toLowerCase() === f.title.toLowerCase() ||
        (f.relatedMetric && cf.name.toLowerCase().includes(f.relatedMetric.toLowerCase()))
    );

    if (!alreadyIncluded) {
      clinicalFindings.push({
        id: `flag-${idx}`,
        name: f.title,
        severity: f.severity,
        status: f.severity === 'high' ? 'flagged' : 'borderline',
        explanation: f.explanation,
      });
    }
  });

  const totalFlaggedCount = clinicalFindings.length;
  const normalMarkersToDisplay = showAllNormal ? normalMetrics : normalMetrics.slice(0, 8);

  // Metrics with multiple history points for trend lines
  const trendableMetrics = allMetrics.filter(
    (m) => m.history && m.history.length > 1
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto print:overflow-visible print:bg-white select-none font-sans">
      {/* Top Action Header Bar */}
      <header className="h-14 px-6 border-b border-border dark:border-ink-800 flex items-center justify-between shrink-0 bg-surface dark:bg-ink-900 sticky top-0 z-20 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              icon={<ChevronLeft className="w-4 h-4" strokeWidth={1.75} />}
            >
              Back
            </Button>
          )}
          <div className="h-4 w-[1px] bg-border dark:bg-ink-800 mx-1" />
          <div className="flex items-center gap-2.5">
            <span className="text-body font-semibold text-primary dark:text-ink-100 truncate max-w-[280px]">
              {analysis.scope_name || 'Medical Documents'}
            </span>
            <span className="text-caption text-tertiary dark:text-ink-400 tabular-nums font-mono">
              {formatDate(analysis.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenChronicle && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenChronicle}
              icon={<Clock className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" strokeWidth={2} />}
              title="View Health Chronicle"
            >
              Health Chronicle
            </Button>
          )}
          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRegenerate}
              icon={<Sparkles className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.75} />}
            >
              Regenerate
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            icon={<Download className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.75} />}
            title="Export raw JSON"
          >
            Export JSON
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Delete this health overview?')) {
                  onDelete(analysis.id);
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            icon={
              isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" strokeWidth={1.75} />
              )
            }
            title="Export as formatted PDF document"
          >
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.75} />}
            title="Print overview via system dialog"
          >
            Print
          </Button>
        </div>
      </header>

      {/* Main Content Area: Proportional Widescreen Container (Max 1440px) */}
      <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto print:block">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:max-w-none print:px-0 print:py-0 print:space-y-4 printable-report">
          {/* Formal Printable Clinical Document Header (Visible only when exporting to PDF or printing) */}
          <div className="hidden print:block mb-5 pb-4 border-b-2 border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-vault-600 text-white flex items-center justify-center font-bold text-lg">
                  +
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                    MedBuddy Clinical Synthesis Report
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    Personal Family Health Vault • Confirmed Local &amp; Confidential
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-vault-50 border border-vault-200 text-vault-700 text-xs font-semibold">
                  AI Synthesized Clinical Overview
                </span>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Report Date: {formatDate(analysis.created_at)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px] tracking-wider">
                  Patient Profile
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {analysis.member_name || 'Family Member'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px] tracking-wider">
                  Report Title
                </span>
                <span className="font-semibold text-slate-800 truncate block" title={analysis.scope_name}>
                  {analysis.scope_name || 'Medical Summary'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px] tracking-wider">
                  Source Documents Analyzed
                </span>
                <span className="font-semibold text-slate-800">
                  {analysis.source_documents?.length || 1} Document
                  {(analysis.source_documents?.length || 1) > 1 ? 's' : ''} in vault
                </span>
              </div>
            </div>
          </div>
          {/* SECTION 1: Generated Medical Summary Header & Stat Chips */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Title & Icon */}
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-vault-50 dark:bg-vault-950/60 border border-vault-200 dark:border-vault-800 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Activity className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-h1 font-bold text-primary dark:text-ink-50 tracking-tight">
                    Generated Medical Summary
                  </h1>
                  <p className="text-small text-secondary dark:text-ink-400 mt-0.5">
                    Synthesized across {analysis.source_documents?.length || 1} clinical document
                    {(analysis.source_documents?.length || 1) > 1 ? 's' : ''} in vault
                  </p>
                </div>
              </div>

              {/* Stat Counters Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Tracked Markers */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
                  <div className="w-7 h-7 rounded-md bg-vault-50 dark:bg-vault-950/50 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-body font-bold text-primary dark:text-ink-100 tabular-nums block leading-tight">
                      {allMetrics.length}
                    </span>
                    <span className="text-[11px] font-medium text-tertiary dark:text-ink-400 block leading-tight">
                      Tracked Markers
                    </span>
                  </div>
                </div>

                {/* Flagged */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      totalFlaggedCount > 0
                        ? 'bg-clay-100 dark:bg-clay-950/60 text-clay-600 dark:text-clay-400'
                        : 'bg-sage-100 dark:bg-sage-950/60 text-sage-600 dark:text-sage-400'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div>
                    <span
                      className={`text-body font-bold tabular-nums block leading-tight ${
                        totalFlaggedCount > 0
                          ? 'text-clay-600 dark:text-clay-400'
                          : 'text-sage-600 dark:text-sage-400'
                      }`}
                    >
                      {totalFlaggedCount}
                    </span>
                    <span className="text-[11px] font-medium text-tertiary dark:text-ink-400 block leading-tight">
                      Flagged
                    </span>
                  </div>
                </div>

                {/* Anomalies */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
                  <div className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <GitCompare className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-body font-bold text-primary dark:text-ink-100 tabular-nums block leading-tight">
                      {result.anomalies?.length || 0}
                    </span>
                    <span className="text-[11px] font-medium text-tertiary dark:text-ink-400 block leading-tight">
                      Anomalies
                    </span>
                  </div>
                </div>

                {/* Discussion Points */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
                  <div className="w-7 h-7 rounded-md bg-sage-100 dark:bg-sage-950/50 text-sage-600 dark:text-sage-400 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-body font-bold text-primary dark:text-ink-100 tabular-nums block leading-tight">
                      {result.discussionPoints?.length || result.recommendations?.length || 0}
                    </span>
                    <span className="text-[11px] font-medium text-tertiary dark:text-ink-400 block leading-tight">
                      Discussion Points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Row: Narrative Summary (8 cols) & Overall Status Alert (4 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Left: Narrative Card */}
              <div className="md:col-span-7 lg:col-span-8 bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-6 shadow-xs flex flex-col justify-between print-card break-inside-avoid">
                <div>
                  <div className="text-body text-primary dark:text-ink-200 leading-relaxed whitespace-pre-line select-text font-normal">
                    {renderHighlightedNarrative(
                      result.summary,
                      clinicalFindings.map((cf) => cf.name)
                    )}
                  </div>
                </div>

                {/* Key Highlights / Takeaways Pills if present */}
                {result.keyHighlights && result.keyHighlights.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border dark:border-ink-800">
                    <span className="text-caption font-semibold uppercase tracking-wider text-tertiary dark:text-ink-400 block mb-2">
                      Key Highlights
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.keyHighlights.map((hl, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-md bg-surface-recessed dark:bg-ink-800/50 border border-border dark:border-ink-800 text-small text-secondary dark:text-ink-300 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-vault-600 dark:bg-vault-400 shrink-0" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Overall Status Card */}
              <div
                className={`md:col-span-5 lg:col-span-4 rounded-xl border p-6 flex flex-col justify-between shadow-xs print-card break-inside-avoid ${
                  totalFlaggedCount > 0
                    ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/60'
                    : 'bg-sage-50/70 dark:bg-sage-950/25 border-sage-200 dark:border-sage-800/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {totalFlaggedCount > 0 ? (
                      <AlertTriangle
                        className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0"
                        strokeWidth={2}
                      />
                    ) : (
                      <CheckCircle2
                        className="w-5 h-5 text-sage-600 dark:text-sage-400 shrink-0"
                        strokeWidth={2}
                      />
                    )}
                    <span
                      className={`text-caption font-bold uppercase tracking-wider ${
                        totalFlaggedCount > 0
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-sage-700 dark:text-sage-300'
                      }`}
                    >
                      Overall status
                    </span>
                  </div>

                  <h3 className="text-h2 font-bold text-primary dark:text-ink-50 tracking-tight">
                    {totalFlaggedCount > 0
                      ? `${totalFlaggedCount} marker${
                          totalFlaggedCount > 1 ? 's' : ''
                        } need attention`
                      : 'All markers in normal range'}
                  </h3>

                  <p className="text-small text-secondary dark:text-ink-300 leading-relaxed">
                    {totalFlaggedCount > 0
                      ? 'Some markers are outside the standard reference range. Please discuss these specific findings with your healthcare provider for evaluation.'
                      : 'All extracted clinical biomarkers fall within standard reference intervals. Continue routine preventive health monitoring.'}
                  </p>
                </div>

                {totalFlaggedCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/60 text-caption font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 print:hidden">
                    <span>See out-of-range details below</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Two-Column Section (Clinical Findings vs At a Glance) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Clinical Findings (Markers outside normal range) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-md bg-clay-100 dark:bg-clay-950/60 text-clay-600 dark:text-clay-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-h2 font-bold text-primary dark:text-ink-100">
                    Clinical Findings
                  </h2>
                  <p className="text-caption text-secondary dark:text-ink-400">
                    Markers outside normal range ({totalFlaggedCount})
                  </p>
                </div>
              </div>

              {clinicalFindings.length > 0 ? (
                <div className="space-y-3.5">
                  {clinicalFindings.map((cf) => {
                    const severityClass =
                      cf.severity === 'high'
                        ? 'bg-clay-100 border-clay-300 text-clay-700 dark:bg-clay-950/60 dark:border-clay-700/80 dark:text-clay-300'
                        : cf.severity === 'moderate'
                        ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-700/80 dark:text-amber-300'
                        : 'bg-surface-recessed border-border text-secondary dark:bg-ink-800/60 dark:border-ink-700 dark:text-ink-300';

                    return (
                      <div
                        key={cf.id}
                        className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-5 shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out space-y-3.5 print-card break-inside-avoid"
                      >
                        {/* Top: Name & Severity Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-body font-bold text-primary dark:text-ink-100 leading-snug">
                            {cf.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-medium border shrink-0 uppercase text-[11px] tracking-wide ${severityClass}`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>{cf.severity}</span>
                          </span>
                        </div>

                        {/* Numeric Value & Range Bar */}
                        {cf.value !== undefined && (
                          <div className="space-y-1.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-metric-lg font-bold text-clay-600 dark:text-clay-400 tabular-nums tracking-tight">
                                {cf.value}
                              </span>
                              {cf.unit && (
                                <span className="text-small font-medium text-tertiary dark:text-ink-400">
                                  {cf.unit}
                                </span>
                              )}
                            </div>

                            {cf.referenceRange && (
                              <p className="text-small text-tertiary dark:text-ink-400">
                                Reference range:{' '}
                                <span className="font-mono text-secondary dark:text-ink-300">
                                  {cf.referenceRange} {cf.unit || ''}
                                </span>
                              </p>
                            )}

                            {/* Visual Range Slider */}
                            <BiomarkerRangeBar
                              value={cf.value}
                              referenceRange={cf.referenceRange}
                              status={cf.status}
                              unit={cf.unit}
                            />
                          </div>
                        )}

                        {/* Clinical Explanation */}
                        {cf.explanation && (
                          <p className="text-small text-secondary dark:text-ink-300 leading-relaxed pt-2.5 border-t border-border dark:border-ink-800">
                            {cf.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-sage-600 mx-auto" />
                  <p className="text-body font-semibold text-primary dark:text-ink-100">
                    No Clinical Flags
                  </p>
                  <p className="text-small text-secondary dark:text-ink-400">
                    All evaluated clinical biomarkers are within healthy reference intervals.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: At a Glance (Normal Biomarkers) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-h2 font-bold text-primary dark:text-ink-100">At a Glance</h2>
                    <p className="text-caption text-secondary dark:text-ink-400">
                      Other key markers within normal range
                    </p>
                  </div>
                </div>

                {normalMetrics.length > 8 && (
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="text-caption text-tertiary dark:text-ink-400 font-mono">
                      {normalMarkersToDisplay.length} of {normalMetrics.length} markers shown
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllNormal((prev) => !prev)}
                      className="text-caption font-semibold text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>{showAllNormal ? 'Show less' : 'View all'}</span>
                      {showAllNormal ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Grid of Compact Normal Cards (Screen: interactive view) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
                {normalMarkersToDisplay.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-surface dark:bg-ink-900 rounded-lg border border-border dark:border-ink-800 p-3.5 flex flex-col justify-between shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out"
                  >
                    <div>
                      {/* Name & Normal Badge */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <span
                          className="text-small font-semibold text-primary dark:text-ink-100 line-clamp-2 leading-snug"
                          title={m.name}
                        >
                          {m.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sage-100 border border-sage-300 text-sage-600 dark:bg-sage-950/60 dark:border-sage-700/80 dark:text-sage-300 shrink-0">
                          <span className="w-1 h-1 rounded-full bg-sage-600 dark:bg-sage-400" />
                          <span>Normal</span>
                        </span>
                      </div>

                      {/* Value & Unit */}
                      <div className="my-1 flex items-baseline gap-1">
                        <span className="text-h2 font-bold text-primary dark:text-ink-50 tabular-nums">
                          {m.value}
                        </span>
                        {m.unit && (
                          <span className="text-[11px] font-medium text-tertiary dark:text-ink-400">
                            {m.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reference Range */}
                    {m.referenceRange && (
                      <div className="pt-2 border-t border-border dark:border-ink-800 text-[11px] font-mono text-tertiary dark:text-ink-400">
                        <span>Ref: {m.referenceRange}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid of Compact Normal Cards (Print: renders ALL normal markers) */}
              <div className="hidden print:grid grid-cols-3 gap-2.5">
                {normalMetrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-slate-200 p-2.5 flex flex-col justify-between print-card break-inside-avoid text-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-slate-800 line-clamp-1">{m.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Normal
                        </span>
                      </div>
                      <div className="my-0.5 flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-900">{m.value}</span>
                        {m.unit && <span className="text-[10px] text-slate-500">{m.unit}</span>}
                      </div>
                    </div>
                    {m.referenceRange && (
                      <div className="pt-1 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                        Ref: {m.referenceRange}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: Questions for Your Healthcare Provider */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-vault-50 dark:bg-vault-950/60 border border-vault-200 dark:border-vault-800 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-h2 font-bold text-primary dark:text-ink-100">
                    Questions for Your Healthcare Provider
                  </h2>
                  <p className="text-small text-secondary dark:text-ink-400">
                    Prioritized topics and clinical questions prepared for your appointment
                  </p>
                </div>
              </div>

              <div className="print:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyDoctorQuestions}
                  icon={
                    copiedAll ? (
                      <Check className="w-3.5 h-3.5 text-sage-600" strokeWidth={2} />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.75} />
                    )
                  }
                >
                  {copiedAll ? 'Copied all' : 'Copy all for Doctor'}
                </Button>
              </div>
            </div>

            {/* Questions Grid: 2 Columns */}
            {result.discussionPoints && result.discussionPoints.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {result.discussionPoints.map((dp, i) => {
                  const isCopied = copiedIndex === i;
                  return (
                    <div
                      key={i}
                      className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-5 shadow-xs flex flex-col justify-between hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out space-y-3 print-card break-inside-avoid"
                    >
                      {/* Top Badges & Individual Copy */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Urgency */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium border ${
                              dp.urgency === 'priority'
                                ? 'bg-clay-100 border-clay-300 text-clay-700 dark:bg-clay-950/60 dark:border-clay-700/80 dark:text-clay-300'
                                : dp.urgency === 'follow_up'
                                ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/60 dark:border-amber-700/80 dark:text-amber-300'
                                : 'bg-sage-100 border-sage-300 text-sage-700 dark:bg-sage-950/60 dark:border-sage-700/80 dark:text-sage-300'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{dp.urgency.replace('_', ' ')}</span>
                          </span>

                          {/* Topic Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-700 dark:text-vault-300 border border-vault-200 dark:border-vault-800 text-caption font-semibold">
                            {dp.topic}
                          </span>

                          {/* Biomarkers */}
                          {dp.relatedMarkers?.map((rm, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-surface-recessed dark:bg-ink-800/60 text-tertiary dark:text-ink-400 border border-border dark:border-ink-800 text-[11px] font-mono truncate max-w-[160px]"
                            >
                              {rm}
                            </span>
                          ))}
                        </div>

                        {/* Individual Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopySingleQuestion(dp.question, i)}
                          className="px-2.5 py-1 rounded-md text-caption font-medium text-tertiary dark:text-ink-400 hover:text-primary dark:hover:text-ink-100 hover:bg-surface-hover dark:hover:bg-ink-800 border border-border dark:border-ink-800 flex items-center gap-1 transition-colors print:hidden"
                          title="Copy this question"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-sage-600" />
                              <span className="text-sage-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Question in bold quotes */}
                      <p className="text-body font-semibold text-primary dark:text-ink-100 leading-snug pt-1">
                        "{dp.question}"
                      </p>

                      {/* Clinical Rationale */}
                      {dp.rationale && (
                        <p className="text-small text-secondary dark:text-ink-300 leading-relaxed pt-2 border-t border-border dark:border-ink-800">
                          <strong className="text-primary dark:text-ink-200 font-medium">
                            Rationale:
                          </strong>{' '}
                          {dp.rationale}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : result.recommendations && result.recommendations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-4 shadow-xs print-card break-inside-avoid"
                  >
                    <p className="text-body font-medium text-primary dark:text-ink-100">{rec}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* SECTION 4: Cross-Record Anomalies & Discrepancies (if present) */}
          {result.anomalies && result.anomalies.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <GitCompare className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-h2 font-bold text-primary dark:text-ink-100">
                    Cross-Record Anomalies &amp; Discrepancies ({result.anomalies.length})
                  </h2>
                  <p className="text-caption text-secondary dark:text-ink-400">
                    Comparative observations synthesized across distinct encounters
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.anomalies.map((anom, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs space-y-3 print-card break-inside-avoid"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-caption uppercase font-semibold text-tertiary dark:text-ink-400">
                        {anom.category.replace('_', ' ')}
                      </span>
                      <StatusChip
                        status={anom.severity === 'high' ? 'flagged' : 'borderline'}
                        label={`${anom.severity} Impact`}
                      />
                    </div>

                    <h4 className="text-body font-bold text-primary dark:text-ink-100">
                      {anom.title}
                    </h4>
                    <p className="text-small text-secondary dark:text-ink-300 leading-relaxed">
                      {anom.observation}
                    </p>

                    {anom.pinpointNotes && anom.pinpointNotes.length > 0 && (
                      <div className="p-3 bg-surface-recessed dark:bg-ink-800/60 rounded-lg border border-border dark:border-ink-800 space-y-1">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-tertiary dark:text-ink-400 block">
                          Pinpoint Citations
                        </span>
                        <ul className="space-y-1">
                          {anom.pinpointNotes.map((note, nIdx) => (
                            <li
                              key={nIdx}
                              className="text-caption text-secondary dark:text-ink-300 flex items-start gap-1.5"
                            >
                              <ArrowUpRight
                                className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400 shrink-0 mt-0.5"
                                strokeWidth={2}
                              />
                              <span className="font-mono text-primary dark:text-ink-100">
                                {note}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: Longitudinal Trends (if historical points exist) */}
          {trendableMetrics.length > 0 && (
            <div className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-6 shadow-xs space-y-5 print-card break-inside-avoid">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-h2 font-bold text-primary dark:text-ink-100">
                    Longitudinal Trends
                  </h2>
                  <p className="text-caption text-secondary dark:text-ink-400">
                    Historical biomarker trajectories tracked across visits
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {trendableMetrics.map((tm, idx) => {
                  const history = tm.history || [];
                  const values = history
                    .map((h) => Number(h.value))
                    .filter((v) => !isNaN(v));
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const chartW = 500;
                  const chartH = 100;
                  const padX = 24;
                  const padY = 16;

                  const points = values.map((val, pIdx) => {
                    const x =
                      padX + (pIdx / (values.length - 1)) * (chartW - padX * 2);
                    const y =
                      chartH - padY - ((val - min) / range) * (chartH - padY * 2);
                    return { x, y, val, date: history[pIdx].date };
                  });

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-surface-recessed dark:bg-ink-800/60 border border-border dark:border-ink-800 space-y-2.5 print-card break-inside-avoid"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-body font-bold text-primary dark:text-ink-100">
                            {tm.name}
                          </span>
                          <span className="text-caption text-tertiary dark:text-ink-400 ml-2 font-mono">
                            ({tm.unit})
                          </span>
                        </div>
                        <span className="text-caption font-mono text-secondary dark:text-ink-300 tabular-nums">
                          {history[0].value} → {history[history.length - 1].value}
                        </span>
                      </div>

                      <div className="w-full overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${chartW} ${chartH}`}
                          className="w-full h-24 overflow-visible"
                        >
                          <line
                            x1={padX}
                            y1={padY}
                            x2={chartW - padX}
                            y2={padY}
                            stroke="var(--chart-grid-line)"
                            strokeWidth="1"
                          />
                          <line
                            x1={padX}
                            y1={chartH / 2}
                            x2={chartW - padX}
                            y2={chartH / 2}
                            stroke="var(--chart-grid-line)"
                            strokeWidth="1"
                          />
                          <line
                            x1={padX}
                            y1={chartH - padY}
                            x2={chartW - padX}
                            y2={chartH - padY}
                            stroke="var(--chart-grid-line)"
                            strokeWidth="1"
                          />
                          <polyline
                            fill="none"
                            stroke="var(--vault-600)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                          />
                          {points.map((p, pIdx) => (
                            <g key={pIdx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={4}
                                fill="var(--vault-600)"
                              />
                              <text
                                x={p.x}
                                y={p.y - 7}
                                textAnchor="middle"
                                className="text-[10px] font-mono fill-ink-700 dark:fill-ink-300 font-bold"
                              >
                                {p.val}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 6: Source Records Traceability */}
          {analysis.source_documents && analysis.source_documents.length > 0 && (
            <div className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 p-5 shadow-xs space-y-3 print-card break-inside-avoid">
              <div className="flex items-center gap-2 text-primary dark:text-ink-100 font-bold text-h3">
                <FileText className="w-4 h-4 text-vault-600 dark:text-vault-400" />
                <span>Source Records ({analysis.source_documents.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.source_documents.map((sd) => {
                  const isPdf =
                    sd.file_type?.toLowerCase().includes('pdf') ||
                    sd.filename.toLowerCase().endsWith('.pdf');

                  return (
                    <div
                      key={sd.id}
                      className="p-3.5 rounded-lg bg-surface-recessed dark:bg-ink-800/60 border border-border dark:border-ink-800 flex items-center justify-between gap-3 hover:border-border-strong dark:hover:border-ink-700 transition-colors print-card break-inside-avoid"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isPdf
                              ? 'bg-clay-100 text-clay-600 dark:bg-clay-950/60 dark:text-clay-400'
                              : 'bg-vault-100 text-vault-600 dark:bg-vault-950/60 dark:text-vault-400'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-small font-semibold text-primary dark:text-ink-100 truncate"
                            title={sd.filename}
                          >
                            {sd.filename}
                          </p>
                          <div className="flex items-center gap-2 text-caption text-tertiary dark:text-ink-400">
                            <span>{(sd.file_size / 1024).toFixed(0)} KB</span>
                            <span>•</span>
                            <span>{formatDate(sd.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {onPreviewDoc && (
                        <button
                          type="button"
                          onClick={() => onPreviewDoc(sd)}
                          className="px-2.5 py-1 rounded-md text-caption font-semibold text-vault-600 dark:text-vault-400 hover:bg-vault-50 dark:hover:bg-vault-950/50 flex items-center gap-1 shrink-0 transition-colors print:hidden"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Medical Disclaimer Bar */}
      <DisclaimerBar className="print-avoid-break print:mt-4 print:bg-white print:border-t-2 print:border-slate-300" />
    </div>
  );
};
