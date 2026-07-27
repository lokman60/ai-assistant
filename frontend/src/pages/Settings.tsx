import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white dark:bg-surface-card-dark rounded-xl border border-gray-200 dark:border-border-dark shadow-sm p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={user?.email || ''} readOnly
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
            <p className="text-sm text-gray-500">
              AI Document Assistant uses Retrieval-Augmented Generation (RAG) to answer questions about your documents.
              All processing is done locally using open-source models.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
