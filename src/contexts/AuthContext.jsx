import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken } from '../api'

const AuthContext = createContext(null)

// Public contract is unchanged: { user, userData, loading, login, logout }.
// userData = { uid, id, name, email, role, orgId } — same shape pages expect.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (getToken()) {
        try {
          const me = await api.me()
          if (active) { setUser(me); setUserData(me) }
        } catch {
          api.logout()
        }
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const login = async (email, password) => {
    const me = await api.login(email, password)
    setUser(me)
    setUserData(me)
    return me
  }

  const logout = async () => {
    api.logout()
    setUser(null)
    setUserData(null)
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
