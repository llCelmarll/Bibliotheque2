import axios from 'axios'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let sessionExpiredNotified = false

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (!sessionExpiredNotified) {
        sessionExpiredNotified = true
        // Dispatch a custom event so the Toast system (inside React) can show a message
        window.dispatchEvent(new CustomEvent('session-expired', {
          detail: { status: err.response.status }
        }))
        setTimeout(() => {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          window.location.href = '/login'
        }, 2000)
      }
    }
    return Promise.reject(err)
  }
)
