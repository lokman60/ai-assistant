import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageSquare, Trash2, Plus, FileText, ChevronDown } from 'lucide-react'
import { chat as chatApi, documents as docsApi } from '../services/api'

interface Message { id: string; role: string; content: string }
interface Source { document_id: string; filename: string; page_number: number }

const ACTIONS = [
  { value: 'qna', label: 'Q&A', desc: 'Answer questions about documents' },
  { value: 'summarize', label: 'Summarize', desc: 'Summarize into key points' },
  { value: 'draft', label: 'Draft', desc: 'Draft reports, emails, proposals' },
  { value: 'rewrite', label: 'Rewrite', desc: 'Rewrite for clarity or tone' },
  { value: 'translate', label: 'Translate', desc: 'Translate between languages' },
  { value: 'extract', label: 'Extract', desc: 'Extract dates, names, action items' },
  { value: 'compare', label: 'Compare', desc: 'Compare document versions' },
  { value: 'generate', label: 'Generate', desc: 'Generate tables, outlines, formatted content' },
]

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [action, setAction] = useState('qna')
  const [showActions, setShowActions] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const convId = searchParams.get('conv')

  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => docsApi.list().then(r => r.data),
  })

  const { data: convsData, refetch: refetchConvs } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations().then(r => r.data),
  })

  const { data: convData } = useQuery({
    queryKey: ['conversation', convId],
    queryFn: () => chatApi.getConversation(convId!).then(r => r.data),
    enabled: !!convId,
  })

  useEffect(() => {
    if (convData?.data?.messages) {
      setMessages(convData.data.messages)
    } else if (!convId) {
      setMessages([])
      setSources([])
    }
  }, [convData, convId])

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const chatMutation = useMutation({
    mutationFn: (q: string) => chatApi.send(q, selectedDocs, convId || undefined, action),
    onSuccess: (res) => {
      const d = res.data.data
      setMessages((prev) => [
        ...prev,
        { id: 'q-' + Date.now(), role: 'user', content: question },
        { id: 'a-' + Date.now(), role: 'assistant', content: d.answer },
      ])
      setSources(d.sources || [])
      setQuestion('')
      refetchConvs()
      if (!convId && d.conversation_id) setSearchParams({ conv: d.conversation_id })
    },
  })

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: () => {
      setSearchParams({})
      setMessages([])
      setSources([])
      refetchConvs()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || selectedDocs.length === 0) return
    chatMutation.mutate(question)
  }

  const startNewChat = () => {
    setSearchParams({})
    setMessages([])
    setSources([])
    setQuestion('')
  }

  const docs = docsData?.data?.documents || []
  const convs = convsData?.data?.conversations || []
  const readyDocs = docs.filter((d: any) => d.status === 'ready')

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-200 dark:border-border-dark bg-white dark:bg-surface-card-dark p-4 flex flex-col">
        <button onClick={startNewChat}
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-pdf-600 text-white rounded-lg hover:bg-pdf-700 transition-colors text-sm font-medium mb-4">
          <Plus className="w-4 h-4" /> New Chat
        </button>
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Documents</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {readyDocs.map((doc: any) => (
              <label key={doc.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedDocs.includes(doc.id) ? 'bg-pdf-50 dark:bg-pdf-900/20 text-pdf-700' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'}`}>
                <input type="checkbox" checked={selectedDocs.includes(doc.id)}
                  onChange={() => setSelectedDocs((prev) => prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id])}
                  className="rounded border-gray-300 dark:border-gray-600 text-pdf-600 focus:ring-pdf-500" />
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{doc.title}</span>
              </label>
            ))}
          </div>
          {readyDocs.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 px-3">No processed documents</p>}
        </div>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Conversations</h3>
        <div className="flex-1 overflow-y-auto space-y-1">
          {convs.map((conv: any) => (
            <div key={conv.id} className="flex items-center group">
              <button onClick={() => setSearchParams({ conv: conv.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-1 text-left transition-colors ${conv.id === convId ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'}`}>
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
              <button onClick={() => deleteConvMutation.mutate(conv.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !chatMutation.isPending && (
            <div className="text-center text-gray-400 dark:text-gray-500 mt-20">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">Ask about your documents</h2>
              <p className="text-sm">Select documents and ask questions to get started</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-pdf-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
        {sources.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-border-dark">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-medium">Sources:</span>
              {sources.map((s, i) => (
                <span key={i} className="bg-white dark:bg-surface-card-dark px-2 py-1 rounded border border-gray-200 dark:border-border-dark text-xs">
                  {s.filename} - Page {s.page_number}
                </span>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-border-dark bg-white dark:bg-surface-card-dark">
          <div className="flex gap-2 mb-2">
            <div className="relative">
              <button type="button" onClick={() => setShowActions(!showActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                {ACTIONS.find(a => a.value === action)?.label || 'Q&A'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showActions && (
                <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-border-dark rounded-lg shadow-lg z-10 w-48">
                  {ACTIONS.map(a => (
                    <button key={a.value} type="button" onClick={() => { setAction(a.value); setShowActions(false) }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 transition-colors ${action === a.value ? 'bg-pdf-50 dark:bg-pdf-900/20 text-pdf-700' : 'text-gray-700 dark:text-gray-300'}`}>
                      <div className="font-medium">{a.label}</div>
                      <div className="text-gray-400 dark:text-gray-500 truncate">{a.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder={selectedDocs.length === 0 ? 'Select documents to start' : 'Type your request...'}
              disabled={selectedDocs.length === 0 || chatMutation.isPending}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pdf-500 focus:border-pdf-500 outline-none transition-colors disabled:bg-gray-50 dark:bg-gray-900 disabled:text-gray-400 dark:text-gray-500"
            />
            <button type="submit" disabled={!question.trim() || selectedDocs.length === 0 || chatMutation.isPending}
              className="bg-pdf-600 text-white p-3 rounded-xl hover:bg-pdf-700 disabled:bg-gray-300 transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
