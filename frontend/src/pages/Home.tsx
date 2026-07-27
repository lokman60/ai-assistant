import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Send, FileText, MessageSquare, ChevronDown, LogIn, X, Sparkles, Shield, Zap, CheckCircle, ArrowRight, Globe } from 'lucide-react'
import axios from 'axios'

interface Source { filename: string; page_number: number }
interface Message { id: string; role: string; content: string; timestamp: number }

const ACTIONS = [
  { value: 'qna', label: 'Q&A', icon: MessageSquare },
  { value: 'summarize', label: 'Summarize', icon: FileText },
  { value: 'draft', label: 'Draft', icon: FileText },
  { value: 'rewrite', label: 'Rewrite', icon: FileText },
  { value: 'translate', label: 'Translate', icon: FileText },
  { value: 'extract', label: 'Extract', icon: FileText },
  { value: 'compare', label: 'Compare', icon: FileText },
  { value: 'generate', label: 'Generate', icon: Sparkles },
]

const FEATURES = [
  { icon: Zap, title: 'Instant Answers', desc: 'Upload a PDF and get answers from your documents in seconds' },
  { icon: Sparkles, title: 'Smart Actions', desc: 'Summarize, rewrite, translate, and extract — all powered by AI' },
  { icon: Shield, title: 'Your Privacy', desc: 'Documents are processed in memory. Nothing is stored permanently on our servers' },
]

