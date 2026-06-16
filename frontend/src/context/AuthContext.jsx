import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api'

const Ctx = createContext(null)
const TOKEN_KEY  = 'ses_token'
const USER_KEY   = 'ses_user'
// const BACKEND    = 'http://localhost:8080'
const BACKEND = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:8080'


// Resolve relative photo path → absolute URL
// Called once when user object is received, so ALL components just use user.profilePicture
const resolveUser = (userData) => {
  if (!userData) return null
  const pic = userData.profilePicture
  if (pic && !pic.startsWith('http')) {
    return { ...userData, profilePicture: BACKEND + pic }
  }
  return userData
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const saveUser = (data) => {
    const resolved = resolveUser(data)
    setUser(resolved)
    localStorage.setItem(USER_KEY, JSON.stringify(resolved))
    return resolved
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      authAPI.me()
        .then(r  => saveUser(r.data))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem(TOKEN_KEY, token)
    saveUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const r = await authAPI.me()
      return saveUser(r.data)
    } catch {}
  }, [])

  const isAdmin = ['SUPER_ADMIN', 'ADMINISTRATOR', 'EMPLOYEE'].includes(user?.role)

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshUser, isAdmin }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
