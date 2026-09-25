import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { TimelineData, TimelineEvent } from '../../../shared/types';

interface MiniTimelineProps {
  timelineData: TimelineData;
  onViewFullTimeline: () => void;
  onViewAnalysis?: (analysisId: string) => void;
}

export const MiniTimeline: React.FC<MiniTimelineProps> = ({
  timelineData,
  onViewFullTimeline,
  onViewAnalysis
}) => {
  const events = timelineData.events || [];
  const displayEvents = events.slice(0, 6);
  const remainingCount = events.length > 6 ? events.length - 6 : 0;

  const getSeverityColor = (severity: TimelineEvent['severity'], type: TimelineEvent['type']) => {
    if (type === 'anomaly') return 'bg-vault-600';
    switch (severity) {
      case 'normal': return 'bg-sage-600';
      case 'borderline': return 'bg-amber-600';
      case 'flagged': return 'bg-clay-600';
      case 'info': return 'bg-vault-600';
      default: return 'bg-border dark:bg-ink-800';
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (event.sourceAnalysisId && onViewAnalysis) {
      onViewAnalysis(event.sourceAnalysisId);
    }
  };

  // Format date gracefully, falling back to string if invalid
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <section className="rounded-md bg-surface border border-border p-5 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-h3 font-semibold text-primary">Health Chronicle</h3>
        </div>
        <button 
          onClick={onViewFullTimeline}
          className="text-caption text-vault-600 hover:underline font-medium flex items-center"
        >
          View full timeline <ChevronRight className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {events.length > 0 && (
        <div className="flex flex-row items-center gap-2 mb-4 text-caption text-tertiary">
          <span>{timelineData.stats.totalEvents} events</span>
          <span>&middot;</span>
          <span>{timelineData.stats.totalReports} reports</span>
          <span>&middot;</span>
          <span>{timelineData.stats.flaggedCount} flagged</span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="py-6 text-center text-small text-secondary">
          No timeline events yet. Generate health reports to build your medical chronicle.
        </div>
      ) : (
        <div className="ml-3 border-l-2 border-border dark:border-ink-800 relative">
          {displayEvents.map((event, idx) => {
            const hasChildren = event.childEvents && event.childEvents.length > 0;
            return (
              <div 
                key={event.id || idx}
                onClick={() => handleEventClick(event)}
                className={`py-2.5 pl-6 relative hover:bg-surface-hover rounded-r-md transition ${event.sourceAnalysisId ? 'cursor-pointer' : ''}`}
              >
                {/* Timeline dot */}
                <div 
                  className={`absolute left-[-5px] top-[14px] w-2 h-2 rounded-full ${getSeverityColor(event.severity, event.type)}`}
                />
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption text-tertiary font-mono tabular-nums">
                    {formatDate(event.date)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-small font-medium text-primary truncate">
                      {event.title}
                    </span>
                    {event.type === 'report' && hasChildren && (
                      <span className="text-caption text-tertiary whitespace-nowrap">
                        ({event.childEvents!.length} markers)
                      </span>
                    )}
                  </div>
                  {event.subtitle && (
                    <span className="text-caption text-secondary truncate">
                      {event.subtitle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {remainingCount > 0 && (
        <div className="mt-4 pl-3">
          <button 
            onClick={onViewFullTimeline}
            className="text-small text-vault-600 hover:underline font-medium"
          >
            + {remainingCount} more events
          </button>
        </div>
      )}
    </section>
  );
};
