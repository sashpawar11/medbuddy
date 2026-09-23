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
  ChevronLeft,
  Copy,
  Check,
  Zap,
  Clock,
  GitCompare,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import type {
  AnalysisRecord,
  StructuredAnomaly,
  StructuredDiscussionPoint,
} from '../../../shared/types';
import { MetricCard } from '../common/MetricCard';
import { ProvenancePill } from '../common/ProvenancePill';
import { DisclaimerBar } from '../common/DisclaimerBar';
import { StatusChip } from '../common/StatusChip';
import { Button } from '../common/Button';

interface Props {
  analysis: AnalysisRecord;
  onBack?: () => void;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
}

/** Date formatter per §4.3: "Mar 12, 2024" */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const OverviewDashboard: React.FC<Props> = ({ analysis, onBack, onRegenerate, onDelete }) => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics with multiple history points for trend lines
  const trendableMetrics = result.metrics.filter(
    (m) => m.history && m.history.length > 1
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto print:overflow-visible print:bg-white select-none font-sans">
      {/* Top Action Bar */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface sticky top-0 z-20 print:hidden">
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
          <div className="flex items-center gap-2.5">
            <span className="text-body font-semibold text-primary truncate max-w-[240px]">
              {analysis.scope_name || 'Health Synthesis'}
            </span>
            <span className="text-caption text-tertiary tabular-nums font-mono">
              {formatDate(analysis.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Print Overview
          </Button>
        </div>
      </header>

      {/* Main Content Area: Max reading width 840px centered per §5.2 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[840px] mx-auto px-6 py-8 space-y-6">
          {/* 1. Header & Synthesis Narrative Card */}
          <section className="p-6 rounded-md bg-surface border border-border space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-h1 font-semibold text-primary">
                    Executive Health Summary
                  </h1>
                </div>
                <p className="text-small text-secondary">
                  Synthesized across {analysis.source_documents?.length || 0} clinical documents in vault
                </p>
              </div>

              {/* Provenance Pill near title per §11.1 */}
              <div className="flex items-center gap-2">
                <ProvenancePill
                  kind={analysis.provider_name?.toLowerCase().includes('cloud') || analysis.provider_name?.toLowerCase().includes('openai') ? 'cloud' : 'local'}
                  providerName={analysis.provider_name}
                  modelName={analysis.model_name}
                />
              </div>
            </div>

            {/* Quick Numeric Summary Strip (§4.3 tabular figures) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary block">
                  Tracked Markers
                </span>
                <span className="text-metric-sm font-bold tabular-nums text-primary mt-0.5 block">
                  {result.metrics.length}
                </span>
              </div>
              <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary block">
                  Flagged
                </span>
                <span className={`text-metric-sm font-bold tabular-nums mt-0.5 block ${
                  result.flags?.length ? 'text-clay-600' : 'text-sage-600'
                }`}>
                  {result.flags?.length || 0}
                </span>
              </div>
              <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary block">
                  Anomalies
                </span>
                <span className="text-metric-sm font-bold tabular-nums text-primary mt-0.5 block">
                  {result.anomalies?.length || 0}
                </span>
              </div>
              <div className="p-3 bg-surface-recessed rounded-sm border border-border">
                <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary block">
                  Discussion Points
                </span>
                <span className="text-metric-sm font-bold tabular-nums text-primary mt-0.5 block">
                  {result.discussionPoints?.length || result.recommendations?.length || 0}
                </span>
              </div>
            </div>

            {/* Narrative text: Calm, generous line-height per §4.2 */}
            <div className="p-4 bg-app rounded-sm border border-border">
              <p className="text-body text-primary leading-[24px] whitespace-pre-line font-normal select-text">
                {result.summary}
              </p>
            </div>

            {/* Key Highlights */}
            {result.keyHighlights && result.keyHighlights.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary">
                  Key Takeaways
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {result.keyHighlights.map((hl, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-sm bg-surface-recessed border border-border text-small text-secondary flex items-start gap-2.5 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-vault-600 mt-2 shrink-0" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 2. Flags & Out-of-Range Clinical Findings */}
          {result.flags && result.flags.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-clay-600" strokeWidth={1.75} />
                <h2 className="text-h2 font-semibold text-primary">
                  Clinical Flags &amp; Out-of-Range Values ({result.flags.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.flags.map((flag, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-surface border border-border/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-h3 font-semibold text-primary">{flag.title}</h4>
                        <StatusChip
                          status={flag.severity === 'high' ? 'flagged' : 'borderline'}
                          label={flag.severity}
                        />
                      </div>
                      <p className="text-small text-secondary leading-relaxed mt-1">{flag.explanation}</p>
                    </div>
                    {flag.relatedMetric && (
                      <div className="mt-3 pt-2 border-t border-border text-caption text-tertiary flex items-center justify-between">
                        <span>Related Biomarker:</span>
                        <span className="font-mono text-primary font-medium">{flag.relatedMetric}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. Biomarker Metric Cards Grid (§9.4) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
              <h2 className="text-h2 font-semibold text-primary">
                Extracted Health Metrics ({result.metrics.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.metrics.map((m, i) => (
                <MetricCard
                  key={i}
                  name={m.name}
                  value={m.value}
                  unit={m.unit}
                  status={m.status}
                  referenceRange={m.referenceRange}
                  history={m.history}
                />
              ))}
            </div>
          </section>

          {/* 4. Longitudinal Trends Visualization (§10) */}
          {trendableMetrics.length > 0 && (
            <section className="p-6 rounded-md bg-surface border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-vault-600" strokeWidth={1.75} />
                  <h2 className="text-h2 font-semibold text-primary">
                    Longitudinal Trends
                  </h2>
                </div>
              </div>

              <div className="space-y-6">
                {trendableMetrics.map((tm, idx) => {
                  const history = tm.history || [];
                  const values = history.map((h) => Number(h.value)).filter((v) => !isNaN(v));
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const chartW = 760;
                  const chartH = 120;
                  const padX = 24;
                  const padY = 20;

                  const points = values.map((val, pIdx) => {
                    const x = padX + (pIdx / (values.length - 1)) * (chartW - padX * 2);
                    const y = chartH - padY - ((val - min) / range) * (chartH - padY * 2);
                    return { x, y, val, date: history[pIdx].date };
                  });

                  return (
                    <div key={idx} className="p-4 rounded-sm bg-surface-recessed border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-body font-semibold text-primary">{tm.name}</span>
                          <span className="text-caption text-tertiary ml-2 font-mono">({tm.unit})</span>
                        </div>
                        <span className="text-caption font-mono text-secondary tabular-nums">
                          {formatDate(history[0].date)} ({history[0].value}) → {formatDate(history[history.length - 1].date)} ({history[history.length - 1].value})
                        </span>
                      </div>

                      {/* SVG Trend Line per §10: 2px line, status colored dots, horizontal gridlines */}
                      <div className="w-full overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${chartW} ${chartH}`}
                          className="w-full h-28 overflow-visible"
                        >
                          {/* Soft reference range band (§10) */}
                          <rect
                            x={padX}
                            y={padY + 15}
                            width={chartW - padX * 2}
                            height={chartH - padY * 2 - 30}
                            fill="var(--chart-band-bg)"
                            rx={4}
                          />

                          {/* Horizontal gridlines only (§10) */}
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

                          {/* Primary Trend Line (§10: 2px stroke, vault-600) */}
                          <polyline
                            fill="none"
                            stroke="var(--vault-600)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                          />

                          {/* Data points marked with small filled circles (4px), colored by status (§10) */}
                          {points.map((p, pIdx) => {
                            const isEnd = pIdx === points.length - 1;
                            const dotColor = isEnd
                              ? tm.status === 'flagged'
                                ? 'var(--clay-600)'
                                : tm.status === 'borderline'
                                ? 'var(--amber-600)'
                                : 'var(--sage-600)'
                              : 'var(--vault-600)';

                            return (
                              <g key={pIdx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={4}
                                  fill={dotColor}
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  textAnchor="middle"
                                  className="text-[10px] font-mono fill-ink-700"
                                >
                                  {p.val}
                                </text>
                                <text
                                  x={p.x}
                                  y={chartH - 4}
                                  textAnchor="middle"
                                  className="text-[10px] font-mono fill-ink-500"
                                >
                                  {p.date.slice(0, 7)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Screen-reader accessible adjacent data table per §13 */}
                      <table className="sr-only">
                        <caption>{tm.name} historical trend values</caption>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Value</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h, hIdx) => (
                            <tr key={hIdx}>
                              <td>{h.date}</td>
                              <td>{h.value}</td>
                              <td>{tm.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. Cross-Record Anomalies & Clinical Observations */}
          {result.anomalies && result.anomalies.length > 0 && (
            <section className="p-6 rounded-md bg-surface border border-border space-y-4">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                <h2 className="text-h2 font-semibold text-primary">
                  Cross-Record Discrepancies &amp; Anomalies ({result.anomalies.length})
                </h2>
              </div>

              <div className="space-y-3">
                {result.anomalies.map((anom, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-sm bg-surface-recessed border border-border space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-caption uppercase font-medium text-tertiary">
                          {anom.category.replace('_', ' ')}
                        </span>
                        <StatusChip
                          status={anom.severity === 'high' ? 'flagged' : 'borderline'}
                          label={`${anom.severity} Impact`}
                        />
                      </div>
                      {anom.relatedDocuments && anom.relatedDocuments.length > 0 && (
                        <span className="text-caption text-tertiary font-mono">
                          Ref: {anom.relatedDocuments.join(', ')}
                        </span>
                      )}
                    </div>

                    <h4 className="text-body font-semibold text-primary">{anom.title}</h4>
                    <p className="text-small text-secondary leading-relaxed">{anom.observation}</p>

                    {anom.pinpointNotes && anom.pinpointNotes.length > 0 && (
                      <div className="p-3 bg-surface rounded-sm border border-border space-y-1">
                        <span className="text-caption uppercase tracking-[0.02em] font-medium text-tertiary block">
                          Pinpoint Citations:
                        </span>
                        <ul className="space-y-1">
                          {anom.pinpointNotes.map((note, nIdx) => (
                            <li key={nIdx} className="text-caption text-secondary flex items-start gap-1.5">
                              <ArrowUpRight className="w-3.5 h-3.5 text-vault-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                              <span className="font-mono text-primary">{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Actionable Doctor Discussion Points */}
          <section className="p-6 rounded-md bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-h2 font-semibold text-primary">
                    Questions for Your Healthcare Provider
                  </h2>
                  <p className="text-small text-secondary">
                    Prioritized topics and clinical questions prepared for your appointment
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyDoctorQuestions}
                icon={copied ? <Check className="w-3.5 h-3.5 text-sage-600" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.75} />}
              >
                {copied ? 'Copied' : 'Copy for Doctor'}
              </Button>
            </div>

            {result.discussionPoints && result.discussionPoints.length > 0 ? (
              <div className="space-y-3">
                {result.discussionPoints.map((dp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-sm bg-surface-recessed border border-border space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusChip
                          status={dp.urgency === 'priority' ? 'flagged' : dp.urgency === 'follow_up' ? 'borderline' : 'normal'}
                          label={dp.urgency.replace('_', ' ')}
                        />
                        <span className="text-body font-semibold text-primary">{dp.topic}</span>
                      </div>

                      {dp.relatedMarkers && dp.relatedMarkers.length > 0 && (
                        <div className="flex items-center gap-1">
                          {dp.relatedMarkers.map((rm, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-caption font-mono px-2 py-0.5 rounded-sm bg-surface text-tertiary border border-border"
                            >
                              {rm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pl-3.5 border-l-2 border-vault-600 py-0.5">
                      <p className="text-body font-medium text-primary leading-relaxed">
                        "{dp.question}"
                      </p>
                    </div>

                    {dp.rationale && (
                      <p className="text-small text-secondary leading-relaxed">
                        <strong className="text-primary font-medium">Rationale:</strong> {dp.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small text-tertiary italic">No specific discussion points recorded.</p>
            )}
          </section>

          {/* 7. Source Documents Traceability */}
          {analysis.source_documents && analysis.source_documents.length > 0 && (
            <section className="p-4 rounded-md bg-surface border border-border text-small">
              <div className="flex items-center gap-2 text-tertiary uppercase text-caption font-medium mb-2.5 tracking-[0.02em]">
                <FileCheck2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Source Records ({analysis.source_documents.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.source_documents.map((sd) => (
                  <div
                    key={sd.id}
                    className="px-2.5 py-1.5 rounded-sm bg-surface-recessed border border-border font-mono text-caption text-primary flex items-center gap-2"
                  >
                    <span className="truncate max-w-[240px]">{sd.filename}</span>
                    <span className="text-tertiary tabular-nums">({(sd.file_size / 1024).toFixed(0)} KB)</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Persistent Disclaimer Bar per §9.14 */}
      <DisclaimerBar />
    </div>
  );
};
