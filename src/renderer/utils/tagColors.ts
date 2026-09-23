/**
 * Theme-matching color palette for clinical tags across MedBuddy.
 * Matches Tailwind color scales: sage, vault, teal, violet, amber, ink.
 */
export interface TagColorStyle {
  bg: string;
  border: string;
  text: string;
  full: string;
}

export function getTagColorClass(tag: string): TagColorStyle {
  const lower = tag.toLowerCase().trim();

  // 1. Bloodwork / Hematology / Panels -> Sage (Health / Clinical Green)
  if (
    lower.includes('blood') ||
    lower.includes('cbc') ||
    lower.includes('lipid') ||
    lower.includes('metabolic') ||
    lower.includes('lft') ||
    lower.includes('serology') ||
    lower.includes('hematology') ||
    lower.includes('glucose') ||
    lower.includes('thyroid') ||
    lower.includes('lab')
  ) {
    return {
      bg: 'bg-sage-100/70 dark:bg-sage-950/50',
      border: 'border-sage-300 dark:border-sage-800',
      text: 'text-sage-700 dark:text-sage-300',
      full: 'bg-sage-100/70 border-sage-300 text-sage-700 dark:bg-sage-950/50 dark:border-sage-800 dark:text-sage-300',
    };
  }

  // 2. Radiology / Imaging -> Vault (Medical Slate / Blue)
  if (
    lower.includes('ct') ||
    lower.includes('mri') ||
    lower.includes('x-ray') ||
    lower.includes('xray') ||
    lower.includes('ultrasound') ||
    lower.includes('radiology') ||
    lower.includes('imaging') ||
    lower.includes('scan') ||
    lower.includes('birads')
  ) {
    return {
      bg: 'bg-vault-100/70 dark:bg-vault-950/50',
      border: 'border-vault-300 dark:border-vault-800',
      text: 'text-vault-700 dark:text-vault-300',
      full: 'bg-vault-100/70 border-vault-300 text-vault-700 dark:bg-vault-950/50 dark:border-vault-800 dark:text-vault-300',
    };
  }

  // 3. Medication / Prescription -> Teal (Pharmacy / Treatment)
  if (
    lower.includes('prescription') ||
    lower.includes('medication') ||
    lower.includes('rx') ||
    lower.includes('pharmacy') ||
    lower.includes('dispense') ||
    lower.includes('order')
  ) {
    return {
      bg: 'bg-teal-100/70 dark:bg-teal-950/50',
      border: 'border-teal-300 dark:border-teal-800',
      text: 'text-teal-700 dark:text-teal-300',
      full: 'bg-teal-100/70 border-teal-300 text-teal-700 dark:bg-teal-950/50 dark:border-teal-800 dark:text-teal-300',
    };
  }

  // 4. Oncology / Pathology / Genetics -> Violet (Specialty / Molecular)
  if (
    lower.includes('oncology') ||
    lower.includes('pathology') ||
    lower.includes('biopsy') ||
    lower.includes('cytology') ||
    lower.includes('molecular') ||
    lower.includes('cytogenetics') ||
    lower.includes('cancer') ||
    lower.includes('breast') ||
    lower.includes('fish')
  ) {
    return {
      bg: 'bg-violet-100/70 dark:bg-violet-950/50',
      border: 'border-violet-300 dark:border-violet-800',
      text: 'text-violet-700 dark:text-violet-300',
      full: 'bg-violet-100/70 border-violet-300 text-violet-700 dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-300',
    };
  }

  // 5. Cardiology / Cardiovascular -> Amber (Vital / Cardiovascular)
  if (
    lower.includes('cardio') ||
    lower.includes('cardiac') ||
    lower.includes('ecg') ||
    lower.includes('echo') ||
    lower.includes('heart')
  ) {
    return {
      bg: 'bg-amber-100/70 dark:bg-amber-950/50',
      border: 'border-amber-300 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      full: 'bg-amber-100/70 border-amber-300 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300',
    };
  }

  // 6. Clinical Note / OPD / Default Records -> Slate / Neutral
  return {
    bg: 'bg-surface-recessed',
    border: 'border-border',
    text: 'text-secondary dark:text-tertiary',
    full: 'bg-surface-recessed border-border text-secondary dark:text-tertiary',
  };
}
