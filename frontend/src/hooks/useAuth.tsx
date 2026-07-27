import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth as authApi } from '../services/api'
import { authStore } from '../store/authStore'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(authStore.getUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authStore.isAuthenticated()) {
      authApi.me().then(({ data }) => {
        if (data.success && data.data) {
          const u = { id: data.data.id, email: data.data.email }
          setUser(u)
          authStore.setUser(u)
        }
      }).catch(() => authStore.clear()).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password)
    if (!data.success) throw new Error(data.message)
    authStore.setTokens(data.data.access_token, data.data.refresh_token)
    const me = await authApi.me()
    const u = { id: me.data.data.id, email: me.data.data.email }
    setUser(u)
    authStore.setUser(u)
  }

  const register = async (email: string, password: string) => {
    const { data } = await authApi.register(email, password)
    if (!data.success) throw new Error(data.message)
  }

  const googleLogin = async (credential: string) => {
    const { data } = await authApi.googleLogin(credential)
    if (!data.success) throw new Error(data.message)
    authStore.setTokens(data.data.access_token, data.data.refresh_token)
    const me = await authApi.me()
    const u = { id: me.data.data.id, email: me.data.data.email }
    setUser(u)
    authStore.setUser(u)
  }

  const logout = () => {
    authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
