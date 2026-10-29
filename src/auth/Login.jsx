import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { useAuth } from './AuthContext'
import { COMPANY_NAME } from '../lib/schema'
import { isConfigured } from '../lib/supabase'

export default function Login() {
  const { authed, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (authed) return <Navigate to="/total" replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <section className="login-side">
        <div className="brand-mark"><HardHat size={26} /></div>
        <h1>{COMPANY_NAME}</h1>
        <p>Every bag, bar and brick: what came in, where it went, and what is left in the store.</p>
      </section>
      <section className="login-form">
        <form onSubmit={submit}>
          <h2>Sign in</h2>
          {!isConfigured && (
            <p className="form-error">
              Supabase is not connected yet. Copy <code>.env.example</code> to <code>.env</code> and add your Supabase URL and anon key.
            </p>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn--primary" disabled={busy || !isConfigured}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  )
}
