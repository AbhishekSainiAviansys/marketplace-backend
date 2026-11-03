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
  const next = params.get('next') || '/profile'
  const { login: save } = useShop()
  const fcmToken = localStorage.getItem('fcm_token') || undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { login: login.trim(), password, fcm_token: fcmToken })
      const role = data?.user?.role
      if (role && role !== 'student') throw new Error(`This store is for student accounts (signed in as ${role}).`)
      if (!data?.token || !data?.user) throw new Error('Login did not return a session token.')
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.fcm_token_saved) { localStorage.setItem('fcm_token', fcmToken ?? '') }
      save({
        name: data.user.name ?? login.trim(),
        className: data.user.class_name ?? '5',
        schoolCode: data.user.school_code ?? 'SCH001',
        whatsapp: data.user.whatsapp ?? login.trim(),
        phoneCountryCode: data.user.phone_country_code,
        email: data.user.email ?? (login.includes('@') ? login.trim() : undefined),
      })
      nav(next, { replace: true })
    } catch (cause) {
      setErr(errMsg(cause, 'Login failed.'))
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
          <Field label="Password" hint="Use the password you registered with.">
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



