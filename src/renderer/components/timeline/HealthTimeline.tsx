import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  ChevronLeft, 
  AlertTriangle, 
  FileText, 
  FlaskConical, 
  Zap, 
  Filter,
  Printer,
  Search,
  X,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import type { TimelineEvent, TimelineData } from '../../../shared/types';
import { TimelineNode } from './TimelineNode';
import { DisclaimerBar } from '../common/DisclaimerBar';
import { Button } from '../common/Button';
import { 
  groupEventsByYear, 
  filterEventsByDateRange, 
  filterEventsByType, 
  filterEventsBySeverity 
} from '../../utils/buildTimeline';

interface HealthTimelineProps {
  timelineData: TimelineData;
  onBack?: () => void;
  onViewAnalysis?: (analysisId: string) => void;
  onPreviewDoc?: (docId: string) => void;
}

export const HealthTimeline: React.FC<HealthTimelineProps> = ({
  timelineData,
  onBack,
  onViewAnalysis,
  onPreviewDoc,
}) => {
  const [zoomRange, setZoomRange] = useState<'all' | '1y' | '6m' | '3m'>('all');
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedBiomarker, setFocusedBiomarker] = useState<string | null>(null);

  const handleFilterClick = (filter: 'all' | 'reports' | 'flagged' | 'anomalies') => {
    if (filter === 'all') {
      setTypeFilter(new Set());
      setSeverityFilter(new Set());
    } else if (filter === 'reports') {
      setTypeFilter(new Set(['report']));
      setSeverityFilter(new Set());
    } else if (filter === 'flagged') {
      setTypeFilter(new Set());
      setSeverityFilter(new Set(['flagged', 'high']));
    } else if (filter === 'anomalies') {
      setTypeFilter(new Set(['anomaly']));
      setSeverityFilter(new Set());
    }
  };

  const activeFilter = useMemo(() => {
    if (typeFilter.size === 0 && severityFilter.size === 0) return 'all';
    if (typeFilter.has('report')) return 'reports';
    if (severityFilter.has('flagged')) return 'flagged';
    if (typeFilter.has('anomaly')) return 'anomalies';
    return 'all';
  }, [typeFilter, severityFilter]);

  // Extract all distinct biomarker readings across all events for focus mode
  const biomarkerReadingsMap = useMemo(() => {
    const map = new Map<string, Array<{ date: string; value: number | string; unit: string; status: string; refRange?: string }>>();

    timelineData.events.forEach((evt) => {
      // Direct biomarker event
      if (evt.type === 'biomarker' && evt.metric) {
        const name = evt.metric.name;
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push({
          date: evt.date,
          value: evt.metric.value,
          unit: evt.metric.unit,
          status: evt.metric.status,
          refRange: evt.metric.referenceRange,
        });
      }

      // Biomarkers nested under reports
      if (evt.childEvents) {
        evt.childEvents.forEach((child) => {
          if (child.type === 'biomarker' && child.metric) {
            const name = child.metric.name;
            if (!map.has(name)) map.set(name, []);
            map.get(name)!.push({
              date: child.date || evt.date,
              value: child.metric.value,
              unit: child.metric.unit,
              status: child.metric.status,
              refRange: child.metric.referenceRange,
            });
          }
        });
      }
    });

    return map;
  }, [timelineData.events]);

  const focusedBiomarkerData = useMemo(() => {
    if (!focusedBiomarker) return null;
    const readings = biomarkerReadingsMap.get(focusedBiomarker) || [];
    const sorted = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      name: focusedBiomarker,
      readings: sorted,
      unit: sorted[0]?.unit || '',
      refRange: sorted.find((r) => r.refRange)?.refRange,
    };
  }, [focusedBiomarker, biomarkerReadingsMap]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let events = timelineData.events || [];

    // Focus biomarker filter
    if (focusedBiomarker) {
      const lower = focusedBiomarker.toLowerCase();
      events = events.filter((e) => {
        if (e.type === 'biomarker' && e.metric?.name.toLowerCase() === lower) return true;
        if (e.type === 'report' && e.childEvents) {
          return e.childEvents.some((c) => c.metric?.name.toLowerCase() === lower);
        }
        return false;
      });
    }

    // Zoom range
    if (zoomRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (zoomRange === '1y') startDate.setFullYear(now.getFullYear() - 1);
      if (zoomRange === '6m') startDate.setMonth(now.getMonth() - 6);
      if (zoomRange === '3m') startDate.setMonth(now.getMonth() - 3);
      events = filterEventsByDateRange(events, startDate, now);
    }

    // Type filter
    if (typeFilter.size > 0) {
      events = filterEventsByType(events, typeFilter);
    }

    // Severity filter
    if (severityFilter.size > 0) {
      events = filterEventsBySeverity(events, severityFilter);
    }

    // Keyword Search query
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      events = events.filter((e) => {
        if (e.title.toLowerCase().includes(query)) return true;
        if (e.subtitle?.toLowerCase().includes(query)) return true;
        if (e.finding?.explanation.toLowerCase().includes(query)) return true;
        if (e.metric?.name.toLowerCase().includes(query)) return true;
        if (e.childEvents?.some((c) => 
          c.title.toLowerCase().includes(query) || 
          c.metric?.name.toLowerCase().includes(query) ||
          c.finding?.explanation.toLowerCase().includes(query)
        )) return true;
        return false;
      });
    }

    return events;
  }, [timelineData.events, zoomRange, typeFilter, severityFilter, searchQuery, focusedBiomarker]);

  const eventsByYear = useMemo(() => groupEventsByYear(filteredEvents), [filteredEvents]);
  const years = Array.from(eventsByYear.keys()).sort((a, b) => b - a);

  // Stats
  const { totalEvents, totalReports, flaggedCount, trackedBiomarkers } = timelineData.stats;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto print:overflow-visible print:bg-white select-none font-sans">
      {/* 1. Header Bar */}
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
          <h1 className="text-body font-semibold text-primary dark:text-ink-100 flex items-center gap-2">
            <span>Health Chronicle</span>
            <span className="text-tertiary dark:text-ink-400 font-normal">•</span>
            <span className="text-secondary dark:text-ink-300 font-medium">{timelineData.memberName}</span>
          </h1>
        </div>

        {/* 2. Stat Chips Row & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
              <Activity className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" />
              <span className="text-caption font-semibold text-primary dark:text-ink-100 tabular-nums">
                {totalEvents} <span className="text-tertiary font-normal">Events</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
              <FileText className="w-3.5 h-3.5 text-primary dark:text-ink-300" />
              <span className="text-caption font-semibold text-primary dark:text-ink-100 tabular-nums">
                {totalReports} <span className="text-tertiary font-normal">Reports</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
              <AlertTriangle className={`w-3.5 h-3.5 ${flaggedCount > 0 ? 'text-clay-600 dark:text-clay-400' : 'text-sage-600 dark:text-sage-400'}`} />
              <span className="text-caption font-semibold text-primary dark:text-ink-100 tabular-nums">
                {flaggedCount} <span className="text-tertiary font-normal">Flagged</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 shadow-xs">
              <FlaskConical className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" />
              <span className="text-caption font-semibold text-primary dark:text-ink-100 tabular-nums">
                {trackedBiomarkers} <span className="text-tertiary font-normal">Biomarkers</span>
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Print
          </Button>
        </div>
      </header>

      {/* 3. Filter & Search Controls Bar */}
      <div className="px-6 py-3 border-b border-border dark:border-ink-800 bg-surface/80 dark:bg-ink-900/80 sticky top-14 z-10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Left: Timeframe Zoom Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-caption font-medium text-tertiary dark:text-ink-400 mr-1.5">Timeframe:</span>
          {(['all', '1y', '6m', '3m'] as const).map((zoom) => (
            <button
              key={zoom}
              onClick={() => setZoomRange(zoom)}
              className={`px-2.5 py-1 rounded-full text-caption font-medium border transition-colors ${
                zoomRange === zoom 
                  ? 'bg-vault-50 dark:bg-vault-950/60 border-vault-300 dark:border-vault-700 text-vault-700 dark:text-vault-300 font-semibold'
                  : 'bg-surface dark:bg-ink-900 border-border dark:border-ink-800 text-secondary dark:text-ink-300 hover:text-primary'
              }`}
            >
              {zoom === 'all' ? 'All Time' : zoom === '1y' ? '1 Year' : zoom === '6m' ? '6 Months' : '3 Months'}
            </button>
          ))}
        </div>

        {/* Center: Search Field */}
        <div className="relative min-w-[200px] max-w-[280px] flex-1">
          <Search className="w-3.5 h-3.5 text-tertiary dark:text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chronicle..."
            className="w-full pl-8 pr-8 py-1 rounded-md bg-surface-recessed dark:bg-ink-800/60 border border-border dark:border-ink-800 text-small text-primary dark:text-ink-100 placeholder:text-tertiary dark:placeholder:text-ink-400 focus:outline-none focus:border-vault-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right: Type Filter Chips */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-tertiary mr-1" />
          {(['all', 'reports', 'flagged', 'anomalies'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`px-2.5 py-1 rounded-full text-caption font-medium border transition-colors ${
                activeFilter === filter 
                  ? 'bg-vault-50 dark:bg-vault-950/60 border-vault-300 dark:border-vault-700 text-vault-700 dark:text-vault-300 font-semibold'
                  : 'bg-surface dark:bg-ink-900 border-border dark:border-ink-800 text-secondary dark:text-ink-300 hover:text-primary'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Biomarker Focus Mode Spotlight Bar (when active) */}
      {focusedBiomarkerData && (
        <div className="bg-vault-50/70 dark:bg-vault-950/50 border-b border-vault-200 dark:border-vault-800/80 px-6 py-4">
          <div className="max-w-[960px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-vault-700 dark:text-vault-300 bg-vault-100 dark:bg-vault-900/60 px-2 py-0.5 rounded border border-vault-200 dark:border-vault-800">
                  Biomarker Trajectory
                </span>
                {focusedBiomarkerData.refRange && (
                  <span className="text-caption text-secondary dark:text-ink-400 font-mono">
                    Reference: {focusedBiomarkerData.refRange} {focusedBiomarkerData.unit}
                  </span>
                )}
              </div>
              <h2 className="text-h2 font-bold text-primary dark:text-ink-100 flex items-center gap-2">
                {focusedBiomarkerData.name}
                <span className="text-small font-normal text-tertiary dark:text-ink-400">
                  ({focusedBiomarkerData.readings.length} readings across vault)
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Readings list chip summary */}
              <div className="flex items-center gap-2 font-mono text-small">
                {focusedBiomarkerData.readings.map((r, i) => (
                  <span 
                    key={i} 
                    className={`px-2 py-1 rounded bg-surface dark:bg-ink-900 border border-border dark:border-ink-800 tabular-nums ${
                      r.status === 'flagged' ? 'text-clay-600 dark:text-clay-400 font-bold' :
                      r.status === 'borderline' ? 'text-amber-600 dark:text-amber-400 font-semibold' :
                      'text-primary dark:text-ink-100'
                    }`}
                    title={r.date}
                  >
                    {r.value}
                  </span>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFocusedBiomarker(null)}
                icon={<X className="w-3 h-3" />}
              >
                Clear Focus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Timeline Main Content */}
      <div className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {filteredEvents.length === 0 ? (
          /* 5. Empty State */
          <div className="h-64 flex flex-col items-center justify-center text-center mt-10">
            <div className="w-12 h-12 rounded-full bg-surface-recessed dark:bg-ink-800 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-tertiary" />
            </div>
            <h3 className="text-h3 font-medium text-primary dark:text-ink-100 mb-2">
              {searchQuery || focusedBiomarker ? 'No matching events found' : 'No timeline events yet'}
            </h3>
            <p className="text-secondary text-body max-w-sm">
              {searchQuery || focusedBiomarker 
                ? 'Try adjusting your search query, clearing biomarker focus, or resetting filters.' 
                : 'Generate health reports from your medical documents to build your health chronicle.'}
            </p>
            {(searchQuery || focusedBiomarker) && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFocusedBiomarker(null);
                    setTypeFilter(new Set());
                    setSeverityFilter(new Set());
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          years.map((year) => {
            const events = eventsByYear.get(year) || [];
            return (
              <div key={year} className="mb-10 relative">
                {/* Year divider */}
                <div className="sticky top-28 z-10 py-2 bg-app/95 dark:bg-[#07080a]/95 backdrop-blur-sm mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex items-center gap-4">
                    <h2 className="text-h2 font-bold text-primary dark:text-ink-100 tabular-nums">
                      {year}
                    </h2>
                    <span className="text-caption text-tertiary dark:text-ink-400 font-mono">
                      ({events.length} {events.length === 1 ? 'event' : 'events'})
                    </span>
                    <div className="flex-1 h-px bg-border dark:bg-ink-800" />
                  </div>
                </div>
                
                <div className="pl-4 sm:pl-8 border-l-2 border-border dark:border-ink-800 ml-4 sm:ml-6 mt-6">
                  {events.map((event, index) => (
                    <div key={event.id} className="relative mb-8 last:mb-0">
                      <TimelineNode
                        event={event}
                        isLast={index === events.length - 1}
                        onViewSource={onViewAnalysis}
                        onPreviewDoc={onPreviewDoc}
                        onFocusBiomarker={(name) => setFocusedBiomarker(name)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* 6. Legend Footer */}
        {filteredEvents.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-6 text-caption text-tertiary dark:text-ink-400 border-t border-border dark:border-ink-800 pt-6 mb-8 print:hidden">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sage-500" /> Normal
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Borderline
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-clay-500" /> Flagged
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-vault-500" /> Anomaly
            </div>
          </div>
        )}
      </div>

      <DisclaimerBar />
    </div>
  );
};
