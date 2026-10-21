/**
 * Shared auth context. Identical behaviour in all three panels.
 *
 * Note: logout() clears ONLY our own keys. The previous vendor/school version
 * called localStorage.clear(), which wiped unrelated app state on the origin.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { api } from './api'

export type User = {
  id: number
  name: string
  email?: string | null
  whatsapp?: string | null
  role: string
}

type AuthValue = {
  user: User | null
  login: (u: User, t: string) => void
  logout: () => void
  /** Revoke the Sanctum token server-side, then clear locally (always clears). */
  logoutRemote: () => Promise<void>
}

const Ctx = createContext<AuthValue>({
  user: null,
  login: () => {},
  logout: () => {},
  logoutRemote: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const login = useCallback((u: User, t: string) => {
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const logoutRemote = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* token may already be invalid - clearing locally is enough */
    } finally {
      clear()
    }
  }, [clear])

  return <Ctx.Provider value={{ user, login, logout: clear, logoutRemote }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
