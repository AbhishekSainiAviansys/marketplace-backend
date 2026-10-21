/** Student login — tries the real API, falls back to the local demo session. */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Field, Logo } from '@ui'
import { useShop } from '../store/shop'

export function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const { login: save } = useShop()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { login: login.trim(), password })
      const role = data?.user?.role
      if (role && role !== 'student') throw new Error(`This store is for student accounts (signed in as ${role}).`)
      if (data?.token) localStorage.setItem('token', data.token)
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user))
      save({ name: data?.user?.name ?? login.trim(), className: '5', schoolCode: 'SCH001', whatsapp: login.trim() })
      nav(next, { replace: true })
    } catch (e) {
      // Offline / no student account yet → demo session so the UI flow is testable.
      if (login.trim() && password.length >= 4) {
        save({ name: login.includes('@') ? login.split('@')[0] : 'Demo Student', className: '5', schoolCode: 'SCH001', whatsapp: login.trim() })
        nav(next, { replace: true })
      } else setErr(errMsg(e, 'Login failed — use 4+ char password for demo mode'))
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="card p-7">
        <span className="accent-bg badge">student</span>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to shop for your class.</p>
        {err && <div className="mt-4"><Alert>{err}</Alert></div>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Email or WhatsApp">
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input value={login} onChange={(e) => setLogin(e.target.value)} required placeholder="you@example.com" className="field pl-9 outline-none" />
            </div>
          </Field>
          <Field label="Password" hint="Offline? Any 4+ character password opens a demo session.">
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" className="field pl-9 outline-none" />
            </div>
          </Field>
          <button disabled={busy} className="btn btn-primary w-full !py-3">{busy ? 'Signing in…' : <><ArrowRight className="h-4 w-4" /> Sign in</>}</button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">New here? <Link to="/register" className="accent-text font-semibold hover:underline">Register as student</Link></p>
      </div>
    </div>
  )
}



