import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  UserPlus,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Folder,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  ChevronRight,
  Lock,
  Zap,
  Info,
  X,
  Send,
  Bot,
  Cloud,
  Trash2,
} from 'lucide-react';
import type {
  FamilyMember,
  Folder as FolderType,
  AnalysisRecord,
  ProviderProfile,
  GoogleSyncSettings,
} from '../../../shared/types';
import { Keycap } from '../common/Keycap';

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
  onDeleteAnalysis?: (id: string) => void;
  onOpenSync: () => void;
}

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
  onDeleteAnalysis,
  onOpenSync,
}) => {
  const [isChatPreviewOpen, setIsChatPreviewOpen] = useState(false);

  // Compute total docs across member folders
  const totalDocs = folders.reduce((acc, f) => acc + (f.document_count || 0), 0);
  const activeProvider = providers.find((p) => p.is_default === 1) || providers[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-y-auto select-none">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-surface/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <div>
            <h2 className="text-sm font-semibold text-ink">Medical Dashboard</h2>
            <p className="text-[11px] text-mute">
              Private offline family health records &amp; local AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md"
            title="Google Drive Cloud Synchronization"
          >
            <Cloud className="w-3.5 h-3.5 text-mute" />
            <span>{syncSettings?.isSignedIn ? 'Google Drive' : 'Sync to Drive'}</span>
            {syncSettings?.isSignedIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            )}
          </button>

          <span className="text-[11px] px-2 py-1 rounded-md bg-surface-elevated border border-hairline text-stone flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-accent-green" /> Offline Vault
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Hero Banner with Red Stripe Accent */}
        <section className="rounded-xl bg-surface border border-hairline relative overflow-hidden shadow-sm">
          <div className="h-1 w-full hero-stripe-accent" />
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-blue-soft border border-accent-blue/30 text-[11px] font-medium text-accent-blue font-mono">
                  <Sparkles className="w-3 h-3" /> Clinical-Grade Local Intelligence
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
                  Family Health Vault & Intelligence
                </h1>
                <p className="text-sm text-body leading-relaxed">
                  Consolidate bloodwork, radiology reports, discharge summaries, and doctor notes into an
                  isolated, encrypted local vault. Generate multi-document trend analyses with zero cloud telemetry.
                </p>
              </div>

              {selectedMember && (
                <div className="p-3.5 rounded-lg bg-surface-elevated border border-hairline flex items-center gap-3 shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-black shadow-sm"
                    style={{ backgroundColor: selectedMember.avatar_color }}
                  >
                    {selectedMember.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-mute block">Current Profile</span>
                    <span className="text-sm font-semibold text-ink">{selectedMember.name}</span>
                    <span className="text-xs text-mute block">{selectedMember.relationship}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trust & Privacy Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-hairline/60">
              <div className="flex items-center gap-2 text-xs text-body">
                <ShieldCheck className="w-4 h-4 text-accent-green shrink-0" />
                <span>Isolated SQLite Database</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-body">
                <Zap className="w-4 h-4 text-accent-yellow shrink-0" />
                <span>Offline LLMs (LM Studio & Ollama)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-body">
                <Activity className="w-4 h-4 text-accent-blue shrink-0" />
                <span>Biomarker Discrepancy Tracking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-lg bg-surface border border-hairline">
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone block">Family Members</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold tabular-nums text-ink">{members.length}</span>
              <span className="text-xs text-stone">profiles</span>
            </div>
            <button
              onClick={onOpenAddMember}
              className="mt-2 text-xs text-mute hover:text-ink hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" /> Add profile
            </button>
          </div>

          <div className="p-4 rounded-lg bg-surface border border-hairline">
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone block">Vault Documents</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold tabular-nums text-ink">{totalDocs}</span>
              <span className="text-xs text-stone">records</span>
            </div>
            <button
              onClick={() => onNavigate('files')}
              className="mt-2 text-xs text-mute hover:text-ink hover:underline flex items-center gap-1 font-medium"
            >
              Browse folders →
            </button>
          </div>

          <div className="p-4 rounded-lg bg-surface border border-hairline">
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone block">Overviews</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold tabular-nums text-ink">{analyses.length}</span>
              <span className="text-xs text-stone">saved</span>
            </div>
            <button
              onClick={() => onNavigate('overviews_history')}
              className="mt-2 text-xs text-mute hover:text-ink hover:underline flex items-center gap-1 font-medium"
            >
              View library →
            </button>
          </div>

          <div className="p-4 rounded-lg bg-surface border border-hairline">
            <span className="text-[10px] font-medium uppercase tracking-widest text-stone block">AI Provider</span>
            <div className="mt-1.5 truncate">
              <span className="text-sm font-semibold text-ink truncate block">
                {activeProvider ? activeProvider.name : 'Not configured'}
              </span>
              <span className="text-[11px] text-stone font-mono truncate block">
                {activeProvider?.model || 'Add a local model'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="mt-2 text-xs text-mute hover:text-ink hover:underline flex items-center gap-1 font-medium"
            >
              Configure →
            </button>
          </div>
        </section>

        {/* Quick Access Action Cards Grid */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-stone uppercase tracking-widest">
              Quick Access
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Add Family Member */}
            <div
              onClick={onOpenAddMember}
              className="p-5 rounded-xl bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-accent-blue-soft border border-accent-blue/30 flex items-center justify-center text-accent-blue shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink group-hover:text-accent-blue transition-colors flex items-center gap-1.5">
                    Add Family Member
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-body leading-relaxed">
                    Create an isolated medical record profile for a family member, child, spouse, or yourself.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-mute">
                <span>{members.length} members configured</span>
                <span className="text-accent-blue font-medium group-hover:underline">Add Member →</span>
              </div>
            </div>

            {/* Card 2: Health Overviews */}
            <div
              onClick={() => onNavigate('overviews_history')}
              className="p-5 rounded-xl bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-accent-green-soft border border-accent-green/30 flex items-center justify-center text-accent-green shrink-0 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink group-hover:text-accent-green transition-colors flex items-center gap-1.5">
                    Health Overviews
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-body leading-relaxed">
                    Review generated clinical summaries, longitudinal biomarker trends, and appointment inquiries.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-mute">
                <span>{analyses.length} saved syntheses</span>
                <span className="text-accent-green font-medium group-hover:underline">Open Library →</span>
              </div>
            </div>

            {/* Card 3: AI Provider Configurations */}
            <div
              onClick={() => onNavigate('settings')}
              className="p-5 rounded-xl bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-accent-yellow-soft border border-accent-yellow/30 flex items-center justify-center text-accent-yellow shrink-0 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink group-hover:text-accent-yellow transition-colors flex items-center gap-1.5">
                    AI Provider Configurations
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-body leading-relaxed">
                    Set up LM Studio, Ollama, or custom private LLM endpoints for offline structured medical extraction.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-mute">
                <span>{providers.length} provider profiles</span>
                <span className="text-accent-yellow font-medium group-hover:underline">Configure AI →</span>
              </div>
            </div>

            {/* Card 4: Chat with AI Bot (Teaser / Preview) */}
            <div
              onClick={() => setIsChatPreviewOpen(true)}
              className="p-5 rounded-xl bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-ink group-hover:text-purple-400 transition-colors">
                      Clinical AI Assistant
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Preview
                    </span>
                  </div>
                  <p className="text-xs text-body leading-relaxed">
                    Conversational multi-document queries, drug-interaction cross checks, and conversational medical search.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-mute">
                <span>Natural language chat</span>
                <span className="text-purple-400 font-medium group-hover:underline">Preview Interface →</span>
              </div>
            </div>

            {/* Card 5: Google Drive Sync */}
            <div
              onClick={onOpenSync}
              className="p-5 rounded-xl bg-surface hover:bg-surface-elevated border border-hairline hover:border-hairline-strong transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-accent-blue-soft border border-accent-blue/30 flex items-center justify-center text-accent-blue shrink-0 group-hover:scale-105 transition-transform">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink group-hover:text-accent-blue transition-colors flex items-center gap-1.5">
                    Sync to Google Drive
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-body leading-relaxed">
                    Encrypted cloud backup. Sync all profiles at once, a specific family profile, or select folders.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-mute">
                <span>
                  {syncSettings?.isSignedIn
                    ? `Connected: ${syncSettings.userEmail}`
                    : 'Not connected'}
                </span>
                <span className="text-accent-blue font-medium group-hover:underline">
                  {syncSettings?.isSignedIn ? 'Manage & Sync →' : 'Connect Drive →'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity: Saved Overviews & Folders */}
        {analyses.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-stone uppercase tracking-widest">
                Recent Overviews
              </h3>
              <button
                onClick={() => onNavigate('overviews_history')}
                className="text-xs text-mute hover:text-ink hover:underline font-medium"
              >
                View all ({analyses.length})
              </button>
            </div>

            <div className="space-y-2">
              {analyses.slice(0, 3).map((rec) => {
                const res = rec.result_json;
                const flagsCount = res.flags?.length || 0;
                return (
                  <div
                    key={rec.id}
                    onClick={() => onSelectAnalysis(rec)}
                    className="p-3.5 rounded-lg bg-surface hover:bg-surface-elevated border border-hairline transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-accent-blue-soft text-accent-blue flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-ink group-hover:underline truncate">
                            {rec.scope_name || 'Medical Analysis'}
                          </span>
                          {rec.member_name && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-hairline"
                              style={{
                                backgroundColor: rec.member_color ? `${rec.member_color}20` : 'rgba(255,255,255,0.06)',
                                color: rec.member_color || 'var(--ink)',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: rec.member_color || '#57c1ff' }}
                              />
                              {rec.member_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-mute flex items-center gap-2">
                          <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{rec.source_documents.length} source records</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flagsCount > 0 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-accent-red-soft text-accent-red border border-accent-red/30">
                          {flagsCount} flagged
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-accent-green-soft text-accent-green border border-accent-green/30">
                          All normal
                        </span>
                      )}
                      {onDeleteAnalysis && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete health overview "${rec.scope_name || 'Medical Analysis'}"?`)) {
                              onDeleteAnalysis(rec.id);
                            }
                          }}
                          className="p-1 rounded text-stone hover:text-accent-red hover:bg-surface-card opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete overview"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-mute group-hover:text-ink transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Keyboard Shortcuts Hint Footer */}
        <footer className="pt-4 pb-2 border-t border-hairline flex flex-wrap items-center justify-between text-[11px] text-stone gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Keycap>⌘B</Keycap> Sidebar
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>⌘L</Keycap> Diagnostics
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>Esc</Keycap> Close
            </span>
          </div>
          <div className="text-stone">MedBuddy v1.0 · Private Medical Vault</div>
        </footer>
      </div>

      {/* Interactive AI Chat Sneak Peek Modal */}
      {isChatPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface border border-hairline rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    Clinical AI Chat Assistant
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      In Development
                    </span>
                  </h3>
                  <p className="text-[11px] text-mute">Conversational intelligence across family records</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatPreviewOpen(false)}
                className="p-1 text-mute hover:text-ink transition-colors rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mock Chat Conversation Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-surface-elevated/40">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 font-mono text-xs">
                  AI
                </div>
                <div className="p-3 rounded-lg bg-surface border border-hairline text-xs text-body leading-relaxed max-w-[85%]">
                  Hello! I am your private MedBuddy assistant. Once connected, you can ask me anything about your imported lab results, medications, and doctor consultations.
                </div>
              </div>

              <div className="flex items-start justify-end gap-2.5">
                <div className="p-3 rounded-lg bg-primary text-primary-text text-xs leading-relaxed max-w-[85%] font-medium">
                  Has my fasting blood glucose improved between my January and August tests?
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 font-mono text-xs">
                  AI
                </div>
                <div className="p-3 rounded-lg bg-surface border border-hairline text-xs text-body leading-relaxed max-w-[85%] space-y-1.5">
                  <p>
                    Yes, your Fasting Blood Glucose dropped from <strong className="text-ink font-mono">112 mg/dL</strong> (flagged borderline) in January down to <strong className="text-ink font-mono">98 mg/dL</strong> (within normal clinical reference) in August.
                  </p>
                  <p className="text-[11px] text-mute font-mono">
                    Referenced: Bloodwork_2024_01.pdf (p. 2) and Bloodwork_2024_08.pdf (p. 1)
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Chat Input */}
            <div className="p-3 border-t border-hairline bg-surface flex items-center gap-2 shrink-0">
              <input
                type="text"
                disabled
                placeholder="Ask about your lab results, medications, or trends..."
                className="flex-1 px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-mute cursor-not-allowed"
              />
              <button
                disabled
                className="p-2 rounded-md bg-primary text-primary-text opacity-50 cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Footer Note */}
            <div className="px-4 py-2.5 bg-surface-elevated border-t border-hairline text-[11px] text-mute flex items-center justify-between shrink-0">
              <span>Full conversational streaming will be enabled in the upcoming release.</span>
              <button
                onClick={() => setIsChatPreviewOpen(false)}
                className="text-xs text-ink font-medium hover:underline"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
