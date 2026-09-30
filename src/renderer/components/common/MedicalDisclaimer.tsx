import { ShieldCheck } from 'lucide-react'

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex items-start gap-1.5 text-[10px] leading-[15px] text-tertiary">
        <ShieldCheck size={12} strokeWidth={1.6} className="mt-0.5 shrink-0 text-sage-600 dark:text-sage-300" aria-hidden="true" />
        <span>Organized records only. Not medical advice.</span>
      </p>
    )
  }

  return (
    <section className="lab-band flex items-start gap-3 px-4 py-3" aria-label="Medical disclaimer">
      <ShieldCheck size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-sage-600 dark:text-sage-300" aria-hidden="true" />
      <div>
        <p className="text-[12px] font-semibold text-primary">Clinical decision support only</p>
        <p className="mt-0.5 text-[11px] leading-4 text-secondary">MedBuddy organizes records and helps prepare questions. It does not diagnose, treat, or replace a qualified clinician.</p>
      </div>
    </section>
  )
}
