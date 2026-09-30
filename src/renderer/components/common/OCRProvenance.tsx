import { Check, Cpu, FileText, Info, ScanLine, Sparkles, TriangleAlert } from 'lucide-react'

export type OCREngine = 'tesseract' | 'native' | 'vision' | 'none'
export type OCRConfidence = 'high' | 'medium' | 'low' | null | undefined

interface OCRProvenanceProps {
  ocrEngine?: OCREngine
  ocrConfidence?: OCRConfidence
  ocrPageCount?: number
  className?: string
}

const engineLabels: Record<OCREngine, string> = {
  tesseract: 'Tesseract',
  native: 'System OCR',
  vision: 'Vision-assisted',
  none: 'Text file',
}

const confidenceLabels: Record<'high' | 'medium' | 'low', string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

export function OCRProvenance({ ocrEngine = 'none', ocrConfidence, ocrPageCount, className = '' }: OCRProvenanceProps) {
  const EngineIcon = ocrEngine === 'none' ? FileText : ocrEngine === 'native' ? Cpu : ocrEngine === 'vision' ? Sparkles : ScanLine
  const hasOCR = ocrEngine !== 'none'
  const confidence = ocrConfidence === 'high' || ocrConfidence === 'medium' || ocrConfidence === 'low' ? ocrConfidence : null

  return (
    <section className={`instrument-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 ${className}`} aria-label="Text extraction provenance">
      <div className="flex min-w-0 items-center gap-2">
        <EngineIcon size={14} strokeWidth={1.7} className="shrink-0 text-vault-600 dark:text-vault-300" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-primary">{engineLabels[ocrEngine]}</span>
        {!hasOCR && <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-tertiary">No OCR applied</span>}
      </div>
      {ocrPageCount != null && hasOCR && (
        <span className="font-mono text-[10px] text-tertiary">{ocrPageCount} {ocrPageCount === 1 ? 'page' : 'pages'}</span>
      )}
      {confidence && (
        <div className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold ${
          confidence === 'high'
            ? 'border-sage-300 bg-sage-50 text-sage-700 dark:border-sage-700 dark:bg-[#172b21] dark:text-sage-100'
            : confidence === 'medium'
              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-[#302716] dark:text-amber-100'
              : 'border-clay-300 bg-clay-50 text-clay-700 dark:border-clay-700 dark:bg-[#351d19] dark:text-clay-100'
        }`}>
          {confidence === 'high' ? <Check size={11} /> : confidence === 'medium' ? <Info size={11} /> : <TriangleAlert size={11} />}
          {confidenceLabels[confidence]}
        </div>
      )}
    </section>
  )
}
