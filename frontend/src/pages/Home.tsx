import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Send, FileText, MessageSquare, ChevronDown, LogIn, X, Sparkles, Shield, Zap, CheckCircle, ArrowRight, Globe, Star, BookOpen, Languages, Search, ScanLine, FileEdit, Download, ChevronRight } from 'lucide-react'
import UpgradeDialog from '../components/UpgradeDialog'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'

interface Source { filename: string; page_number: number }
interface Message { id: string; role: string; content: string; timestamp: number }

const ACTIONS = [
  { value: 'qna', label: 'Q&A', icon: MessageSquare },
  { value: 'summarize', label: 'Summarize', icon: FileText },
  { value: 'draft', label: 'Draft', icon: FileText },
  { value: 'rewrite', label: 'Rewrite', icon: FileEdit },
  { value: 'translate', label: 'Translate', icon: Globe },
  { value: 'extract', label: 'Extract', icon: FileText },
  { value: 'compare', label: 'Compare', icon: FileText },
  { value: 'generate', label: 'Generate', icon: Sparkles },
]

const FEATURES_LIST = [
  { icon: MessageSquare, title: 'AI Chat', desc: 'Ask questions and get instant answers from your PDF documents using natural language.' },
  { icon: Languages, title: 'PDF Translation', desc: 'Translate entire PDFs into any language while preserving the original layout and formatting.' },
  { icon: BookOpen, title: 'AI Summary', desc: 'Generate concise summaries of long documents in seconds with one click.' },
  { icon: Search, title: 'Smart Search', desc: 'Find exactly what you need across multiple documents with semantic search.' },
  { icon: ScanLine, title: 'OCR', desc: 'Extract text from scanned PDFs and images with accurate optical character recognition.' },
  { icon: FileEdit, title: 'Rewrite Documents', desc: 'Rephrase, reformat, and improve your document content with AI assistance.' },
]

