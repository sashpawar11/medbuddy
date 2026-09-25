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
  Lock,
  Database,
  CheckCircle2,
  Sparkles,
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
  onNavigate: (view: 'home' | 'files' | 'overviews_history' | 'timeline' | 'settings' | 'logs') => void;
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
          {/* Sleek Hero Section */}
          <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-white via-surface to-vault-50/20 dark:from-[#141926] dark:via-[#111520] dark:to-[#0c1017] p-6 sm:p-8 md:p-9 shadow-sm dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)] transition-all duration-300">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-teal-500/10 to-vault-500/10 dark:from-teal-500/15 dark:to-vault-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-vault-600/10 to-teal-400/5 dark:from-vault-600/20 dark:to-teal-400/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

            {/* Geometric Circuit Grid SVG Pattern */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035] dark:opacity-[0.07]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" />
                  <circle cx="0" cy="0" r="1.2" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>

            {/* Subtle Curved Wave SVG Accent */}
            <svg
              className="absolute -right-8 -bottom-8 w-[400px] h-[200px] pointer-events-none opacity-[0.04] dark:opacity-[0.06] text-vault-600 dark:text-vault-400"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 150 C 90 150, 120 40, 210 40 C 300 40, 330 170, 400 170"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="4 6"
              />
              <path
                d="M0 175 C 110 175, 140 75, 235 75 C 330 75, 360 190, 400 190"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Left Column: Headline, Description, CTAs, Badges */}
              <div className="space-y-4 max-w-xl">
                {/* Status Pill Badge with Breathing Radar Beacon */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50/90 dark:bg-teal-950/60 border border-teal-200/90 dark:border-teal-800/70 text-xs font-medium text-teal-800 dark:text-teal-300 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full bg-teal-500 h-2 w-2"></span>
                  </span>
                  <span className="font-semibold">Sovereign Clinical Intelligence</span>
                  <span className="text-teal-400/80 dark:text-teal-600">•</span>
                  <span className="text-teal-700 dark:text-teal-300">100% Local AI</span>
                </div>

                {/* Hero Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-primary leading-[1.2]">
                  Private Family Medical Vault &amp;{' '}
                  <span className="bg-gradient-to-r from-teal-600 via-vault-600 to-indigo-600 dark:from-teal-400 dark:via-vault-400 dark:to-indigo-300 bg-clip-text text-transparent">
                    Clinical Intelligence
                  </span>
                </h1>

                {/* Value Subtitle */}
                <p className="text-body text-secondary leading-relaxed">
                  Securely store, organize, and synthesize health records entirely on your machine.
                  Deterministic biomarker extraction and clinical intelligence with zero cloud telemetry.
                </p>

                {/* Quick Action CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => onNavigate('files')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-vault-600 hover:bg-vault-700 active:bg-vault-800 text-white font-medium text-small shadow-sm hover:shadow transition-all duration-150 group"
                  >
                    <Folder className="w-4 h-4 text-vault-200 group-hover:text-white transition-colors" />
                    <span>Browse Medical Records</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-surface hover:bg-surface-hover active:bg-surface-recessed border border-border text-secondary hover:text-primary font-medium text-small transition-all duration-150 shadow-xs"
                  >
                    <Cpu className="w-4 h-4 text-tertiary" />
                    <span>Configure AI Engine</span>
                  </button>
                </div>

                {/* Architecture & Sovereignty Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-border/80">
                  <div className="flex items-center gap-2 text-caption text-secondary bg-surface/80 dark:bg-surface-recessed/60 px-2.5 py-1.5 rounded-md border border-border/70 backdrop-blur-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">On-Device SQLite Vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-secondary bg-surface/80 dark:bg-surface-recessed/60 px-2.5 py-1.5 rounded-md border border-border/70 backdrop-blur-xs">
                    <Activity className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">Local OCR &amp; Vision</span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-secondary bg-surface/80 dark:bg-surface-recessed/60 px-2.5 py-1.5 rounded-md border border-border/70 backdrop-blur-xs">
                    <Lock className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400 shrink-0" strokeWidth={2} />
                    <span className="font-medium truncate">Zero Cloud Telemetry</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Telemetry Console Card */}
              <div className="w-full lg:w-[280px] shrink-0">
                <div className="rounded-xl border border-border/90 bg-surface/90 dark:bg-surface-recessed/80 backdrop-blur-md p-4 shadow-sm space-y-3.5 relative overflow-hidden transition-all duration-200 hover:border-vault-500/40">
                  {/* Console Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full bg-emerald-500 h-2 w-2"></span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                        Vault Monitor
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-surface-recessed dark:bg-surface border border-border text-teal-700 dark:text-teal-300">
                      AES-256
                    </span>
                  </div>

                  {/* SVG Animated ECG Telemetry Wave */}
                  <div className="p-2.5 rounded-lg bg-surface-recessed/80 dark:bg-black/20 border border-border/60 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] text-tertiary font-mono mb-1">
                      <span>ECG TELEMETRY</span>
                      <span className="text-teal-600 dark:text-teal-400 font-semibold">SYNTHESIZING</span>
                    </div>
                    <svg
                      viewBox="0 0 240 44"
                      className="w-full h-11 overflow-visible text-teal-600 dark:text-teal-400"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="#0d9488" stopOpacity="1" />
                          <stop offset="85%" stopColor="#3b82f6" stopOpacity="1" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                      {/* Guide line */}
                      <path
                        d="M0 22 L240 22"
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />
                      {/* Animated Clinical ECG Trace */}
                      <path
                        d="M0 22 L45 22 L52 18 L58 22 L65 22 L72 8 L80 38 L88 12 L96 26 L102 22 L145 22 L152 18 L158 22 L165 22 L172 8 L180 38 L188 12 L196 26 L202 22 L240 22"
                        stroke="url(#ecgGrad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-ecg-trace"
                      />
                    </svg>
                  </div>

                  {/* Telemetry Diagnostics Rows */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-tertiary flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-tertiary" />
                        Active Profile
                      </span>
                      <span className="font-medium text-primary flex items-center gap-1.5 truncate max-w-[130px]">
                        {selectedMember ? (
                          <>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getMemberColor(selectedMember, 0) }}
                            />
                            <span className="truncate">{selectedMember.name}</span>
                          </>
                        ) : (
                          <span>All Enrolled ({members.length})</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="text-tertiary flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-tertiary" />
                        Clinical Model
                      </span>
                      <span className="font-mono text-[11px] text-primary truncate max-w-[130px]" title={activeProvider?.model}>
                        {activeProvider ? (activeProvider.model || activeProvider.name) : 'Local Heuristics'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-tertiary flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-tertiary" />
                        Vault Storage
                      </span>
                      <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400">
                        {totalDocs} docs / {analyses.length} reports
                      </span>
                    </div>
                  </div>

                  {/* Privacy Guarantee Footer */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-tertiary">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-sage-600 dark:text-sage-400" />
                      Zero Telemetry
                    </span>
                    <button
                      onClick={() => onNavigate('settings')}
                      className="text-vault-600 dark:text-vault-400 hover:underline font-medium text-[11px]"
                    >
                      Manage →
                    </button>
                  </div>
                </div>
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
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-[border-color,box-shadow] duration-100 ease-out cursor-pointer group flex flex-col justify-between"
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
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-[border-color,box-shadow] duration-100 ease-out cursor-pointer group flex flex-col justify-between"
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
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-[border-color,box-shadow] duration-100 ease-out cursor-pointer group flex flex-col justify-between"
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
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong hover:shadow-sm transition-[border-color,box-shadow] duration-100 ease-out cursor-pointer group flex flex-col justify-between"
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
                      className="p-4 rounded-md bg-surface hover:bg-surface-hover border border-border hover:border-border-strong hover:shadow-sm transition-[background-color,border-color,box-shadow] duration-100 ease-out cursor-pointer flex items-center justify-between gap-4 group"
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
