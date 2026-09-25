import React from 'react';
import { Activity, Clock, ChevronRight, Trash2 } from 'lucide-react';
import type { AnalysisRecord, FamilyMember } from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { DisclaimerBar } from '../common/DisclaimerBar';
import { Button } from '../common/Button';

interface Props {
  analyses: AnalysisRecord[];
  selectedMember?: FamilyMember | null;
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
  onDeleteAnalysis?: (id: string) => void;
  onOpenChronicle?: () => void;
}

/** Format dates consistently app-wide per §4.3: "Mar 12, 2024" */
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const OverviewsHistory: React.FC<Props> = ({
  analyses,
  selectedMember,
  onSelectAnalysis,
  onDeleteAnalysis,
  onOpenChronicle,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto select-none font-sans">
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface sticky top-0 z-10">
        <div>
          <h2 className="text-body-medium font-semibold text-primary">All Generated Reports</h2>
          <p className="text-caption text-tertiary">
            Master vault archive of synthesized clinical intelligence reports across all family profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMember && onOpenChronicle && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenChronicle}
              icon={<Clock className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" strokeWidth={2} />}
              title={`View ${selectedMember.name}'s Health Chronicle`}
            >
              Health Chronicle
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[840px] mx-auto px-6 py-8">
          {analyses.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border-strong rounded-md bg-surface p-9">
              <Activity className="w-8 h-8 text-tertiary mx-auto mb-3 opacity-40" strokeWidth={1.75} />
              <h3 className="text-h2 font-semibold text-primary mb-1">No generated reports yet</h3>
              <p className="text-body text-secondary max-w-sm mx-auto">
                Select a folder of medical documents and click "Analyze" to synthesize your first health report.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((rec) => {
                const res = rec.result_json;
                const normalCount = res.metrics?.filter((m) => m.status === 'normal').length || 0;
                const borderlineCount = res.metrics?.filter((m) => m.status === 'borderline').length || 0;
                const flaggedCount = res.flags?.length || res.metrics?.filter((m) => m.status === 'flagged').length || 0;
                const isLocal = !rec.provider_name?.toLowerCase().includes('cloud') && !rec.provider_name?.toLowerCase().includes('openai');

                return (
                  /* Overview history card per §11.5 */
                  <div
                    key={rec.id}
                    onClick={() => onSelectAnalysis(rec)}
                    className="p-5 rounded-md bg-surface hover:bg-surface-hover border border-border hover:border-border-strong hover:shadow-sm transition-[background-color,border-color,box-shadow] duration-100 ease-out cursor-pointer group flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-body font-semibold text-primary group-hover:text-vault-600 transition-colors">
                          {rec.scope_name || 'Medical Analysis'}
                        </span>

                        {/* Profile Name Tag */}
                        {rec.member_name && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium border"
                            style={{
                              backgroundColor: rec.member_color ? `${rec.member_color}18` : 'rgba(44, 92, 168, 0.08)',
                              borderColor: rec.member_color ? `${rec.member_color}35` : 'rgba(44, 92, 168, 0.25)',
                              color: rec.member_color || '#2C5CA8',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: rec.member_color || '#2C5CA8' }}
                            />
                            {rec.member_name}
                          </span>
                        )}

                        {/* Provenance Pill per §11.5 */}
                        <ProvenancePill
                          kind={isLocal ? 'local' : 'cloud'}
                          providerName={rec.provider_name}
                          modelName={rec.model_name}
                        />

                        {/* Scope name & date range */}
                        {res.documentDateRange && (res.documentDateRange.earliest || res.documentDateRange.latest) && (
                          <span className="text-caption text-tertiary font-mono tabular-nums">
                            ({res.documentDateRange.earliest} – {res.documentDateRange.latest})
                          </span>
                        )}
                      </div>

                      <p className="text-small text-secondary line-clamp-2 leading-relaxed">
                        {res.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-caption text-tertiary pt-1">
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                          {formatDate(rec.created_at)}
                        </span>

                        <span>•</span>

                        {/* Mini status summary per §11.5: ● 8 ▲ 2 ✕ 1 */}
                        <div className="flex items-center gap-2.5 font-mono tabular-nums">
                          <span className="text-sage-600 font-medium">● {normalCount}</span>
                          <span className="text-amber-600 font-medium">▲ {borderlineCount}</span>
                          <span className="text-clay-600 font-medium">✕ {flaggedCount}</span>
                        </div>

                        <span>•</span>

                        <span>{rec.source_documents?.length || 0} source records</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {onDeleteAnalysis && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this health overview?')) {
                              onDeleteAnalysis(rec.id);
                            }
                          }}
                          className="p-1.5 text-tertiary hover:text-clay-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-surface-hover"
                          title="Delete Overview"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                      <div className="p-1.5 text-tertiary group-hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Persistent Disclaimer Bar per §9.14 */}
      <DisclaimerBar />
    </div>
  );
};