function useOnScreen(ref: React.RefObject<HTMLElement>, rootMargin = '0px') {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { rootMargin })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, rootMargin])
  return visible
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null!)
  const visible = useOnScreen(ref)
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [filename, setFilename] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState('qna')
  const [showActions, setShowActions] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'translate'>('chat')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const actionRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setShowActions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (sessionId && inputRef.current) inputRef.current.focus()
  }, [sessionId])

  const simulateProgress = useCallback(() => {
    setUploadProgress(10)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) { clearInterval(interval); return 85 }
        return prev + Math.floor(Math.random() * 12) + 3
      })
    }, 400)
    return interval
  }, [])

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB')
      return
    }
    setError(null)
    setUploading(true)
    setUploadProgress(0)
    setSessionId(null)
    setMessages([])
    setSources([])

    const progressInterval = simulateProgress()

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post('/api/home/upload', form)
      const d = res.data.data
      setUploadProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setSessionId(d.session_id)
      setFilename(d.filename)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      clearInterval(progressInterval)
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !sessionId || loading) return
    setLoading(true)
    const userMsg: Message = { id: 'q-' + Date.now(), role: 'user', content: question, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    try {
      const params = new URLSearchParams()
      params.append('session_id', sessionId)
      params.append('question', userMsg.content)
      params.append('action', action)
      const res = await axios.post('/api/home/chat', params)
      const d = res.data.data
      await new Promise(r => setTimeout(r, 200))
      setMessages(prev => [...prev, { id: 'a-' + Date.now(), role: 'assistant', content: d.answer, timestamp: Date.now() }])
      setSources(d.sources || [])
    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'e-' + Date.now(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const resetSession = () => {
    setSessionId(null)
    setMessages([])
    setSources([])
    setError(null)
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const currentAction = ACTIONS.find(a => a.value === action)

  if (sessionId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-surface-dark flex flex-col">
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
          <div className="bg-white dark:bg-surface-card-dark border-b border-border dark:border-border-dark/80 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-pdf-50 dark:bg-pdf-900/30 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-pdf-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary-dark truncate">{filename}</p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Ready to answer your questions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetSession}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> New Document
              </button>
              <Link
                to={user ? '/app/dashboard' : '/register'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-xl hover:from-pdf-700 hover:to-pdf-600 transition-all"
              >
                {user ? 'Dashboard' : 'Sign Up'} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center mt-16 sm:mt-24 text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 dark:from-pdf-900/30 dark:to-pdf-800/20 flex items-center justify-center mb-4">
                    <MessageSquare className="w-7 h-7 text-pdf-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary-dark mb-1">Ask anything about your document</h3>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark max-w-sm">
                    Try asking a question, requesting a summary, or extracting key information
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6 justify-center">
                    {['Summarize this document', 'What are the main points?', 'Extract action items'].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuestion(suggestion); if (inputRef.current) inputRef.current.focus() }}
                        className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-gray-50 dark:bg-gray-800 border border-border dark:border-border-dark rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-text-primary-dark transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                const isFirst = i === 0 || messages[i - 1]?.role !== msg.role
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-2' : 'mt-0'} animate-slide-up`}>
                    <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                      {isFirst && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isUser ? 'bg-pdf-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-text-secondary-dark'}`}>
                          {isUser ? 'U' : 'AI'}
                        </div>
                      )}
                      <div className={`${isFirst ? '' : 'ml-10'}`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${isUser ? 'bg-pdf-600 text-white' : 'bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark text-gray-900 dark:text-text-primary-dark shadow-soft'}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {isFirst && (
                          <p className={`text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {loading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-text-secondary dark:text-text-secondary-dark flex-shrink-0 mt-0.5">AI</div>
                    <div className="bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3 shadow-soft">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-pdf-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-pdf-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-pdf-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEnd} />
            </div>
          </div>

          {sources.length > 0 && (
            <div className="border-t border-border dark:border-border-dark bg-gray-50/80 dark:bg-gray-900/50 px-4 sm:px-6 lg:px-8 py-2.5 flex-shrink-0">
              <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto">
                <FileText className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark flex-shrink-0">Sources:</span>
                <div className="flex gap-1.5">
                  {sources.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-md text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark whitespace-nowrap">
                      {s.filename} <span className="text-gray-300 dark:text-gray-600">·</span> p.{s.page_number}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border dark:border-border-dark bg-white dark:bg-surface-card-dark px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative" ref={actionRef}>
                  <button
                    type="button"
                    onClick={() => setShowActions(!showActions)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-pdf-600 bg-pdf-50 dark:bg-pdf-900/30 border border-pdf-100 dark:border-pdf-800 rounded-xl hover:bg-pdf-100 dark:hover:bg-pdf-900/50 transition-all"
                  >
                    {currentAction && <currentAction.icon className="w-3 h-3" />}
                    {currentAction?.label || 'Q&A'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showActions ? 'rotate-180' : ''}`} />
                  </button>
                  {showActions && (
                    <div className="absolute bottom-full mb-1.5 left-0 bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 z-10 w-44 py-1 animate-scale-in">
                      <div className="px-3 py-1.5 text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">Action Mode</div>
                      {ACTIONS.map(a => {
                        const Icon = a.icon
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => { setAction(a.value); setShowActions(false) }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${action === a.value ? 'bg-pdf-50 dark:bg-pdf-900/30 text-pdf-700 dark:text-pdf-400 font-medium' : 'text-text-secondary dark:text-text-secondary-dark hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {a.label}
                            {action === a.value && <CheckCircle className="w-3 h-3 ml-auto text-pdf-500" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-text-secondary dark:text-text-secondary-dark hidden sm:inline">
                  {currentAction && currentAction.label !== 'Q&A' ? 'Mode: ' + currentAction?.label : 'Ask questions about your document'}
                </span>
              </div>
              <form onSubmit={submitQuestion} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Type your question or request..."
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-white dark:bg-surface-card-dark border border-border dark:border-gray-600 rounded-2xl text-sm text-gray-900 dark:text-text-primary-dark placeholder-text-secondary/50 focus:ring-2 focus:ring-pdf-500/20 focus:border-pdf-400 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-2xl hover:from-pdf-700 hover:to-pdf-600 disabled:from-gray-300 disabled:to-gray-300 shadow-soft hover:shadow-soft-md transition-all disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
        <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-surface-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-border/80 dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pdf-500 to-pdf-700 flex items-center justify-center shadow-soft group-hover:shadow-soft-md transition-shadow">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-text-primary-dark tracking-tight">DocAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <a href="#features" className="btn-ghost">Features</a>
            <a href="#how-it-works" className="btn-ghost">How it Works</a>
            <button onClick={() => setShowUpgrade(true)} className="btn-ghost">
              <Sparkles className="w-4 h-4 text-ai-600" /> Pro
            </button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden sm:inline-flex btn-ghost">
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
            <Link
              to={user ? '/app/dashboard' : '/register'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-xl hover:from-pdf-700 hover:to-pdf-600 shadow-soft hover:shadow-soft-md hover:scale-[1.02] transition-all"
            >
              {user ? 'Dashboard' : 'Get Started'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-16 sm:pt-20 pb-8 sm:pb-12">
          <div className="absolute inset-0 bg-gradient-to-br from-pdf-50/60 via-transparent to-ai-50/40 dark:from-pdf-950/20 dark:to-ai-950/20" />
          <div className="absolute top-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-pdf-200/20 to-ai-200/20 blur-3xl" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[25%] h-[25%] rounded-full bg-gradient-to-br from-ai-200/20 to-pdf-200/20 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pdf-50 dark:bg-pdf-900/30 border border-pdf-100 dark:border-pdf-800 rounded-full text-xs font-semibold text-pdf-600 dark:text-pdf-400 mb-5">
                  <Sparkles className="w-3.5 h-3.5" /> No sign-up required
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-text-primary-dark tracking-tight leading-[1.1]">
                  Your AI Assistant for{' '}
                  <span className="bg-gradient-to-r from-pdf-600 via-ai-600 to-pdf-600 bg-clip-text text-transparent">
                    Every PDF
                  </span>
                </h1>
                <p className="mt-5 text-lg sm:text-xl text-text-secondary dark:text-text-secondary-dark max-w-xl leading-relaxed">
                  Chat, translate, summarize, rewrite, and extract information from your PDF documents in seconds.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-8">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-pdf-600 rounded-2xl hover:bg-pdf-700 hover:scale-[1.02] shadow-soft hover:shadow-soft-md transition-all"
                  >
                    <Upload className="w-4 h-4" /> Upload PDF
                  </button>
                  <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-gray-700 dark:text-text-primary-dark border-2 border-border dark:border-border-dark rounded-2xl hover:border-pdf-300 dark:hover:border-pdf-700 hover:bg-pdf-50/50 dark:hover:bg-pdf-900/10 hover:scale-[1.02] transition-all">
                    <Sparkles className="w-4 h-4" /> Try Demo
                  </a>
                </div>
              </div>

              {/* App Preview */}
              <div className="hidden lg:block animate-fade-in">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pdf-500/20 to-ai-500/20 rounded-3xl blur-xl" />
                  <div className="relative bg-white dark:bg-surface-card-dark rounded-2xl border border-border dark:border-border-dark shadow-soft-lg overflow-hidden">
                    <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border dark:border-border-dark">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <div className="ml-4 flex-1 max-w-[200px] mx-auto">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1 text-xs text-text-secondary dark:text-text-secondary-dark text-center truncate">report_q4_analysis.pdf</div>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-text-secondary dark:text-text-secondary-dark flex-shrink-0">U</div>
                        <div className="bg-pdf-600 text-white rounded-2xl rounded-es-sm px-4 py-2.5 text-sm leading-relaxed max-w-[80%]">
                          Summarize this document in 3 bullet points
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-pdf-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">AI</div>
                        <div className="bg-gray-50 dark:bg-gray-800 border border-border dark:border-border-dark rounded-2xl rounded-ee-sm px-4 py-2.5 text-sm leading-relaxed text-gray-900 dark:text-text-primary-dark max-w-[85%]">
                          <p className="font-medium text-pdf-600 mb-1">Here's your summary:</p>
                          <ul className="space-y-1 list-disc list-inside text-text-secondary dark:text-text-secondary-dark">
                            <li>Q4 revenue grew 34% YoY driven by enterprise segment expansion</li>
                            <li>Operating margins improved to 28.3% with cost optimization initiatives</li>
                            <li>New product launch expected in Q1 with projected $12M ARR contribution</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-border dark:border-border-dark">
                        <input type="text" readOnly value="Ask a follow-up question..." className="flex-1 bg-transparent text-sm text-text-secondary outline-none" />
                        <div className="w-8 h-8 rounded-xl bg-pdf-600 flex items-center justify-center">
                          <Send className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Area */}
        <Section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group cursor-pointer rounded-3xl border-2 border-dashed p-10 sm:p-16 text-center transition-all duration-300 ${
                dragOver
                  ? 'border-pdf-400 bg-pdf-50/80 dark:bg-pdf-900/20 scale-[1.02] shadow-premium'
                  : 'border-gray-200 dark:border-gray-700 hover:border-pdf-300 hover:bg-pdf-50/30 dark:hover:bg-pdf-900/10 hover:shadow-premium'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} hidden />

              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-pdf-50 dark:bg-pdf-900/30 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-pdf-500" />
                    </div>
                    <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#fee2e2" strokeWidth="3.5" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#dc2626" strokeWidth="3.5" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - uploadProgress / 100)}`} strokeLinecap="round" className="transition-all duration-300" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900 dark:text-text-primary-dark">Processing your document...</p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-0.5">Analyzing and indexing content</p>
                  </div>
                  <div className="w-full max-w-[240px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pdf-500 to-pdf-400 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pdf-50 to-pdf-100 dark:from-pdf-900/30 dark:to-pdf-800/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-pdf-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-text-primary-dark">
                      {dragOver ? 'Drop your file here' : 'Drop your PDF here'}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
                      or <span className="text-pdf-600 font-medium hover:underline">click to browse</span>
                    </p>
                    <p className="text-xs text-text-secondary/60 dark:text-text-secondary-dark/60 mt-3">
                      Supports PDF files up to 50MB &mdash; processed in memory, nothing stored permanently
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 max-w-2xl mx-auto flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-2xl animate-slide-up">
                <X className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Interactive Tabs */}
        <Section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
            <div className="flex items-center justify-center gap-2 p-1.5 bg-white dark:bg-surface-card-dark border border-border dark:border-border-dark rounded-2xl shadow-soft w-fit mx-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`relative px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeTab === 'chat'
                    ? 'bg-pdf-600 text-white shadow-soft'
                    : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Chat
              </button>
              <Link
                to="/translate"
                className={`relative px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeTab === 'translate'
                    ? 'bg-pdf-600 text-white shadow-soft'
                    : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark'
                }`}
              >
                <Globe className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Translate
              </Link>
            </div>
            <p className="text-center text-sm text-text-secondary dark:text-text-secondary-dark mt-4 max-w-xl mx-auto">
              {activeTab === 'chat'
                ? 'Upload any PDF and start asking questions. Get instant answers with source references.'
                : 'Translate entire PDFs into any language while preserving the original formatting and layout.'}
            </p>
          </div>
        </Section>

        {/* Features */}
        <section id="features" className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Section>
              <div className="text-center mb-10 sm:mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-text-primary-dark tracking-tight">
                  Everything you need to work with PDFs
                </h2>
                <p className="mt-3 text-lg text-text-secondary dark:text-text-secondary-dark max-w-2xl mx-auto">
                  Six powerful AI tools in one platform. No switching between apps.
                </p>
              </div>
            </Section>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {FEATURES_LIST.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <Section key={i}>
                    <div className="group bg-white dark:bg-surface-card-dark rounded-2xl border border-border dark:border-border-dark p-6 hover:border-pdf-200 dark:hover:border-pdf-800 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 dark:from-pdf-900/30 dark:to-pdf-800/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-pdf-100 group-hover:to-pdf-200 dark:group-hover:from-pdf-900/50 dark:group-hover:to-pdf-800/30 transition-all duration-300">
                        <Icon className="w-5 h-5 text-pdf-600" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-text-primary-dark mb-1.5">{feature.title}</h3>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-dark leading-relaxed">{feature.desc}</p>
                    </div>
                  </Section>
                )
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Section>
              <div className="text-center mb-10 sm:mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-text-primary-dark tracking-tight">
                  How it works
                </h2>
                <p className="mt-3 text-lg text-text-secondary dark:text-text-secondary-dark max-w-2xl mx-auto">
                  Three simple steps to get started with your document.
                </p>
              </div>
            </Section>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-12 relative">
              {[
                { icon: Upload, title: 'Upload PDF', desc: 'Drag and drop or click to upload any PDF document.' },
                { icon: Sparkles, title: 'AI Analyzes', desc: 'Our AI reads and indexes your document in seconds.' },
                { icon: MessageSquare, title: 'Chat & Export', desc: 'Ask questions, get summaries, or download results.' },
              ].map((step, i) => {
                const Icon = step.icon
                return (
                  <Section key={i}>
                    <div className="text-center relative">
                      {i < 2 && (
                        <div className="hidden sm:block absolute top-10 left-[60%] w-[80%]">
                          <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
                          <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        </div>
                      )}
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pdf-50 to-ai-50 dark:from-pdf-900/30 dark:to-ai-900/20 flex items-center justify-center mx-auto mb-5 shadow-soft">
                        <Icon className="w-8 h-8 text-pdf-600" />
                      </div>
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pdf-600 text-white text-xs font-bold mb-3">0{i + 1}</div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-1.5">{step.title}</h3>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-dark max-w-xs mx-auto">{step.desc}</p>
                    </div>
                  </Section>
                )
              })}
            </div>
          </div>
        </section>

        {/* Premium Section */}
        <Section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pdf-600 via-pdf-700 to-ai-700 p-8 sm:p-12 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold text-white/90 mb-5">
                  <Sparkles className="w-3 h-3" /> Pro Plan
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">Unlock Unlimited AI</h2>
                <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto mb-8">
                  Get unlimited access to all features with priority processing.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-8">
                  {[
                    'Unlimited documents',
                    'Unlimited pages',
                    'Translate entire PDFs',
                    'OCR support',
                    'Priority processing',
                    'Faster AI responses',
                  ].map(b => (
                    <div key={b} className="flex items-center gap-2.5 text-sm text-white/90">
                      <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                      {b}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-pdf-700 bg-white rounded-2xl hover:bg-gray-100 hover:scale-[1.02] shadow-lg transition-all"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Social Proof */}
        <Section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-border dark:border-border-dark p-8 sm:p-12 text-center shadow-soft">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-text-primary-dark">10,000+</p>
                  <p className="text-sm text-text-secondary mt-1">Documents Processed</p>
                </div>
                <div className="hidden sm:block w-px bg-border dark:bg-border-dark mx-auto" />
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-text-primary-dark">98%</p>
                  <p className="text-sm text-text-secondary mt-1">User Satisfaction</p>
                </div>
                <div className="hidden sm:block w-px bg-border dark:bg-border-dark mx-auto" />
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-text-primary-dark">50K+</p>
                  <p className="text-sm text-text-secondary mt-1">Questions Answered</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary/70 mt-6 max-w-md mx-auto">
                Trusted by students, researchers, and professionals worldwide.
              </p>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-text-primary-dark tracking-tight mb-3">
              Ready to transform how you work with PDFs?
            </h2>
            <p className="text-base text-text-secondary dark:text-text-secondary-dark mb-6">
              Upload your first document free. No credit card required.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-pdf-600 rounded-2xl hover:bg-pdf-700 hover:scale-[1.02] shadow-soft hover:shadow-soft-md transition-all"
            >
              <Upload className="w-4 h-4" /> Upload Your PDF
            </button>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border dark:border-border-dark bg-white dark:bg-surface-card-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pdf-500 to-pdf-700 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold text-gray-900 dark:text-text-primary-dark">DocAI</span>
              </div>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark leading-relaxed max-w-xs">
                Your AI assistant for every PDF. Chat, translate, summarize, and extract — all in one place.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-text-primary-dark uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'How it Works', 'Pricing', 'FAQ'].map(item => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm text-text-secondary hover:text-pdf-600 dark:hover:text-pdf-400 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-text-primary-dark uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy', 'Terms', 'Security'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-sm text-text-secondary hover:text-pdf-600 dark:hover:text-pdf-400 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-text-primary-dark uppercase tracking-wider mb-4">Connect</h4>
              <ul className="space-y-2.5">
                <li><a href="mailto:lokmankai.lonas@gmail.com" className="text-sm text-text-secondary hover:text-pdf-600 dark:hover:text-pdf-400 transition-colors">Contact</a></li>
                <li><a href="#" className="text-sm text-text-secondary hover:text-pdf-600 dark:hover:text-pdf-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="text-sm text-text-secondary hover:text-pdf-600 dark:hover:text-pdf-400 transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-secondary dark:text-text-secondary-dark">
            <span>&copy; 2026 DocAI. All rights reserved.</span>
            <span>Created by <a href="mailto:lokmankai.lonas@gmail.com" className="hover:text-pdf-600 transition-colors">Lounes Lokmane</a></span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-pdf-600 transition-colors">Sign In</Link>
              <Link to={user ? '/app/dashboard' : '/register'} className="hover:text-pdf-600 transition-colors">{user ? 'Dashboard' : 'Create Account'}</Link>
            </div>
          </div>
        </div>
      </footer>

      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}
