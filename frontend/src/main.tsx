import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GoogleAuthAvailable } from './services/googleAuth'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

function Root() {
  const [googleClientId, setGoogleClientId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => setGoogleClientId(cfg.google_client_id || ''))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-bg-dark">
        <div className="animate-spin w-8 h-8 border-4 border-pdf-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const hasGoogle = !!googleClientId

  const inner = (
    <GoogleAuthAvailable.Provider value={hasGoogle}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleAuthAvailable.Provider>
  )

  if (!hasGoogle) {
    return inner
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {inner}
    </GoogleOAuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
