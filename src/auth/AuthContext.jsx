import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, setupProblem } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// Signed in AND is the admin (the database decides who the admin is)
async function checkAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw new Error(setupProblem(error) || error.message)
  return data === true
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    let alive = true
    if (!session) {
      setAdmin(false)
      setLoading(false)
      return
    }
    setLoading(true)
    checkAdmin()
      .then((ok) => alive && setAdmin(ok))
      .catch(() => alive && setAdmin(false))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [session])

  const value = {
    authed: Boolean(session) && admin,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email or password is wrong' : error.message)
      let ok
      try {
        ok = await checkAdmin()
      } catch (e) {
        await supabase.auth.signOut()
        throw e
      }
      if (!ok) {
        await supabase.auth.signOut()
        throw new Error('This account is not allowed to use the store register')
      }
    },
    signOut: () => supabase.auth.signOut(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
