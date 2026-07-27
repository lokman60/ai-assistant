import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const data = err.response?.data || err.response || {}
    if (data?.error === 'plan_limit') {
      window.dispatchEvent(new CustomEvent('plan-limit', { detail: data }))
    }
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data: refreshData } = await axios.post('/api/refresh', { refresh_token: refresh })
          localStorage.setItem('access_token', refreshData.data.access_token)
          localStorage.setItem('refresh_token', refreshData.data.refresh_token)
          original.headers.Authorization = `Bearer ${refreshData.data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

export const auth = {
  register: (email: string, password: string) =>
    api.post('/register', { email, password }),
  login: (email: string, password: string) =>
    api.post('/login', { email, password }),
  refresh: (refresh_token: string) =>
    api.post('/refresh', { refresh_token }),
  me: () => api.get('/me'),
  googleLogin: (credential: string) =>
    api.post('/auth/google', { credential }),
}

export const documents = {
  list: () => api.get('/documents'),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/documents', form)
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
  rename: (id: string, title: string) => api.patch(`/documents/${id}`, { title }),
}

export const chat = {
  send: (question: string, document_ids: string[], conversation_id?: string, action: string = 'qna') =>
    api.post('/chat', { question, document_ids, conversation_id, action }),
  conversations: () => api.get('/conversations'),
  getConversation: (id: string) => api.get(`/conversation/${id}`),
  deleteConversation: (id: string) => api.delete(`/conversation/${id}`),
  renameConversation: (id: string, title: string) => api.patch(`/conversation/${id}`, { title }),
}

export const translate = {
  start: (file: File, targetLanguage: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('target_language', targetLanguage)
    return api.post('/translate-pdf', form)
  },
  status: (jobId: string) => api.get(`/translate-pdf/status/${jobId}`),
  downloadUrl: (jobId: string) => `${api.defaults.baseURL || '/api'}/translate-pdf/download/${jobId}`,
}

export const subscription = {
  plan: () => api.get('/me/plan'),
  upgrade: () => api.post('/upgrade'),
  downgrade: () => api.post('/downgrade'),
}
