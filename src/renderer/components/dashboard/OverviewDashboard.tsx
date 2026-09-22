import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  FileCheck2,
  Calendar,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Stethoscope,
  ChevronLeft,
  Crosshair,
  GitCompare,
  Copy,
  Check,
  Zap,
  Clock,
  FileWarning,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import type {
  AnalysisRecord,
  StructuredAnomaly,
  StructuredDiscussionPoint,
} from '../../../shared/types';

interface Props {
  analysis: AnalysisRecord;
  onBack?: () => void;
  onRegenerate?: () => void;
}

export const OverviewDashboard: React.FC<Props> = ({ analysis, onBack, onRegenerate }) => {
  const result = analysis.result_json;
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medbuddy_overview_${analysis.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyDoctorQuestions = () => {
    let text = `MedBuddy - Doctor Discussion Points (${analysis.scope_name || 'Medical Overview'})\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Metrics with history points for trends
  const trendableMetrics = result.metrics.filter(
    (m) => m.history && m.history.length > 1
  );

  // Status badge styling helper
  const getStatusBadge = (status: 'normal' | 'borderline' | 'flagged') => {
    switch (status) {
      case 'flagged':
        return 'bg-accent-red-soft text-accent-red border-accent-red/30';
      case 'borderline':
        return 'bg-accent-yellow-soft text-accent-yellow border-accent-yellow/30';
      case 'normal':
      default:
        return 'bg-accent-green-soft text-accent-green border-accent-green/30';
    }
  };

  // Anomaly category helper
  const getAnomalyCategoryInfo = (category: StructuredAnomaly['category']) => {
    switch (category) {
      case 'discrepancy':
        return {
          label: 'Cross-Record Discrepancy',
          icon: GitCompare,
          color: 'text-accent-yellow bg-accent-yellow-soft border-accent-yellow/30',
        };
      case 'sharp_trend':
        return {
          label: 'Sharp Trend Velocity',
          icon: TrendingUp,
          color: 'text-accent-blue bg-accent-blue-soft border-accent-blue/30',
        };
      case 'missing_followup':
        return {
          label: 'Unaddressed Follow-Up',
          icon: Clock,
          color: 'text-accent-red bg-accent-red-soft border-accent-red/30',
        };
      case 'critical_outlier':
        return {
          label: 'Critical Outlier',
          icon: AlertOctagon,
          color: 'text-accent-red bg-accent-red-soft border-accent-red/30',
        };
      case 'scan_alert':
        return {
          label: 'Physical Scan Note',
          icon: FileWarning,
          color: 'text-mute bg-surface-card border-hairline',
        };
      default:
        return {
          label: 'Sharp Clinical Observation',
          icon: Zap,
          color: 'text-accent-yellow bg-accent-yellow-soft border-accent-yellow/30',
        };
    }
  };

  // Discussion point urgency helper
  const getUrgencyBadge = (urgency: StructuredDiscussionPoint['urgency']) => {
    switch (urgency) {
      case 'priority':
        return 'bg-accent-red-soft text-accent-red border-accent-red/30';
      case 'follow_up':
        return 'bg-accent-yellow-soft text-accent-yellow border-accent-yellow/30';
      case 'routine':
      default:
        return 'bg-accent-blue-soft text-accent-blue border-accent-blue/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-y-auto print:overflow-visible print:bg-white print:text-black select-none">
      {/* Top action bar */}
      <header className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-surface/50 backdrop-blur-sm sticky top-0 z-20 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-mute hover:text-ink transition-colors font-medium px-2 py-1 rounded hover:bg-surface-elevated"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {analysis.scope_name || 'Medical Overview'}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated text-mute border border-hairline">
              {new Date(analysis.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-14">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-body bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-mute" />
              Regenerate
            </button>
          )}
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-body bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md transition-colors font-medium"
            title="Export structured JSON"
          >
            <Download className="w-3.5 h-3.5 text-mute" />
            JSON
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* 1. In-Depth Executive Health Summary Card */}
        <section className="p-6 sm:p-7 rounded-xl bg-surface border border-hairline relative overflow-hidden space-y-5 shadow-sm">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-blue-soft border border-accent-blue/30 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-ink uppercase">
                  Executive Health Synthesis
                </h2>
                <p className="text-xs text-mute mt-0.5">
                  Synthesized across {analysis.source_documents?.length || 0} clinical records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {result.confidence && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-surface-elevated border border-hairline text-mute">
                  Confidence: <span className="text-ink capitalize font-semibold">{result.confidence}</span>
                </span>
              )}
              {analysis.provider_name && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-surface-elevated border border-hairline text-mute">
                  Engine: <span className="text-ink font-medium">{analysis.provider_name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics & Vitals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-hairline">
              <span className="text-xs font-mono uppercase text-mute block font-medium">Tests Tracked</span>
              <span className="text-2xl font-mono font-bold text-ink mt-0.5 block">{result.metrics.length}</span>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-hairline">
              <span className="text-xs font-mono uppercase text-mute block font-medium">Flagged / Out of Range</span>
              <span className={`text-2xl font-mono font-bold mt-0.5 block ${result.flags?.length ? 'text-accent-red' : 'text-accent-green'}`}>
                {result.flags?.length || 0}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-hairline">
              <span className="text-xs font-mono uppercase text-mute block font-medium">Sharp Anomalies</span>
              <span className={`text-2xl font-mono font-bold mt-0.5 block ${result.anomalies?.length ? 'text-accent-yellow' : 'text-stone'}`}>
                {result.anomalies?.length || 0}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-hairline">
              <span className="text-xs font-mono uppercase text-mute block font-medium">Doctor Inquiries</span>
              <span className="text-2xl font-mono font-bold text-ink mt-0.5 block">
                {result.discussionPoints?.length || result.recommendations?.length || 0}
              </span>
            </div>
          </div>

          {/* Main In-Depth Narrative Summary - Highly Legible & Clean */}
          <div className="p-5 rounded-lg bg-canvas/70 border border-hairline">
            <p className="text-sm sm:text-[15px] text-ink leading-relaxed sm:leading-7 font-normal whitespace-pre-line selection:bg-accent-blue/20">
              {result.summary}
            </p>
          </div>

          {/* Key Highlights / Takeaways */}
          {result.keyHighlights && result.keyHighlights.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-stone tracking-wider font-semibold">
                <Bookmark className="w-3.5 h-3.5 text-accent-blue" />
                <span>Core Health Takeaways</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {result.keyHighlights.map((hl, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-lg bg-surface-elevated border border-hairline text-xs sm:text-[13px] text-body flex items-start gap-2.5 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
                    <span className="leading-snug">{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlighted Focal Markers Strip */}
          {result.highlightedMarkers && result.highlightedMarkers.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-hairline/60">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-stone tracking-wider font-semibold">
                <Activity className="w-3.5 h-3.5 text-ink" />
                <span>Primary Clinical Driver Markers ({result.highlightedMarkers.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.highlightedMarkers.map((hm, i) => {
                  const badgeClass = getStatusBadge(hm.status);
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-surface-elevated border border-hairline flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold text-ink truncate block">
                          {hm.marker}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${badgeClass}`}>
                          {hm.status}
                        </span>
                      </div>
                      {hm.value && (
                        <span className="text-base font-mono font-bold text-ink mb-1">
                          {hm.value}
                        </span>
                      )}
                      <p className="text-xs text-mute leading-relaxed">{hm.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date range & Document entities metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-mute pt-3 border-t border-hairline/60">
            {result.documentDateRange && (result.documentDateRange.earliest || result.documentDateRange.latest) && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone" />
                <span>
                  Span: {result.documentDateRange.earliest || 'N/A'} — {result.documentDateRange.latest || 'N/A'}
                </span>
              </div>
            )}
            {result.extractedEntities?.reportTypes && result.extractedEntities.reportTypes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone" />
                <span>Panels: {result.extractedEntities.reportTypes.join(', ')}</span>
              </div>
            )}
            {result.extractedEntities?.providers && result.extractedEntities.providers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-stone" />
                <span>Facilities: {result.extractedEntities.providers.join(', ')}</span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Anomalies & Sharp Observations */}
        {result.anomalies && result.anomalies.length > 0 && (
          <section className="p-6 rounded-xl bg-surface border border-hairline space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-accent-yellow" />
                <h3 className="text-xs font-mono uppercase text-stone tracking-wider font-semibold">
                  Cross-Record Anomalies & Clinical Observations ({result.anomalies.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-mute px-2 py-0.5 rounded bg-surface-elevated border border-hairline">
                Pinpointed Across Records
              </span>
            </div>

            <div className="space-y-3">
              {result.anomalies.map((anom, i) => {
                const catInfo = getAnomalyCategoryInfo(anom.category);
                const IconComponent = catInfo.icon;
                const isHigh = anom.severity === 'high';
                const severityClass = isHigh
                  ? 'bg-accent-red-soft text-accent-red border-accent-red/30'
                  : anom.severity === 'moderate'
                  ? 'bg-accent-yellow-soft text-accent-yellow border-accent-yellow/30'
                  : 'bg-surface-card text-mute border-hairline';

                return (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-surface-elevated border border-hairline space-y-3"
                  >
                    {/* Anomaly header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${catInfo.color}`}>
                          <IconComponent className="w-3 h-3" />
                          {catInfo.label}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${severityClass}`}>
                          {anom.severity} Impact
                        </span>
                      </div>

                      {anom.relatedDocuments && anom.relatedDocuments.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-stone">
                          <span>Ref:</span>
                          <span className="text-mute truncate max-w-[280px]">
                            {anom.relatedDocuments.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title & Detailed Observation */}
                    <div>
                      <h4 className="text-sm font-semibold text-ink mb-1">{anom.title}</h4>
                      <p className="text-xs sm:text-sm text-body leading-relaxed">{anom.observation}</p>
                    </div>

                    {/* Pinpoint Notes List */}
                    {anom.pinpointNotes && anom.pinpointNotes.length > 0 && (
                      <div className="p-3 rounded-md bg-canvas/70 border border-hairline/70 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-stone block tracking-wider font-semibold">
                          Pinpoint Citations Across Documents:
                        </span>
                        <ul className="space-y-1">
                          {anom.pinpointNotes.map((note, nIdx) => (
                            <li key={nIdx} className="text-xs text-body flex items-start gap-1.5 leading-relaxed">
                              <ArrowUpRight className="w-3.5 h-3.5 text-accent-yellow shrink-0 mt-0.5" />
                              <span className="font-mono text-ink/90">{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Attention & Clinical Flags */}
        {result.flags && result.flags.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-stone tracking-wider font-semibold">
              <AlertTriangle className="w-4 h-4 text-accent-red" />
              <span>Flags & Out-of-Range Observations ({result.flags.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {result.flags.map((flag, i) => {
                const isHigh = flag.severity === 'high';
                const isMod = flag.severity === 'moderate';
                const badgeColor = isHigh
                  ? 'bg-accent-red-soft text-accent-red border-accent-red/30'
                  : isMod
                  ? 'bg-accent-yellow-soft text-accent-yellow border-accent-yellow/30'
                  : 'bg-accent-blue-soft text-accent-blue border-accent-blue/30';

                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-surface border border-hairline flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-ink">{flag.title}</h4>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${badgeColor}`}
                        >
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-body leading-relaxed">{flag.explanation}</p>
                    </div>
                    {flag.relatedMetric && (
                      <div className="mt-3.5 pt-2 border-t border-hairline/60 text-xs text-mute flex items-center justify-between">
                        <span>Related Metric:</span>
                        <span className="font-mono font-medium text-ink">{flag.relatedMetric}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Key Metrics Grid */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-stone tracking-wider font-semibold">
            <Activity className="w-4 h-4 text-ink" />
            <span>Extracted Health Metrics ({result.metrics.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {result.metrics.map((metric, i) => {
              const statusColor = getStatusBadge(metric.status);

              return (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-surface border border-hairline flex flex-col justify-between shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-ink truncate block">
                      {metric.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${statusColor}`}
                    >
                      {metric.status}
                    </span>
                  </div>

                  <div className="my-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-mono">
                      {metric.value}
                    </span>
                    <span className="text-xs text-mute font-mono ml-1.5">{metric.unit}</span>
                  </div>

                  {metric.referenceRange && (
                    <div className="text-xs text-mute font-mono mt-1">
                      Ref: <span className="text-body font-medium">{metric.referenceRange}</span>
                    </div>
                  )}

                  {/* History sparkline / previous test dates */}
                  {metric.history && metric.history.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-hairline/60 flex items-center justify-between text-xs text-mute font-mono">
                      <span>History:</span>
                      <span className="text-body font-medium">
                        {metric.history.map((h) => `${h.date.slice(0, 7)}: ${h.value}`).join(' → ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Longitudinal Trends Visualization */}
        {trendableMetrics.length > 0 && (
          <section className="p-6 rounded-xl bg-surface border border-hairline space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-blue" />
                <h3 className="text-xs font-mono uppercase text-stone tracking-wider font-semibold">
                  Longitudinal Metric Trends Across Reports
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {trendableMetrics.map((tm, idx) => {
                const history = tm.history || [];
                const values = history.map((h) => Number(h.value)).filter((v) => !isNaN(v));
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min || 1;

                return (
                  <div key={idx} className="p-4 rounded-lg bg-surface-elevated border border-hairline">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-ink">{tm.name}</span>
                        <span className="text-xs text-mute ml-2 font-mono">({tm.unit})</span>
                      </div>
                      <span className="text-xs text-body font-mono">
                        {history[0].date} ({history[0].value}) → {history[history.length - 1].date} ({history[history.length - 1].value})
                      </span>
                    </div>

                    {/* Trendline Visualizer */}
                    <div className="h-16 w-full flex items-end gap-2 pt-2 px-1">
                      {history.map((point, pIdx) => {
                        const valNum = Number(point.value) || 0;
                        const heightPct = Math.max(20, Math.min(100, ((valNum - min) / range) * 80 + 20));
                        return (
                          <div key={pIdx} className="flex-1 flex flex-col items-center gap-1 group">
                            <span className="text-[10px] font-mono text-mute opacity-70 group-hover:opacity-100 font-medium">
                              {point.value}
                            </span>
                            <div className="w-full bg-surface-card rounded-t h-12 flex items-end">
                              <div
                                className="w-full bg-primary rounded-t transition-all group-hover:bg-accent-blue"
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-stone truncate max-w-full">
                              {point.date.slice(0, 7)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Actionable Doctor Discussion Points */}
        <section className="p-6 rounded-xl bg-surface border border-hairline space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-blue-soft text-accent-blue flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink tracking-tight">
                  Doctor Appointment Discussion Points & Inquiries
                </h3>
                <p className="text-xs text-mute">
                  Prioritized questions to review with your clinician, with clinical rationale and related lab markers
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyDoctorQuestions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-body bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md transition-colors font-medium shadow-sm"
              title="Copy questions to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-accent-green font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-mute" />
                  <span>Copy for Doctor</span>
                </>
              )}
            </button>
          </div>

          {/* Render Rich Discussion Points */}
          {result.discussionPoints && result.discussionPoints.length > 0 ? (
            <div className="space-y-3">
              {result.discussionPoints.map((dp, i) => {
                const urgencyBadgeClass = getUrgencyBadge(dp.urgency);
                return (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-surface-elevated border border-hairline space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs border font-medium ${urgencyBadgeClass}`}>
                          {dp.urgency.replace('_', ' ')}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-ink">
                          {dp.topic}
                        </span>
                      </div>

                      {dp.relatedMarkers && dp.relatedMarkers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {dp.relatedMarkers.map((rm, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-card text-mute border border-hairline font-medium"
                            >
                              {rm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Question text - High Contrast & Clean */}
                    <div className="pl-3.5 border-l-2 border-accent-blue/80 py-0.5">
                      <p className="text-sm sm:text-[15px] text-ink font-medium leading-relaxed">
                        "{dp.question}"
                      </p>
                    </div>

                    {/* Rationale / context */}
                    {dp.rationale && (
                      <div className="p-3 rounded-md bg-canvas/70 border border-hairline/60 text-xs text-mute flex items-start gap-2">
                        <span className="font-mono text-stone uppercase tracking-wider text-[10px] shrink-0 mt-0.5 font-semibold">
                          Rationale:
                        </span>
                        <span className="text-body leading-relaxed">{dp.rationale}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : result.recommendations && result.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="text-xs sm:text-sm text-body flex items-start gap-2.5 p-3 rounded-lg bg-surface-elevated border border-hairline">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone italic">No specific discussion points generated.</p>
          )}
        </section>

        {/* 7. Source Documents Traceability */}
        {analysis.source_documents && analysis.source_documents.length > 0 && (
          <section className="p-4 rounded-xl bg-surface border border-hairline text-xs">
            <div className="flex items-center gap-2 text-stone font-mono uppercase text-xs mb-2.5 font-semibold">
              <FileCheck2 className="w-4 h-4 text-accent-green" />
              <span>Source Documents Traceability ({analysis.source_documents.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.source_documents.map((sd) => (
                <div
                  key={sd.id}
                  className="px-3 py-1.5 rounded-md bg-surface-elevated border border-hairline font-mono text-xs text-body flex items-center gap-2"
                >
                  <span className="truncate max-w-[220px] font-medium text-ink">{sd.filename}</span>
                  <span className="text-stone">({(sd.file_size / 1024).toFixed(0)} KB)</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer footer */}
        <footer className="text-center text-xs text-stone py-4">
          MedBuddy is a private medical document organizer. Summary and extracted metrics do not replace professional medical judgment.
        </footer>
      </div>
    </div>
  );
};
