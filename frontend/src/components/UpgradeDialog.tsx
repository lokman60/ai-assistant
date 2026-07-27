import { X, Check, Zap, ArrowRight, FileText, MessageSquare, Search, Languages } from 'lucide-react'
import { subscription } from '../services/api'

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
  feature?: string
  limit?: number
  pages?: number
}

const PRO_FEATURES = [
  'Unlimited documents & pages',
  'Unlimited PDF translation',
  'Unlimited AI chat',
  'Unlimited summarization',
  'OCR for scanned PDFs',
  'Priority processing',
  'Future premium AI features',
]

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  pdf_translation: <Languages className="w-5 h-5" />,
  chat: <MessageSquare className="w-5 h-5" />,
  summarization: <FileText className="w-5 h-5" />,
  search: <Search className="w-5 h-5" />,
}

const FEATURE_LABELS: Record<string, string> = {
  pdf_translation: 'PDF Translation',
  chat: 'AI Chat',
  summarization: 'AI Summarization',
  search: 'Document Search',
}

export default function UpgradeDialog({ open, onClose, feature, limit, pages }: UpgradeDialogProps) {
  if (!open) return null

  const label = (feature && FEATURE_LABELS[feature]) || feature || 'this feature'
  const icon = feature ? FEATURE_ICONS[feature] : <Zap className="w-5 h-5" />

  const handleUpgrade = async () => {
    try {
      await subscription.upgrade()
      onClose()
      window.location.reload()
    } catch {
      // silent
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-dark rounded-3xl shadow-premium max-w-lg w-full p-8 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 dark:from-pdf-900/30 dark:to-pdf-800/30 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>

        <h2 className="text-xl font-bold text-center text-text-primary dark:text-text-primary-dark mb-1">
          {feature === 'pdf_translation' ? 'PDF Translation Available' : 'Free Plan Limit'}
        </h2>

        {feature && (
          <p className="text-sm text-text-secondary text-center mb-5">
            <span className="text-pdf-600 font-medium">{label}</span> is{' '}
            {feature === 'pdf_translation' ? (
              <>available with a <span className="font-semibold">{limit}-page</span> limit per document</>
            ) : (
              <>limited to <span className="font-semibold">{limit} {limit === 1 ? 'page' : 'pages'}</span> per document</>
            )}
            {pages && pages > (limit || 0) && (
              <span> — this document has <span className="font-semibold">{pages} pages</span></span>
            )}
          </p>
        )}

        <p className="text-sm text-text-secondary text-center mb-5 -mt-2">
          Upgrade to <span className="font-semibold text-ai-600">Pro</span> to remove all limits and unlock priority processing.
        </p>

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

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium text-text-secondary bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Maybe Later
          </button>
          <button
            disabled
            className="flex-1 py-3 text-sm font-semibold text-white/60 bg-gradient-to-r from-gray-400 to-gray-400 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
          >
            Upgrade to Pro <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
