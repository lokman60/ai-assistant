import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Upload, MessageSquare, Files } from 'lucide-react'
import { documents as docsApi, chat as chatApi } from '../services/api'

export default function Dashboard() {
  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => docsApi.list().then(r => r.data),
  })

  const { data: convsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.conversations().then(r => r.data),
  })

  const docs = docsData?.data?.documents || []
  const convs = convsData?.data?.conversations || []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/upload" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Files className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{docs.length}</p>
              <p className="text-sm text-gray-500">Documents</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{convs.length}</p>
              <p className="text-sm text-gray-500">Conversations</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {docs.filter((d: any) => d.status === 'ready').length}
              </p>
              <p className="text-sm text-gray-500">Processed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h2>
          {docs.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents yet. <Link to="/upload" className="text-blue-600 hover:underline">Upload one</Link></p>
          ) : (
            <div className="space-y-3">
              {docs.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{doc.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.status === 'ready' ? 'bg-green-50 text-green-700' :
                    doc.status === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{doc.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Conversations</h2>
          {convs.length === 0 ? (
            <p className="text-gray-500 text-sm">No conversations yet. <Link to="/chat" className="text-blue-600 hover:underline">Start one</Link></p>
          ) : (
            <div className="space-y-3">
              {convs.slice(0, 5).map((conv: any) => (
                <Link key={conv.id} to={`/chat?conv=${conv.id}`} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{conv.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
