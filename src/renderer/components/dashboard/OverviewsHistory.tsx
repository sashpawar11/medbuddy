import React from 'react';
import { Activity, Clock, Cpu, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import type { AnalysisRecord } from '../../../shared/types';

interface Props {
  analyses: AnalysisRecord[];
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
}

export const OverviewsHistory: React.FC<Props> = ({ analyses, onSelectAnalysis }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-y-auto select-none">
      <header className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-surface/40 backdrop-blur-sm sticky top-0 z-10 pr-16">
        <div>
          <h2 className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
            Health Overviews Library
          </h2>
          <p className="text-xs text-mute">
            Cached AI analyses saved locally — instant access without model re-runs
          </p>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full">
        {analyses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-hairline rounded-xl bg-surface/20">
            <Activity className="w-10 h-10 text-stone mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-ink mb-1">No generated overviews yet</h3>
            <p className="text-xs text-mute max-w-sm mx-auto">
              Select a medical folder or document in the sidebar and click "Analyze" to generate your first health overview.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((rec) => {
              const res = rec.result_json;
              const flagsCount = res.flags?.length || 0;
              const metricsCount = res.metrics?.length || 0;
              const dateStr = new Date(rec.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectAnalysis(rec)}
                  className="p-4 rounded-lg bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-ink group-hover:underline">
                        {rec.scope_name || 'Medical Analysis'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-surface-card text-mute border border-hairline">
                        {rec.scope_type.toUpperCase()}
                      </span>
                      {rec.model_name && (
                        <span className="text-[10px] font-mono text-stone">
                          • {rec.model_name}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-body line-clamp-2 leading-relaxed mb-3">
                      {res.summary}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-mute font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span>{metricsCount} Metrics</span>
                      {flagsCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-accent-red flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {flagsCount} Flags
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-center p-2 text-stone group-hover:text-ink transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
