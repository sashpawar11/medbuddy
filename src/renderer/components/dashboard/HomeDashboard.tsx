import React from 'react';
import {
  Activity,
  Cpu,
  UserPlus,
  ShieldCheck,
  Folder,
  ArrowRight,
  Plus,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import type {
  FamilyMember,
  Folder as FolderType,
  AnalysisRecord,
  ProviderProfile,
  GoogleSyncSettings,
} from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { DisclaimerBar } from '../common/DisclaimerBar';
import { Keycap } from '../common/Keycap';
import { Button } from '../common/Button';
import { MEMBER_AVATAR_COLORS } from '../sidebar/MemberModal';

interface Props {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  folders: FolderType[];
  analyses: AnalysisRecord[];
  providers: ProviderProfile[];
  syncSettings?: GoogleSyncSettings | null;
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'settings' | 'logs') => void;
  onOpenAddMember: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
  onOpenSync: () => void;
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

export const HomeDashboard: React.FC<Props> = ({
  members,
  selectedMember,
  folders,
  analyses,
  providers,
  syncSettings,
  onNavigate,
  onOpenAddMember,
  onSelectFolder,
  onSelectAnalysis,
  onOpenSync,
}) => {
  const totalDocs = folders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const activeProvider = providers.find((p) => p.is_default === 1) || providers[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto select-none font-sans">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-sage-600" />
          <div>
            <h2 className="text-body-medium font-semibold text-primary">Family Medical Vault</h2>
            <p className="text-caption text-tertiary">
              Private, local-first health records and clinical intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeProvider && (
            <ProvenancePill
              kind={activeProvider.kind}
              providerName={activeProvider.name}
              modelName={activeProvider.model}
            />
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSync}
            icon={<Cloud className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            <span>{syncSettings?.isSignedIn ? 'Drive Synced' : 'Connect Drive'}</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area: Max reading width 840px centered per §5.2 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[840px] mx-auto px-6 py-8 space-y-6">
          {/* Product Hero Section */}
          <section className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-surface-recessed rounded-xl border border-border p-7 space-y-6 shadow-xs">
            {/* Ambient decorative background glow */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-vault-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-caption font-semibold text-teal-700 dark:text-teal-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>Sovereign Clinical Intelligence</span>
                </div>
                <h1 className="text-display font-bold tracking-tight text-primary text-2xl sm:text-3xl">
                  Private Family Medical Vault
                </h1>
                <p className="text-body text-secondary leading-relaxed">
                  Securely store, organize, and synthesize health records entirely on your machine.
                  Deterministic biomarker extraction and clinical intelligence with zero cloud telemetry.
                </p>
              </div>

              {/* Quick Action CTAs */}
              <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onNavigate('files')}
                  icon={<ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
                >
                  Browse Medical Records
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => onNavigate('settings')}
                  icon={<Cpu className="w-4 h-4" strokeWidth={1.75} />}
                >
                  Configure AI Engine
                </Button>
              </div>
            </div>

            {/* Architecture & Sovereignty Badges */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2.5 text-small text-secondary bg-surface-recessed/60 px-3 py-2 rounded-lg border border-border/50">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" strokeWidth={2} />
                <span className="font-medium">On-Device SQLite Vault</span>
              </div>
              <div className="flex items-center gap-2.5 text-small text-secondary bg-surface-recessed/60 px-3 py-2 rounded-lg border border-border/50">
                <Activity className="w-4 h-4 text-vault-600 dark:text-vault-400 shrink-0" strokeWidth={2} />
                <span className="font-medium">Local OCR &amp; Vision Engine</span>
              </div>
              <div className="flex items-center gap-2.5 text-small text-secondary bg-surface-recessed/60 px-3 py-2 rounded-lg border border-border/50">
                <Cpu className="w-4 h-4 text-sage-600 dark:text-sage-400 shrink-0" strokeWidth={2} />
                <span className="font-medium">Zero Cloud Telemetry</span>
              </div>
            </div>
          </section>

          {/* Key Metric Summary Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary">
                Profiles
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-metric-lg font-bold text-primary tabular-nums">
                  {members.length}
                </span>
                <span className="text-small text-tertiary">family</span>
              </div>
              <button
                onClick={onOpenAddMember}
                className="mt-2 text-caption text-brand hover:underline flex items-center gap-1 font-medium text-left"
              >
                <Plus className="w-3 h-3" strokeWidth={1.75} /> Add member
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary">
                Documents
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-metric-lg font-bold text-primary tabular-nums">
                  {totalDocs}
                </span>
                <span className="text-small text-tertiary">records</span>
              </div>
              <button
                onClick={() => onNavigate('files')}
                className="mt-2 text-caption text-brand hover:underline flex items-center gap-1 font-medium text-left"
              >
                Browse records →
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary">
                Generated Reports
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-metric-lg font-bold text-primary tabular-nums">
                  {analyses.length}
                </span>
                <span className="text-small text-tertiary">reports</span>
              </div>
              <button
                onClick={() => onNavigate('overviews_history')}
                className="mt-2 text-caption text-brand hover:underline flex items-center gap-1 font-medium text-left"
              >
                View reports →
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between">
              <span className="text-caption font-medium uppercase tracking-[0.02em] text-tertiary">
                AI Engine
              </span>
              <div className="mt-2 truncate">
                <span className="text-body-medium font-semibold text-primary truncate block" title={activeProvider?.name}>
                  {activeProvider ? activeProvider.name : 'None'}
                </span>
                <span className="text-caption text-tertiary font-mono truncate block">
                  {activeProvider?.model || 'Configure model'}
                </span>
              </div>
              <button
                onClick={() => onNavigate('settings')}
                className="mt-2 text-caption text-brand hover:underline flex items-center gap-1 font-medium text-left"
              >
                Configure engine →
              </button>
            </div>
          </section>

          {/* Quick Access Grid per §5.3 (280px minimum column width, space-5 gutter) */}
          <section className="space-y-3">
            <h3 className="text-h3 font-semibold text-primary">
              Workflows &amp; Archives
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Add Member */}
              <div
                onClick={onOpenAddMember}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-h3 font-semibold text-primary group-hover:text-vault-600 transition-colors flex items-center gap-1.5">
                      Add Family Member
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Create an isolated medical record profile for a family member, parent, or child.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>{members.length} {members.length === 1 ? 'member' : 'members'} enrolled</span>
                  <span className="text-vault-600 font-medium">Add profile →</span>
                </div>
              </div>

              {/* Card 2: Health Overviews */}
              <div
                onClick={() => onNavigate('overviews_history')}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-h3 font-semibold text-primary group-hover:text-vault-600 transition-colors flex items-center gap-1.5">
                      Synthesized Overviews
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Review generated multi-record summaries, biomarker trends, and physician discussion points.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>{analyses.length} cached syntheses</span>
                  <span className="text-vault-600 font-medium">Open library →</span>
                </div>
              </div>

              {/* Card 3: AI Provider Setup */}
              <div
                onClick={() => onNavigate('settings')}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-sm bg-surface-recessed text-primary flex items-center justify-center shrink-0 border border-border">
                    <Cpu className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-h3 font-semibold text-primary group-hover:text-vault-600 transition-colors flex items-center gap-1.5">
                      AI Provider Settings
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Configure LM Studio, Ollama, or BYOK cloud endpoints for structured medical parsing.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>{providers.length} configured {providers.length === 1 ? 'profile' : 'profiles'}</span>
                  <span className="text-vault-600 font-medium">Manage engines →</span>
                </div>
              </div>

              {/* Card 4: Google Drive Sync */}
              <div
                onClick={onOpenSync}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-sm bg-surface-recessed text-primary flex items-center justify-center shrink-0 border border-border">
                    <Cloud className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-h3 font-semibold text-primary group-hover:text-vault-600 transition-colors flex items-center gap-1.5">
                      Google Drive Backup
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Encrypted personal backup. Sync all files or select individual folders and profiles.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>
                    {syncSettings?.isSignedIn ? syncSettings.userEmail : 'Not connected'}
                  </span>
                  <span className="text-vault-600 font-medium">
                    {syncSettings?.isSignedIn ? 'Manage sync →' : 'Connect Drive →'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Syntheses Section */}
          {analyses.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-primary">
                  Recent Health Syntheses
                </h3>
                <button
                  onClick={() => onNavigate('overviews_history')}
                  className="text-caption text-brand hover:underline font-medium"
                >
                  View all ({analyses.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {analyses.slice(0, 4).map((rec) => {
                  const res = rec.result_json;
                  const flagsCount = res.flags?.length || 0;
                  const borderlineCount = res.metrics?.filter((m) => m.status === 'borderline').length || 0;
                  const normalCount = res.metrics?.filter((m) => m.status === 'normal').length || 0;

                  return (
                    <div
                      key={rec.id}
                      onClick={() => onSelectAnalysis(rec)}
                      className="p-4 rounded-md bg-surface hover:bg-surface-hover border border-border hover:border-border-strong hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-body font-semibold text-primary group-hover:text-vault-600 truncate block">
                            {rec.scope_name || 'Medical Analysis'}
                          </span>
                          <span className="text-caption text-tertiary flex items-center gap-2 mt-0.5">
                            <span className="tabular-nums">{formatDate(rec.created_at)}</span>
                            <span>•</span>
                            <span>{rec.source_documents?.length || 0} source records</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Mini status dots count per §11.5 */}
                        <div className="text-caption font-mono flex items-center gap-2 text-tertiary">
                          <span className="text-sage-600">● {normalCount}</span>
                          {borderlineCount > 0 && <span className="text-amber-600">▲ {borderlineCount}</span>}
                          {flagsCount > 0 && <span className="text-clay-600">✕ {flagsCount}</span>}
                        </div>

                        <ChevronRight className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" strokeWidth={1.75} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Desktop keyboard shortcuts footer (§5.2, §13) */}
          <footer className="pt-6 pb-2 border-t border-border flex flex-wrap items-center justify-between text-caption text-tertiary gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Keycap>⌘B</Keycap> Toggle Sidebar
              </span>
              <span className="flex items-center gap-1.5">
                <Keycap>⌘L</Keycap> Diagnostics Log
              </span>
              <span className="flex items-center gap-1.5">
                <Keycap>Esc</Keycap> Close Dialogs
              </span>
            </div>
            <div>Family Medical Vault v1.0</div>
          </footer>
        </div>
      </div>

      {/* Persistent Disclaimer Bar (§9.14) */}
      <DisclaimerBar />
    </div>
  );
};
