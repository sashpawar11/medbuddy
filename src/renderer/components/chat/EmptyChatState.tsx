import React from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Activity,
  Pill,
  TrendingUp,
  AlertCircle,
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
      prompt: `Summarize the most recent lab tests and any flagged biomarkers for ${memberName}.`,
    },
    {
      icon: Pill,
      title: 'Current Prescriptions',
      prompt: `What medications, dosages, and instructions are documented in ${memberName}'s records?`,
    },
    {
      icon: TrendingUp,
      title: 'Biomarker Trends',
      prompt: `Have any key markers (like cholesterol, blood sugar, or blood pressure) trended up or down over time for ${memberName}?`,
    },
    {
      icon: AlertCircle,
      title: 'Abnormal Findings',
      prompt: `List any abnormal findings, clinical flags, or recommended physician follow-ups in ${memberName}'s documents.`,
    },
  ];

  if (docCount === 0 && selectedMember) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md mb-4"
          style={{ backgroundColor: selectedMember.avatar_color || '#14b8a6' }}
        >
          {selectedMember.name.charAt(0).toUpperCase()}
        </div>

        <h3 className="text-lg font-semibold text-primary mb-1">
          No records uploaded for {selectedMember.name}
        </h3>
        <p className="text-sm text-tertiary mb-6 leading-relaxed">
          Upload medical documents (lab reports, discharge summaries, or prescriptions) to ask questions and extract answers from them.
        </p>

        {onUploadDocument && (
          <button
            type="button"
            onClick={onUploadDocument}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Documents for {selectedMember.name}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
      {/* Profile Avatar & Badge */}
      <div className="relative mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md"
          style={{ backgroundColor: selectedMember?.avatar_color || '#14b8a6' }}
        >
          {selectedMember ? selectedMember.name.charAt(0).toUpperCase() : <Sparkles className="w-6 h-6" />}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-primary mb-1.5">
        Chat with {memberName}'s Records
      </h2>
      <p className="text-sm text-tertiary mb-8 max-w-md leading-relaxed">
        Grounded directly in {docCount} medical record{docCount === 1 ? '' : 's'}. Responses strictly cite source documents with page numbers.
      </p>

      {/* Suggested Query Chips */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {promptSuggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectChipPrompt(item.prompt)}
              className="group p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-recessed hover:border-teal-500/50 shadow-xs transition-all text-left cursor-pointer flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-primary group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {item.title}
                </div>
                <div className="text-[11px] text-tertiary truncate mt-0.5">
                  {item.prompt}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
