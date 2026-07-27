import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FileText } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useGoogleAuth } from '../services/googleAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()

  const googleAuthAvailable = useGoogleAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/app/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await googleLogin(credentialResponse.credential)
      navigate('/app/dashboard')
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-bg-dark px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <FileText className="w-12 h-12 text-pdf-600 mx-auto mb-2" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Document Assistant</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-card-dark p-8 rounded-xl shadow-sm border border-gray-200 dark:border-border-dark space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-surface-card-dark border border-gray-300 dark:border-gray-600 rounded-lg text-text-primary dark:text-text-primary-dark focus:ring-2 focus:ring-pdf-500 focus:border-pdf-500 outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-surface-card-dark border border-gray-300 dark:border-gray-600 rounded-lg text-text-primary dark:text-text-primary-dark focus:ring-2 focus:ring-pdf-500 focus:border-pdf-500 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full bg-pdf-600 text-white py-2.5 rounded-lg font-medium hover:bg-pdf-700 dark:hover:bg-pdf-500 transition-colors">
            Sign In
          </button>
          {googleAuthAvailable && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-border-dark" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white dark:bg-surface-card-dark px-2 text-gray-500 dark:text-gray-400">or</span></div>
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed')}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            </>
          )}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account? <Link to="/register" className="text-pdf-600 hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