export default function HomePage() {
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pdf-500 to-pdf-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">DocAI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-100 rounded-lg transition-all"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-lg hover:from-pdf-700 hover:to-pdf-600 shadow-sm hover:shadow-md transition-all"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!sessionId ? (
          <>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pdf-50/80 via-white to-ai-50/60" />
              <div className="absolute inset-0">
                <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-pdf-200/30 to-ai-200/20 blur-3xl animate-float" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-sky-200/30 to-pdf-200/20 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
              </div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
                <div className="animate-fade-in">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pdf-50 border border-pdf-100 rounded-full text-xs font-medium text-pdf-600 mb-6">
                    <Sparkles className="w-3.5 h-3.5" /> No sign-up required
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-[1.1]">
                    Chat with your
                    <span className="block mt-1 bg-gradient-to-r from-pdf-600 via-ai-600 to-pdf-600 bg-clip-text text-transparent">
                      documents instantly
                    </span>
                  </h1>
                  <p className="mt-5 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Upload a PDF and ask questions, summarize, rewrite, or extract information — all powered by AI, right in your browser.
                  </p>
                </div>

                {/* Features */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {FEATURES.map((feature, i) => {
                    const Icon = feature.icon
                    return (
                      <div key={i} className="group bg-white/70 backdrop-blur rounded-xl border border-gray-100 p-4 text-left hover:border-pdf-100 hover:shadow-sm transition-all animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="w-8 h-8 rounded-lg bg-pdf-50 flex items-center justify-center mb-2.5 group-hover:bg-pdf-100 transition-colors">
                          <Icon className="w-4 h-4 text-pdf-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{feature.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Mode Toggle */}
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {}}
                    className="px-5 py-2 text-sm font-medium rounded-xl bg-pdf-600 text-white shadow-soft"
                  >
                    <MessageSquare className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Chat
                  </button>
                  <Link
                    to="/app/translate"
                    className="px-5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-white/70 hover:bg-white border border-border rounded-xl transition-all"
                  >
                    <Globe className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Translate
                  </Link>
                </div>

                {/* Dropzone */}
                <div className="mt-6 max-w-lg mx-auto">
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12 transition-all duration-300 ${
                      dragOver
                        ? 'border-pdf-400 bg-pdf-50/80 scale-[1.02]'
                        : 'border-gray-200 hover:border-pdf-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} hidden />

                    {uploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-pdf-50 flex items-center justify-center">
                            <FileText className="w-7 h-7 text-pdf-500" />
                          </div>
                          <svg className="absolute inset-0 w-16 h-16 -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#e0e7ff" strokeWidth="3" />
                            <circle cx="32" cy="32" r="28" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`} strokeLinecap="round" className="transition-all duration-300" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing your document...</p>
                          <p className="text-xs text-gray-400 mt-0.5">Analyzing and indexing content</p>
                        </div>
                        <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pdf-500 to-pdf-400 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-6 h-6 text-pdf-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {dragOver ? 'Drop your file here' : 'Drop your PDF here, or click to browse'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">PDF up to 50MB — processed in memory, nothing stored permanently</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg animate-slide-up">
                      <X className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                      <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto py-8 text-center text-xs text-gray-400 border-t border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-4">
                <span>&copy; 2026 DocAI. All rights reserved.</span>
                <span className="text-gray-300">|</span>
                <Link to="/login" className="hover:text-gray-600 dark:text-gray-400 transition-colors">Sign In</Link>
                <span className="text-gray-300">|</span>
                <Link to="/register" className="hover:text-gray-600 dark:text-gray-400 transition-colors">Create Account</Link>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
            {/* Chat Toolbar */}
            <div className="bg-white dark:bg-surface-card-dark border-b border-gray-100 dark:border-border-dark/80 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-pdf-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-pdf-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 truncate">{filename}</p>
                  <p className="text-xs text-gray-400">Ready to answer your questions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSession}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> New Document
                </button>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-lg hover:from-pdf-700 hover:to-pdf-600 transition-all"
                >
                  Sign Up <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center mt-16 sm:mt-24 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pdf-50 to-pdf-100 flex items-center justify-center mb-4">
                      <MessageSquare className="w-7 h-7 text-pdf-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Ask anything about your document</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                      Try asking a question, requesting a summary, or extracting key information
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {['Summarize this document', 'What are the main points?', 'Extract action items'].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => { setQuestion(suggestion); if (inputRef.current) inputRef.current.focus() }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 transition-all"
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isUser ? 'bg-pdf-600 text-white' : 'bg-gray-100 text-gray-600 dark:text-gray-400'}`}>
                            {isUser ? 'U' : 'AI'}
                          </div>
                        )}
                        <div className={`${isFirst ? '' : 'ml-10'}`}>
                          <div className={`rounded-2xl px-4 py-2.5 ${isUser ? 'bg-pdf-600 text-white' : 'bg-white dark:bg-surface-card-dark border border-gray-100 dark:border-border-dark text-gray-900 dark:text-gray-100 dark:text-gray-100 shadow-sm'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {isFirst && (
                            <p className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
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
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5">AI</div>
                      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
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

            {/* Sources Bar */}
            {sources.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/80 px-4 sm:px-6 lg:px-8 py-2.5 flex-shrink-0">
                <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">Sources:</span>
                  <div className="flex gap-1.5">
                    {sources.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {s.filename} <span className="text-gray-300">·</span> p.{s.page_number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-100 dark:border-border-dark bg-white dark:bg-surface-card-dark px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2.5 mb-2">
                  {/* Action Mode Selector */}
                  <div className="relative" ref={actionRef}>
                    <button
                      type="button"
                      onClick={() => setShowActions(!showActions)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-pdf-600 bg-pdf-50 border border-pdf-100 rounded-lg hover:bg-pdf-100 transition-all"
                    >
                      {currentAction && <currentAction.icon className="w-3 h-3" />}
                      {currentAction?.label || 'Q&A'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showActions ? 'rotate-180' : ''}`} />
                    </button>
                    {showActions && (
                      <div className="absolute bottom-full mb-1.5 left-0 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 z-10 w-44 py-1 animate-scale-in">
                        <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Action Mode</div>
                        {ACTIONS.map(a => {
                          const Icon = a.icon
                          return (
                            <button
                              key={a.value}
                              type="button"
                              onClick={() => { setAction(a.value); setShowActions(false) }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${action === a.value ? 'bg-pdf-50 text-pdf-700 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
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
                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                    {currentAction && ACTIONS.find(a => a.value === action)?.label !== 'Q&A' ? 'Mode: ' + currentAction?.label : 'Ask questions about your document'}
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-pdf-500/20 focus:border-pdf-400 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!question.trim() || loading}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-xl hover:from-pdf-700 hover:to-pdf-600 disabled:from-gray-300 disabled:to-gray-300 shadow-sm hover:shadow-md transition-all disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
