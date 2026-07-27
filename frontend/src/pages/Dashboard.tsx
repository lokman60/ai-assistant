import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Upload, MessageSquare, Files, Zap, Sparkles } from 'lucide-react'
import { documents as docsApi, chat as chatApi, subscription as subApi } from '../services/api'

export default function Dashboard() {
  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => docsApi.list().then(r => r.data),
  })

  const { data: convsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations().then(r => r.data),
  })

  const { data: planData } = useQuery({
    queryKey: ['plan'],
    queryFn: () => subApi.plan().then(r => r.data),
  })

  const docs = docsData?.data?.documents || []
  const convs = convsData?.data?.conversations || []
  const plan = planData?.data

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary-dark">Dashboard</h1>
          {plan && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md ${
              plan.plan === 'pro'
                ? 'bg-gradient-to-r from-ai-600 to-ai-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {plan.plan === 'pro' ? <Zap className="w-3 h-3" /> : null}
              {plan.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          )}
        </div>
        <Link to="../upload" className="flex items-center gap-2 bg-pdf-600 text-white px-4 py-2 rounded-lg hover:bg-pdf-700 transition-colors text-sm font-medium">
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Files className="w-8 h-8 text-pdf-600" />
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{docs.length}</p>
              <p className="text-sm text-text-secondary">Documents</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{convs.length}</p>
              <p className="text-sm text-text-secondary">Conversations</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-ai-600" />
            <div>
              <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
                {docs.filter((d: any) => d.status === 'ready').length}
              </p>
              <p className="text-sm text-text-secondary">Processed</p>
            </div>
          </div>
        </div>
        {plan && (
          <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Zap className={`w-8 h-8 ${plan.plan === 'pro' ? 'text-ai-600' : 'text-text-secondary'}`} />
              <div>
                <p className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
                  {plan.documents_today}/{plan.max_documents_per_day}
                </p>
                <p className="text-sm text-text-secondary">Uploads Today</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {plan && plan.plan === 'free' && (
        <div className="mb-6 bg-gradient-to-r from-ai-50 to-pdf-50 dark:from-ai-900/20 dark:to-pdf-900/20 rounded-2xl border border-ai-200/50 dark:border-ai-800/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-ai-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">You're on the Free plan</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upgrade to Pro for unlimited pages, OCR, and priority processing.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">{plan.documents_today}/{plan.max_documents_per_day} uploads today</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Recent Documents</h2>
          {docs.length === 0 ? (
            <p className="text-text-secondary text-sm">No documents yet. <Link to="../upload" className="text-pdf-600 hover:underline">Upload one</Link></p>
          ) : (
            <div className="space-y-3">
              {docs.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary dark:text-text-primary-dark">{doc.title}</span>
                    <span className="text-xs text-text-secondary">({doc.page_count || '?'}p)</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.status === 'ready' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    doc.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  }`}>{doc.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-surface-card-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">Recent Conversations</h2>
          {convs.length === 0 ? (
            <p className="text-text-secondary text-sm">No conversations yet. <Link to="../chat" className="text-pdf-600 hover:underline">Start one</Link></p>
          ) : (
            <div className="space-y-3">
              {convs.slice(0, 5).map((conv: any) => (
                <Link key={conv.id} to={`/chat?conv=${conv.id}`} className="flex items-center gap-2 py-2 border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors">
                  <MessageSquare className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-primary dark:text-text-primary-dark">{conv.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
