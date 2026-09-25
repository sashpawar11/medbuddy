import React from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Activity,
  Pill,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';

interface EmptyChatStateProps {
  selectedMember: FamilyMember | null;
  docCount: number;
  onSelectChipPrompt: (prompt: string) => void;
  onUploadDocument?: () => void;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  selectedMember,
  docCount,
  onSelectChipPrompt,
  onUploadDocument,
}) => {
  const memberName = selectedMember ? selectedMember.name : 'this profile';

  const promptSuggestions = [
    {
      icon: Activity,
      title: 'Summarize Lab Panels',
      desc: 'Most recent bloodwork, serology screens, and flagged biomarker values',
      prompt: `Summarize the most recent lab tests and any flagged biomarkers for ${memberName}.`,
    },
    {
      icon: Pill,
      title: 'Current Prescriptions',
      desc: 'Active medications, dosages, and administration schedules',
      prompt: `What medications, dosages, and instructions are documented in ${memberName}'s records?`,
    },
    {
      icon: TrendingUp,
      title: 'Biomarker Trends',
      desc: 'Track changes in key markers over time (cholesterol, glucose, etc.)',
      prompt: `Have any key markers (like cholesterol, blood sugar, or blood pressure) trended up or down over time for ${memberName}?`,
    },
    {
      icon: AlertCircle,
      title: 'Abnormal Observations',
      desc: 'Physician follow-ups, imaging anomalies, and pathological flags',
      prompt: `List any abnormal findings, clinical flags, or recommended physician follow-ups in ${memberName}'s documents.`,
    },
  ];

  if (docCount === 0 && selectedMember) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md mb-4 ring-4 ring-black/5 dark:ring-white/10"
          style={{ backgroundColor: selectedMember.avatar_color || '#14b8a6' }}
        >
          {selectedMember.name.charAt(0).toUpperCase()}
        </div>

        <h3 className="text-lg font-semibold text-primary mb-1">
          No records uploaded for {selectedMember.name}
        </h3>
        <p className="text-sm text-tertiary mb-6 leading-relaxed max-w-sm">
          Upload medical documents (lab reports, discharge summaries, or prescriptions) to consult and search across records.
        </p>

        {onUploadDocument && (
          <button
            type="button"
            onClick={onUploadDocument}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Documents for {selectedMember.name}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-2xl mx-auto my-auto select-none">
      {/* Profile Avatar & Badge */}
      <div className="relative mb-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md ring-4 ring-black/5 dark:ring-white/10"
          style={{ backgroundColor: selectedMember?.avatar_color || '#14b8a6' }}
        >
          {selectedMember ? selectedMember.name.charAt(0).toUpperCase() : <Sparkles className="w-7 h-7" />}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs ring-2 ring-surface">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-primary mb-1 tracking-tight">
        Chat with {memberName}'s Records
      </h2>
      <p className="text-xs text-tertiary mb-3 max-w-md leading-relaxed">
        Grounded directly in <span className="font-semibold text-secondary">{docCount} medical {docCount === 1 ? 'record' : 'records'}</span>. Strict zero cross-profile data leakage.
      </p>

      {/* Security provenance pill */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-recessed border border-border text-[11px] text-tertiary mb-8">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        <span>100% On-Device Search & Inference</span>
      </div>

      {/* Suggested Query Chips Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
        {promptSuggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectChipPrompt(item.prompt)}
              className="group p-3.5 rounded-2xl border border-border/80 bg-surface hover:bg-surface-recessed hover:border-teal-500/50 shadow-xs hover:shadow-sm transition-all text-left cursor-pointer flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {item.title}
                </div>
                <div className="text-[11px] text-tertiary line-clamp-2 mt-0.5 leading-snug">
                  {item.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
