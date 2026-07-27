import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload as UploadIcon, FileText, Trash2, Edit3, Check, X } from 'lucide-react'
import { documents as docsApi } from '../services/api'
import { formatDistanceToNow } from '../utils'

export default function UploadPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => docsApi.list().then(r => r.data),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => docsApi.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => docsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => docsApi.rename(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setEditingId(null)
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => uploadMutation.mutate(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
  })

  const docs = data?.data?.documents || []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Upload Documents</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-8 ${
          isDragActive ? 'border-pdf-500 bg-pdf-50 dark:bg-pdf-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-pdf-400 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'
        }`}
      >
        <input {...getInputProps()} />
        <UploadIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">or click to browse (max 50MB, PDF only)</p>
      </div>

      {uploadMutation.isPending && (
        <div className="bg-pdf-50 dark:bg-pdf-900/20 text-pdf-700 p-4 rounded-lg mb-6 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-pdf-600 border-t-transparent rounded-full" />
          Uploading and processing document...
        </div>
      )}

      <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-border-dark">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Documents</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">No documents uploaded yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {docs.map((doc: any) => (
              <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-pdf-600" />
                  {editingId === doc.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text" value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-pdf-500 outline-none"
                        autoFocus
                      />
                      <button onClick={() => renameMutation.mutate({ id: doc.id, title: editTitle })}
                        className="text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDistanceToNow(new Date(doc.created_at))}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.status === 'ready' ? 'bg-green-50 text-green-700' :
                    doc.status === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>{doc.status}</span>
                  <button onClick={() => { setEditingId(doc.id); setEditTitle(doc.title) }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(doc.id) }}
                    className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
