import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Download, Globe, FileText, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { translate as translateApi } from '../services/api'

interface JobStatus {
  id: string
  status: string
  progress: number
  message: string
  error: string | null
}

const LANGUAGES = [
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
  { value: 'Chinese (Traditional)', label: 'Chinese (Traditional)' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'English', label: 'English' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Hebrew', label: 'Hebrew' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Persian', label: 'Persian (Farsi)' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Urdu', label: 'Urdu' },
]

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('English')
  const [dragOver, setDragOver] = useState(false)
  const [job, setJob] = useState<JobStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-6 h-6 text-ai-600" />
          Translate PDF
        </h1>
        <p className="text-sm text-gray-500 mt-1">Upload a PDF and translate it to another language while preserving the original layout</p>
      </div>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
            dragOver ? 'border-ai-400 bg-ai-50/80' : 'border-gray-200 hover:border-ai-300 hover:bg-gray-50'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ai-50 to-ai-100 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-ai-500" />
          </div>
          <p className="text-sm font-medium text-gray-700">Drop your PDF here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Preserves layout, images, and formatting</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ai-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-ai-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              disabled={!!job}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ai-500/20 focus:border-ai-400 outline-none transition-all disabled:opacity-50"
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {!job ? (
            <button
              onClick={startTranslation}
              disabled={submitting}
              className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-ai-600 to-ai-500 rounded-xl hover:from-ai-700 hover:to-ai-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Starting...' : 'Start Translation'}
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {job.status === 'processing' || job.status === 'queued' ? (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-ai-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">{job.message}</p>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ai-500 to-ai-400 rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{job.progress}%</p>
                </div>
              ) : job.status === 'completed' ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-3">Translation complete!</p>
                  <div className="flex gap-3 justify-center">
                    <a
                      href={translateApi.downloadUrl(job.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-ai-600 to-ai-500 rounded-lg hover:from-ai-700 hover:to-ai-600 shadow-sm hover:shadow-md transition-all"
                    >
                      <Download className="w-4 h-4" /> Download Translated PDF
                    </a>
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" /> Translate Another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Translation failed</p>
                  <p className="text-xs text-red-500 mt-1">{job.error || job.message}</p>
                  <button onClick={reset} className="mt-3 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
