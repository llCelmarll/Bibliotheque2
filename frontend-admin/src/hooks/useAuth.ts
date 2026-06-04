export interface AuthUser {
  id: number
  email: string
  username: string
  role: 'user' | 'moderator' | 'admin'
  is_active: boolean
}

export function useAuth() {
  const token = localStorage.getItem('admin_token')
  const userRaw = localStorage.getItem('admin_user')
  const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.role === 'admin'
  const isModerator = user?.role === 'moderator' || user?.role === 'admin'

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    window.location.href = '/login'
  }

  return { token, user, isAuthenticated, isAdmin, isModerator, logout }
}
