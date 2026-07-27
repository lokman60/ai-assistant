import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Download, Globe, FileText, CheckCircle, XCircle, Loader2, ArrowLeft, ChevronDown, Languages } from 'lucide-react'
import { translate as translateApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

interface JobStatus {
  id: string
  status: string
  progress: number
  message: string
  error: string | null
}

const LANGUAGES = [
  { value: 'Arabic', label: 'Arabic', native: 'العربية' },
  { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)', native: '简体中文' },
  { value: 'Chinese (Traditional)', label: 'Chinese (Traditional)', native: '繁體中文' },
  { value: 'Dutch', label: 'Dutch', native: 'Nederlands' },
  { value: 'English', label: 'English', native: 'English' },
  { value: 'French', label: 'French', native: 'Français' },
  { value: 'German', label: 'German', native: 'Deutsch' },
  { value: 'Hebrew', label: 'Hebrew', native: 'עברית' },
  { value: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { value: 'Italian', label: 'Italian', native: 'Italiano' },
  { value: 'Japanese', label: 'Japanese', native: '日本語' },
  { value: 'Korean', label: 'Korean', native: '한국어' },
  { value: 'Persian', label: 'Persian (Farsi)', native: 'فارسی' },
  { value: 'Portuguese', label: 'Portuguese', native: 'Português' },
  { value: 'Russian', label: 'Russian', native: 'Русский' },
  { value: 'Spanish', label: 'Spanish', native: 'Español' },
  { value: 'Turkish', label: 'Turkish', native: 'Türkçe' },
  { value: 'Urdu', label: 'Urdu', native: 'اردو' },
]

export default function TranslatePage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('English')
  const [dragOver, setDragOver] = useState(false)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showLang, setShowLang] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { alert('Only PDF files are supported'); return }
    setFile(f)
    setJob(null)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const startTranslation = async () => {
    if (!file) return
    setSubmitting(true)
    setJob({ id: '', status: 'queued', progress: 0, message: 'Starting...', error: null })
    try {
      const res = await translateApi.start(file, language)
      const jobId = res.data.data.job_id
      const poll = setInterval(async () => {
        try {
          const s = await translateApi.status(jobId)
          const j = s.data.data
          setJob(j)
          if (j.status === 'completed' || j.status === 'failed') clearInterval(poll)
        } catch { clearInterval(poll) }
      }, 1000)
    } catch (err: any) {
      setJob({ id: '', status: 'failed', progress: 0, message: err.response?.data?.message || err.message, error: err.message })
      setSubmitting(false)
    }
  }

  const reset = () => {
    setFile(null); setJob(null); setSubmitting(false)
  }

  const currentLang = LANGUAGES.find(l => l.value === language)

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-surface-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-pdf-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-text-primary-dark tracking-tight">
                Translate PDF
              </h1>
            </div>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark ml-[52px]">
              Upload a PDF and translate it to another language while preserving the original layout
            </p>
          </div>
          {!user && (
            <Link
              to="/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-pdf-600 rounded-xl hover:bg-pdf-700 hover:scale-[1.02] shadow-soft transition-all"
            >
              Sign Up <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          )}
        </div>

        {!file ? (
          /* Upload Area */
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-3xl border-2 border-dashed p-12 sm:p-16 text-center transition-all duration-300 ${
              dragOver
                ? 'border-pdf-400 bg-pdf-50/80 dark:bg-pdf-900/20 scale-[1.02] shadow-premium'
                : 'border-gray-200 dark:border-gray-700 hover:border-pdf-300 dark:hover:border-pdf-700 hover:bg-pdf-50/30 dark:hover:bg-pdf-900/10 hover:shadow-premium'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-8 h-8 text-pdf-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-text-primary-dark">
                  Drop your PDF here
                </p>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
                  or <span className="text-pdf-600 font-medium hover:underline">click to browse</span>
                </p>
                <p className="text-xs text-text-secondary/60 dark:text-text-secondary-dark/60 mt-3">
                  Preserves layout, images, and formatting &mdash; PDF only
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* File Selected */
          <div className="space-y-5 animate-fade-in">
            {/* File Card */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-border dark:border-border-dark p-5 flex items-center gap-4 shadow-soft">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-pdf-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary-dark truncate">{file.name}</p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={reset}
                disabled={!!job && job.status === 'processing'}
                className="text-xs font-medium text-text-secondary hover:text-red-500 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            {/* Language Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-text-primary-dark mb-2">
                Target Language
              </label>
              <div className="relative" ref={langRef}>
                <button
                  type="button"
                  onClick={() => setShowLang(!showLang)}
                  disabled={!!job}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-2xl text-sm text-gray-900 dark:text-text-primary-dark hover:border-pdf-300 dark:hover:border-pdf-700 focus:ring-2 focus:ring-pdf-500/20 focus:border-pdf-400 outline-none transition-all disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-pdf-600" />
                    {currentLang?.native || language}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${showLang ? 'rotate-180' : ''}`} />
                </button>
                {showLang && (
                  <div className="absolute mt-1.5 w-full bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 z-10 max-h-60 overflow-y-auto py-1 animate-scale-in">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => { setLanguage(l.value); setShowLang(false) }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          language === l.value
                            ? 'bg-pdf-50 dark:bg-pdf-900/30 text-pdf-700 dark:text-pdf-400 font-medium'
                            : 'text-gray-700 dark:text-text-secondary-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span>{l.native}</span>
                        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action / Status */}
            {!job ? (
              <button
                onClick={startTranslation}
                disabled={submitting}
                className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-pdf-600 to-ai-600 rounded-2xl hover:from-pdf-700 hover:to-ai-700 hover:scale-[1.01] shadow-soft hover:shadow-soft-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                ) : (
                  <><Globe className="w-4 h-4" /> Start Translation</>
                )}
              </button>
            ) : (
              <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-border dark:border-border-dark p-8 shadow-soft animate-fade-in">
                {job.status === 'processing' || job.status === 'queued' ? (
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full bg-pdf-50 dark:bg-pdf-900/30 animate-ping opacity-30" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 text-pdf-600 animate-spin" />
                      </div>
                    </div>
                    <p className="text-base font-semibold text-gray-900 dark:text-text-primary-dark">{job.message}</p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
                      Translating your document while preserving layout...
                    </p>
                    <div className="mt-5 max-w-xs mx-auto">
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pdf-500 to-ai-500 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1.5 text-right">{job.progress}%</p>
                    </div>
                  </div>
                ) : job.status === 'completed' ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-1">
                      Translation complete!
                    </p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
                      Your translated PDF is ready to download
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href={translateApi.downloadUrl(job.id)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pdf-600 to-ai-600 rounded-2xl hover:from-pdf-700 hover:to-ai-700 hover:scale-[1.02] shadow-soft hover:shadow-soft-md transition-all"
                      >
                        <Download className="w-4 h-4" /> Download Translated PDF
                      </a>
                      <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-text-primary-dark bg-white dark:bg-surface-card-dark border-2 border-border dark:border-border-dark rounded-2xl hover:border-pdf-300 dark:hover:border-pdf-700 hover:bg-pdf-50/50 dark:hover:bg-pdf-900/10 hover:scale-[1.02] transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" /> Translate Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-1">
                      Translation failed
                    </p>
                    <p className="text-sm text-red-500 dark:text-red-400 mb-6 max-w-sm mx-auto">{job.error || job.message}</p>
                    <button
                      onClick={reset}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-text-primary-dark bg-white dark:bg-surface-card-dark border-2 border-border dark:border-border-dark rounded-2xl hover:border-pdf-300 dark:hover:border-pdf-700 hover:bg-pdf-50/50 dark:hover:bg-pdf-900/10 hover:scale-[1.02] transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" /> Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: FileText, title: 'Layout Preserved', desc: 'Original formatting, images, and structure are maintained in your translated PDF.' },
            { icon: Languages, title: '18+ Languages', desc: 'Support for all major languages including Arabic, Chinese, Japanese, and more.' },
            { icon: CheckCircle, title: 'High Quality', desc: 'Powered by advanced AI models for accurate, context-aware translations.' },
          ].map((info, i) => {
            const Icon = info.icon
            return (
              <div key={i} className="bg-white dark:bg-surface-card-dark rounded-2xl border border-border dark:border-border-dark p-5 shadow-soft">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-pdf-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-text-primary-dark mb-1">{info.title}</h3>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed">{info.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
