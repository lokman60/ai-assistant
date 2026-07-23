export const authStore = {
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  },
  clear: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  },
  getUser: (): { id: string; email: string } | null => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  },
  setUser: (user: { id: string; email: string }) => {
    localStorage.setItem('user', JSON.stringify(user))
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
}
