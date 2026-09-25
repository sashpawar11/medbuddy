import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { TimelineEvent } from '../../../shared/types';
import { TimelineBiomarkerSparkline } from './TimelineBiomarkerSparkline';

export interface TimelineNodeProps {
  event: TimelineEvent;
  isLast?: boolean;
  onViewSource?: (analysisId: string) => void;
  onPreviewDoc?: (docId: string) => void;
  onFocusBiomarker?: (biomarkerName: string) => void;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TrendIcon: React.FC<{ direction?: 'up' | 'down' | 'stable'; status?: string }> = ({ direction, status }) => {
  if (!direction || direction === 'stable') return <Minus className="w-3 h-3 text-tertiary dark:text-ink-400" />;
  // Trend direction coloring depends on context — up is not always bad
  // We color by the metric status instead
  const colorClass = status === 'flagged' ? 'text-clay-600 dark:text-clay-400' :
    status === 'borderline' ? 'text-amber-600 dark:text-amber-400' :
    'text-tertiary dark:text-ink-400';
  if (direction === 'up') return <TrendingUp className={`w-3 h-3 ${colorClass}`} />;
  return <TrendingDown className={`w-3 h-3 ${colorClass}`} />;
};

export const TimelineNode: React.FC<TimelineNodeProps> = ({
  event,
  isLast,
  onViewSource,
  onPreviewDoc,
  onFocusBiomarker,
}) => {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = formatDate(event.date);
  const isAnomaly = event.type === 'anomaly';

  // Count child severities for the report header badge
  const childFlaggedCount = event.childEvents?.filter(c => c.severity === 'flagged').length || 0;
  const childBorderlineCount = event.childEvents?.filter(c => c.severity === 'borderline').length || 0;
  const childNormalCount = event.childEvents?.filter(c => c.severity === 'normal').length || 0;

  const getDotStyle = () => {
    if (isAnomaly) {
      const color = event.severity === 'flagged' ? 'bg-clay-600' : 'bg-amber-600';
      return `w-3 h-3 rotate-45 ${color}`;
    }
    switch (event.severity) {
      case 'flagged':
        return 'w-2.5 h-2.5 rounded-full bg-clay-600 ring-2 ring-clay-200 dark:ring-clay-900';
      case 'borderline':
        return 'w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-200 dark:ring-amber-900';
      case 'normal':
        return 'w-2 h-2 rounded-full bg-sage-600';
      default:
        return 'w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600';
    }
  };

  const renderReportContent = () => (
    <div className="bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out overflow-hidden">
      {/* Report Header */}
      <div className="p-5 pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-body font-bold text-primary dark:text-ink-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-vault-600 dark:text-vault-400 shrink-0" strokeWidth={2} />
              <span className="truncate">{event.title}</span>
            </div>
            {event.subtitle && (
              <div className="text-caption text-tertiary dark:text-ink-400 mt-1 pl-6">{event.subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mini severity summary */}
            {event.childEvents && event.childEvents.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                {childNormalCount > 0 && <span className="text-sage-600">●{childNormalCount}</span>}
                {childBorderlineCount > 0 && <span className="text-amber-600">▲{childBorderlineCount}</span>}
                {childFlaggedCount > 0 && <span className="text-clay-600">✕{childFlaggedCount}</span>}
              </div>
            )}
            <span className="text-caption text-tertiary dark:text-ink-400 font-mono tabular-nums">
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Biomarker Section */}
      {event.childEvents && event.childEvents.length > 0 && (
        <div className="border-t border-border dark:border-ink-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-caption font-medium text-secondary dark:text-ink-300 hover:bg-surface-hover dark:hover:bg-ink-800/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide findings' : `${event.childEvents.length} findings & markers`}
            </span>
            {!expanded && childFlaggedCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-clay-100 dark:bg-clay-950/60 text-clay-700 dark:text-clay-300 border border-clay-200 dark:border-clay-800">
                <AlertTriangle className="w-2.5 h-2.5" />
                {childFlaggedCount} flagged
              </span>
            )}
          </button>

          {expanded && (
            <div className="px-5 pb-4 space-y-1">
              {event.childEvents.map(child => {
                if (child.type === 'biomarker' && child.metric) {
                  const statusColor = child.metric.status === 'flagged' ? 'bg-clay-600' :
                    child.metric.status === 'borderline' ? 'bg-amber-600' :
                    'bg-sage-600';
                  const statusTextColor = child.metric.status === 'flagged'
                    ? 'text-clay-600 dark:text-clay-400'
                    : child.metric.status === 'borderline'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-primary dark:text-ink-100';

                  return (
                    <div
                      key={child.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-recessed dark:hover:bg-ink-800/40 transition-colors group/bio"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0`} />
                        <span className="text-small text-secondary dark:text-ink-300 truncate">
                          {child.metric.name}
                        </span>
                        {child.metric.referenceRange && (
                          <span className="text-[10px] font-mono text-tertiary dark:text-ink-400 hidden group-hover/bio:inline-flex">
                            ref: {child.metric.referenceRange}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {child.metric.history && child.metric.history.length > 1 && (
                          <TimelineBiomarkerSparkline
                            history={child.metric.history}
                            referenceRange={child.metric.referenceRange}
                            status={child.metric.status}
                            className="hidden md:inline-flex mr-1"
                          />
                        )}
                        <TrendIcon direction={child.metric.trendDirection} status={child.metric.status} />
                        {child.metric.previousValue !== undefined && (
                          <span className="text-[10px] font-mono text-tertiary dark:text-ink-400">
                            {child.metric.previousValue}→
                          </span>
                        )}
                        <span className={`text-small font-mono tabular-nums font-semibold ${statusTextColor}`}>
                          {child.metric.value}
                        </span>
                        <span className="text-[11px] text-tertiary dark:text-ink-400">
                          {child.metric.unit}
                        </span>
                        {onFocusBiomarker && (
                          <button
                            onClick={() => onFocusBiomarker(child.metric!.name)}
                            className="opacity-0 group-hover/bio:opacity-100 p-0.5 text-tertiary hover:text-vault-600 transition-opacity"
                            title={`Track ${child.metric.name} over time`}
                          >
                            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                if (child.type === 'flag') {
                  return (
                    <div key={child.id} className="flex items-center gap-2 py-1.5 px-2 text-small">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${child.severity === 'flagged' ? 'text-clay-600 dark:text-clay-400' : 'text-amber-600 dark:text-amber-400'}`} />
                      <span className="text-secondary dark:text-ink-300">{child.title}</span>
                      {child.finding?.severity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${
                          child.finding.severity === 'high' ? 'bg-clay-100 dark:bg-clay-950/60 text-clay-700 dark:text-clay-300' :
                          'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {child.finding.severity}
                        </span>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Source Document & Report Links */}
      {(event.sourceDocumentFilename || event.sourceAnalysisId) && (
        <div className="px-5 py-3 border-t border-border dark:border-ink-800 bg-surface-recessed/50 dark:bg-ink-800/30 flex flex-wrap gap-4">
          {event.sourceDocumentFilename && (
            <button
              onClick={() => event.sourceDocumentId && onPreviewDoc?.(event.sourceDocumentId)}
              className="flex items-center gap-1.5 text-caption font-medium text-vault-600 dark:text-vault-400 hover:underline transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {event.sourceDocumentFilename}
            </button>
          )}
          {event.sourceAnalysisId && (
            <button
              onClick={() => event.sourceAnalysisId && onViewSource?.(event.sourceAnalysisId)}
              className="flex items-center gap-1.5 text-caption font-medium text-vault-600 dark:text-vault-400 hover:underline transition-colors"
            >
              <Activity className="w-3 h-3" strokeWidth={2} />
              View Full Report
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderAnomalyContent = () => {
    const isFlagged = event.severity === 'flagged';
    const borderColor = isFlagged ? 'border-l-clay-500' : 'border-l-amber-500';
    const iconColor = isFlagged ? 'text-clay-500 dark:text-clay-400' : 'text-amber-500 dark:text-amber-400';
    const badgeClasses = isFlagged
      ? 'bg-clay-100 dark:bg-clay-950/60 text-clay-700 dark:text-clay-300 border-clay-200 dark:border-clay-800'
      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';

    return (
      <div className={`bg-surface dark:bg-ink-900 rounded-xl border border-border dark:border-ink-800 border-l-[3px] ${borderColor} shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out overflow-hidden`}>
        <div className="p-5">
          <div className="flex gap-3">
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              <Zap className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {event.finding?.category && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-tertiary dark:text-ink-400">
                        {event.finding.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase border ${badgeClasses}`}>
                      {isFlagged ? 'High' : 'Moderate'}
                    </span>
                  </div>
                  <h4 className="text-body font-bold text-primary dark:text-ink-100">
                    {event.title}
                  </h4>
                </div>
                <span className="text-caption text-tertiary dark:text-ink-400 font-mono tabular-nums shrink-0">
                  {formattedDate}
                </span>
              </div>

              {event.finding?.explanation && (
                <p className="mt-2 text-small text-secondary dark:text-ink-300 leading-relaxed">
                  {event.finding.explanation}
                </p>
              )}

              {event.finding?.pinpointNotes && event.finding.pinpointNotes.length > 0 && (
                <div className="mt-3 p-3 bg-surface-recessed dark:bg-ink-800/60 rounded-lg border border-border dark:border-ink-800 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-tertiary dark:text-ink-400 block">
                    Pinpoint Citations
                  </span>
                  {event.finding.pinpointNotes.map((note, idx) => (
                    <div key={idx} className="flex gap-2 text-small text-secondary dark:text-ink-300 items-start">
                      <ArrowUpRight className="w-3 h-3 text-vault-600 dark:text-vault-400 shrink-0 mt-0.5" strokeWidth={2} />
                      <span className="font-mono text-[12px]">{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFlagContent = () => {
    const isFlagged = event.severity === 'flagged';
    const borderColor = isFlagged ? 'border-l-clay-500' : 'border-l-amber-500';
    const iconColor = isFlagged ? 'text-clay-500 dark:text-clay-400' : 'text-amber-500 dark:text-amber-400';

    return (
      <div className={`bg-surface dark:bg-ink-900 rounded-lg border border-border dark:border-ink-800 border-l-[3px] ${borderColor} p-4 shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out`}>
        <div className="flex justify-between items-start gap-3 mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 shrink-0 ${iconColor}`} strokeWidth={2} />
            <span className="text-small font-semibold text-primary dark:text-ink-100">{event.title}</span>
          </div>
          <span className="text-caption text-tertiary dark:text-ink-400 font-mono tabular-nums shrink-0">
            {formattedDate}
          </span>
        </div>
        {event.finding?.explanation && (
          <p className="text-small text-secondary dark:text-ink-300 ml-6 leading-relaxed">{event.finding.explanation}</p>
        )}
      </div>
    );
  };

  const renderBiomarkerContent = () => {
    if (!event.metric) return null;
    const statusColor = event.metric.status === 'flagged' ? 'bg-clay-600' :
      event.metric.status === 'borderline' ? 'bg-amber-600' :
      'bg-sage-600';
    const statusTextColor = event.metric.status === 'flagged'
      ? 'text-clay-600 dark:text-clay-400'
      : event.metric.status === 'borderline'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-primary dark:text-ink-100';

    return (
      <div className="bg-surface dark:bg-ink-900 rounded-lg border border-border dark:border-ink-800 p-3.5 flex justify-between items-center shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
          <span className="text-small font-semibold text-primary dark:text-ink-100 truncate">{event.metric.name}</span>
          <span className="text-caption text-tertiary dark:text-ink-400 font-mono tabular-nums shrink-0">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.metric.history && event.metric.history.length > 1 && (
            <TimelineBiomarkerSparkline
              history={event.metric.history}
              referenceRange={event.metric.referenceRange}
              status={event.metric.status}
              className="hidden md:inline-flex mr-1"
            />
          )}
          <TrendIcon direction={event.metric.trendDirection} status={event.metric.status} />
          {event.metric.previousValue !== undefined && (
            <span className="text-[10px] font-mono text-tertiary dark:text-ink-400">
              {event.metric.previousValue}→
            </span>
          )}
          <span className={`text-body font-mono tabular-nums font-bold ${statusTextColor}`}>
            {event.metric.value}
          </span>
          <span className="text-caption text-tertiary dark:text-ink-400">{event.metric.unit}</span>
        </div>
      </div>
    );
  };

  const renderMilestoneContent = () => (
    <div className="bg-surface dark:bg-ink-900 rounded-lg border border-border dark:border-ink-800 p-3.5 flex justify-between items-center gap-4 shadow-xs hover:border-border-strong dark:hover:border-ink-700 transition-[border-color] duration-100 ease-out">
      <span className="text-small font-semibold text-primary dark:text-ink-100 truncate">{event.title}</span>
      <span className="text-caption text-tertiary dark:text-ink-400 font-mono tabular-nums shrink-0">
        {formattedDate}
      </span>
    </div>
  );

  const renderContent = () => {
    switch (event.type) {
      case 'report': return renderReportContent();
      case 'anomaly': return renderAnomalyContent();
      case 'flag': return renderFlagContent();
      case 'biomarker': return renderBiomarkerContent();
      default: return renderMilestoneContent();
    }
  };

  return (
    <div className="flex select-none relative group">
      {/* Left column — dot indicator positioned over the parent border-l */}
      <div className="w-6 flex flex-col items-center shrink-0 relative">
        <div className="h-6 flex items-center justify-center mt-4">
          <div className={getDotStyle()} />
        </div>
        {!isLast && <div className="flex-1 w-px bg-border dark:bg-ink-800 my-1" />}
      </div>

      {/* Right column — event card */}
      <div className="flex-1 pb-6 pr-4 pt-1 min-w-0">
        {renderContent()}
      </div>
    </div>
  );
};
