import { X, Check, Zap, ArrowRight } from 'lucide-react'

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
  feature?: string
}

const PRO_FEATURES = [
  'Unlimited documents & pages',
  'Preserve original PDF layout in translation',
  'Batch translation',
  'Faster processing',
  'Unlimited AI chat',
  'Export to PDF & Word',
  'OCR for scanned PDFs',
  'Priority processing',
  'Future premium AI features',
]

export default function UpgradeDialog({ open, onClose, feature }: UpgradeDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-card-dark rounded-3xl shadow-premium max-w-lg w-full p-8 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 dark:from-pdf-900/30 dark:to-pdf-800/30 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-pdf-600" />
        </div>

        <h2 className="text-xl font-bold text-center text-text-primary dark:text-text-primary-dark mb-1">
          Upgrade to Pro
        </h2>

        {feature && (
          <p className="text-sm text-text-secondary text-center mb-5">
            <span className="text-pdf-600 font-medium">{feature}</span> is a Pro feature
          </p>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-6 space-y-3">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-ai-100 dark:bg-ai-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-ai-600" />
              </div>
              <span className="text-sm text-text-primary dark:text-text-primary-dark">{f}</span>
            </div>
          ))}
        </div>

        <button className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-xl hover:from-pdf-700 hover:to-pdf-600 shadow-soft hover:shadow-premium transition-all duration-200 flex items-center justify-center gap-2">
          Upgrade to Pro <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-text-secondary text-center mt-3">
          Pro plan access is free during the preview period
        </p>
      </div>
    </div>
  )
}
