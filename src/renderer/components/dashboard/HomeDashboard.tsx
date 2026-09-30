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
  FolderSync,
  Lock,
  Database,
  CheckCircle2,
  Sparkles,
  MessageSquareText,
  Clock,
  AlertTriangle,
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
import { Button } from '../common/Button';
import { MEMBER_AVATAR_COLORS } from '../sidebar/MemberModal';

interface Props {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  folders: FolderType[];
  analyses: AnalysisRecord[];
  providers: ProviderProfile[];
  syncSettings?: GoogleSyncSettings | null;
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'timeline' | 'chat' | 'settings' | 'logs') => void;
  onOpenAddMember: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
  onOpenSync: () => void;
}

/** Format dates consistently app-wide: "Mar 12, 2024" */
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

  const getMemberColor = (m: FamilyMember, idx: number) => {
    if (m.avatar_color && MEMBER_AVATAR_COLORS.includes(m.avatar_color)) {
      return m.avatar_color;
    }
    return MEMBER_AVATAR_COLORS[idx % MEMBER_AVATAR_COLORS.length];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto select-none font-sans">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sage-600 dark:bg-sage-600" />
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
            icon={<FolderSync className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            <span>
              {syncSettings?.backupPath || syncSettings?.localMountPath
                ? 'Backup Vault'
                : 'Set Backup Location'}
            </span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[840px] mx-auto px-6 py-8 space-y-6">
          {/* Clinical Command Hero Section */}
          <section className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 sm:p-7 shadow-xs">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Value Proposition & Purposeful CTAs */}
              <div className="space-y-4 max-w-xl">
                {/* Status Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-vault-50 dark:bg-vault-950/60 border border-vault-200/80 dark:border-vault-800/70 text-caption font-medium text-vault-700 dark:text-vault-300">
                  <span className="w-2 h-2 rounded-full bg-vault-600 dark:bg-vault-400" />
                  <span className="font-semibold">Local Clinical Vault</span>
                  <span className="text-vault-400 dark:text-vault-600">•</span>
                  <span>100% On-Device AI</span>
                </div>

                {/* Hero Title - Confident, Clean Typography without Gradient Clutter */}
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary leading-tight">
                  Private Family Health Vault &amp; Clinical Synthesis
                </h1>

                {/* Subtitle */}
                <p className="text-body text-secondary leading-relaxed">
                  Securely organize, analyze, and synthesize medical records entirely on your machine.
                  Deterministic biomarker extraction with strict cross-profile privacy.
                </p>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onNavigate('chat')}
                    icon={<MessageSquareText className="w-4 h-4" strokeWidth={2} />}
                  >
                    <span>Chat with MedBuddy</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onNavigate('files')}
                    icon={<Folder className="w-4 h-4 text-tertiary" strokeWidth={1.75} />}
                  >
                    <span>Browse Medical Records</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => onNavigate('settings')}
                    icon={<Cpu className="w-4 h-4 text-tertiary" strokeWidth={1.75} />}
                  >
                    <span>Configure AI Engine</span>
                  </Button>
                </div>

                {/* Guarantees Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-caption text-secondary py-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-sage-600 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">Encrypted SQLite Vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-secondary py-1">
                    <Activity className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">Local OCR &amp; Vision</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-secondary py-1">
                    <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">Zero Cloud Telemetry</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Grounded System Summary Card */}
              <div className="w-full lg:w-[260px] shrink-0">
                <div className="rounded-md border border-border bg-surface-recessed p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                      System Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sage-600 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage-600" />
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-tertiary">Active Profile</span>
                      <span className="font-medium text-primary truncate max-w-[140px] flex items-center gap-1.5">
                        {selectedMember ? (
                          <>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getMemberColor(selectedMember, 0) }}
                            />
                            <span className="truncate">{selectedMember.name}</span>
                          </>
                        ) : (
                          <span>All ({members.length})</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-tertiary">Clinical Model</span>
                      <span
                        className="font-mono text-[11px] text-primary truncate max-w-[130px] font-medium"
                        title={activeProvider?.model}
                      >
                        {activeProvider ? (activeProvider.model || activeProvider.name) : 'Local Heuristics'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-tertiary">Vault Records</span>
                      <span className="text-[11px] font-medium text-primary tabular-nums">
                        {totalDocs} docs / {analyses.length} reports
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-tertiary">
                    <span className="font-mono text-[10px]">AES-256 Storage</span>
                    <button
                      onClick={() => onNavigate('settings')}
                      className="text-vault-600 dark:text-vault-400 hover:underline font-medium text-[11px]"
                    >
                      Settings →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Key Metric Summary Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between shadow-2xs hover:border-border-strong transition-colors">
              <span className="text-caption font-semibold uppercase tracking-wider text-tertiary">
                Profiles
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-metric-lg font-bold text-primary tabular-nums">
                  {members.length}
                </span>
                <span className="text-small text-tertiary">enrolled</span>
              </div>
              <button
                onClick={onOpenAddMember}
                className="mt-2 text-caption text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium text-left"
              >
                <Plus className="w-3 h-3" strokeWidth={2} /> Add member
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between shadow-2xs hover:border-border-strong transition-colors">
              <span className="text-caption font-semibold uppercase tracking-wider text-tertiary">
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
                className="mt-2 text-caption text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium text-left"
              >
                Browse records →
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between shadow-2xs hover:border-border-strong transition-colors">
              <span className="text-caption font-semibold uppercase tracking-wider text-tertiary">
                Synthesized Reports
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-metric-lg font-bold text-primary tabular-nums">
                  {analyses.length}
                </span>
                <span className="text-small text-tertiary">cached</span>
              </div>
              <button
                onClick={() => onNavigate('overviews_history')}
                className="mt-2 text-caption text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium text-left"
              >
                View reports →
              </button>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border flex flex-col justify-between shadow-2xs hover:border-border-strong transition-colors">
              <span className="text-caption font-semibold uppercase tracking-wider text-tertiary">
                AI Engine
              </span>
              <div className="mt-2 truncate">
                <span className="text-body-medium font-semibold text-primary truncate block" title={activeProvider?.name}>
                  {activeProvider ? activeProvider.name : 'Local Heuristics'}
                </span>
                <span className="text-caption text-tertiary font-mono truncate block mt-0.5">
                  {activeProvider?.model || 'Ready'}
                </span>
              </div>
              <button
                onClick={() => onNavigate('settings')}
                className="mt-2 text-caption text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium text-left"
              >
                Configure engine →
              </button>
            </div>
          </section>

          {/* Quick Access Workflows Grid */}
          <section className="space-y-3">
            <h3 className="text-h3 font-semibold text-primary">
              Workflows &amp; Medical Archives
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Add Member */}
              <div
                onClick={onOpenAddMember}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 border border-vault-200/50 dark:border-vault-800/60 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-body-medium font-semibold text-primary group-hover:text-vault-600 dark:group-hover:text-vault-400 transition-colors flex items-center gap-1.5">
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
                  <span className="text-vault-600 dark:text-vault-400 font-medium">Add profile →</span>
                </div>
              </div>

              {/* Card 2: Health Overviews */}
              <div
                onClick={() => onNavigate('overviews_history')}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 border border-vault-200/50 dark:border-vault-800/60 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-body-medium font-semibold text-primary group-hover:text-vault-600 dark:group-hover:text-vault-400 transition-colors flex items-center gap-1.5">
                      Synthesized Overviews
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Review multi-record summaries, biomarker trends, and physician discussion points.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>{analyses.length} cached syntheses</span>
                  <span className="text-vault-600 dark:text-vault-400 font-medium">Open library →</span>
                </div>
              </div>

              {/* Card 3: AI Provider Setup */}
              <div
                onClick={() => onNavigate('settings')}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-surface-recessed text-primary flex items-center justify-center shrink-0 border border-border">
                    <Cpu className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-body-medium font-semibold text-primary group-hover:text-vault-600 dark:group-hover:text-vault-400 transition-colors flex items-center gap-1.5">
                      AI Provider Settings
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Configure LM Studio, Ollama, or BYOK endpoints for structured medical parsing.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span>{providers.length} configured {providers.length === 1 ? 'profile' : 'profiles'}</span>
                  <span className="text-vault-600 dark:text-vault-400 font-medium">Manage engines →</span>
                </div>
              </div>

              {/* Card 4: Vault Backup & Sync */}
              <div
                onClick={onOpenSync}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-md bg-surface-recessed text-primary flex items-center justify-center shrink-0 border border-border">
                    <FolderSync className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-body-medium font-semibold text-primary group-hover:text-vault-600 dark:group-hover:text-vault-400 transition-colors flex items-center gap-1.5">
                      Vault Backup &amp; Sync
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
                    </h4>
                    <p className="text-small text-secondary leading-relaxed">
                      Continuous local backup. Select any local or cloud-synced folder (Google Drive, Dropbox, OneDrive, iCloud) with zero setup.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption text-tertiary">
                  <span className="truncate max-w-[200px] font-mono text-[11px]">
                    {syncSettings?.backupPath || syncSettings?.localMountPath
                      ? `📁 ${(syncSettings.backupPath || syncSettings.localMountPath || '').split('/').filter(Boolean).pop()}`
                      : 'No folder configured'}
                  </span>
                  <span className="text-vault-600 dark:text-vault-400 font-medium">
                    {syncSettings?.backupPath || syncSettings?.localMountPath ? 'Manage vault →' : 'Set location →'}
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
                  className="text-caption text-vault-600 dark:text-vault-400 hover:underline font-medium"
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
                      className="p-4 rounded-md bg-surface hover:bg-surface-hover border border-border hover:border-border-strong hover:shadow-2xs transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 border border-vault-200/50 dark:border-vault-800/60 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-body font-semibold text-primary group-hover:text-vault-600 dark:group-hover:text-vault-400 transition-colors truncate block">
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
                        {/* Mini status indicator */}
                        <div className="text-caption font-mono flex items-center gap-2 text-tertiary tabular-nums">
                          <span className="text-sage-600 font-medium">● {normalCount}</span>
                          {borderlineCount > 0 && <span className="text-amber-600 font-medium">▲ {borderlineCount}</span>}
                          {flagsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-clay-50 dark:bg-clay-950/50 text-clay-700 dark:text-clay-300 border border-clay-200 dark:border-clay-800">
                              <AlertTriangle className="w-3 h-3 text-clay-600" />
                              {flagsCount}
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" strokeWidth={1.75} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="pt-6 pb-2 border-t border-border flex flex-wrap items-center justify-between text-caption text-tertiary gap-3">
            <div>Private &amp; Offline Medical Vault</div>
            <div className="text-[11px] font-mono">MedBuddy Vault v1.0</div>
          </footer>
        </div>
      </div>

      {/* Persistent Disclaimer Bar */}
      <DisclaimerBar />
    </div>
  );
};
