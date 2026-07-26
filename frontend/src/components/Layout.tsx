import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FileText, MessageSquare, Upload, Settings, LogOut, LayoutDashboard, Globe, Sun, Moon, Zap, Menu, X, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { subscription as subApi } from '../services/api'
import UpgradeDialog from './UpgradeDialog'

const navItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, premium: false },
  { path: '/app/upload', label: 'Upload', icon: Upload, premium: false },
  { path: '/app/chat', label: 'Chat', icon: MessageSquare, premium: false },
  { path: '/app/translate', label: 'Translate', icon: Globe, premium: true },
  { path: '/app/settings', label: 'Settings', icon: Settings, premium: false },
]

export default function Layout() {
  const { logout, user } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [closingFeature, setClosingFeature] = useState<string | null>(null)

  useEffect(() => {
    subApi.plan().then(r => setPlan(r.data.data.plan)).catch(() => setPlan('free'))
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.premium && plan === 'free') {
      setClosingFeature(item.label)
      setShowUpgrade(true)
      return
    }
    navigate(item.path)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-surface dark:bg-surface-dark">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-card-dark border-r border-border dark:border-border-dark flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border dark:border-border-dark">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pdf-600 to-pdf-500 flex items-center justify-center shadow-soft">
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary dark:text-text-primary-dark">DocAI</span>
        </div>

        {/* Plan Banner */}
        <div className="mx-4 mt-4">
          {plan === 'pro' ? (
            <div className="px-4 py-2.5 bg-gradient-to-r from-ai-50 to-ai-100 dark:from-ai-900/20 dark:to-ai-800/20 rounded-xl border border-ai-200 dark:border-ai-800/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ai-600" />
                <span className="text-sm font-semibold text-ai-700 dark:text-ai-400">Pro Plan</span>
              </div>
              <p className="text-xs text-ai-600/70 dark:text-ai-400/70 mt-0.5">Unlimited Access</p>
            </div>
          ) : (
            <button onClick={() => setShowUpgrade(true)} className="w-full px-4 py-2.5 bg-gradient-to-r from-pdf-600 to-pdf-500 rounded-xl hover:from-pdf-700 hover:to-pdf-600 shadow-soft hover:shadow-premium transition-all duration-200 text-left">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Free Plan</span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">Upgrade to Pro</p>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-pdf-50 dark:bg-pdf-900/20 text-pdf-700 dark:text-pdf-400'
                    : 'text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-pdf-600 dark:text-pdf-400' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.premium && plan === 'free' && (
                  <span className="badge-pro">Pro</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-border dark:border-border-dark space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-16 lg:hidden flex items-center justify-between px-4 border-b border-border dark:border-border-dark bg-white dark:bg-card-dark">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pdf-600 to-pdf-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-text-primary dark:text-text-primary-dark">DocAI</span>
          </div>
          <button onClick={toggle} className="btn-ghost p-2">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <UpgradeDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} feature={closingFeature || undefined} />
    </div>
  )
}
