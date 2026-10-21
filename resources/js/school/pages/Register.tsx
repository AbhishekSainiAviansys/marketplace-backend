import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, School } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { useAuth } from '@lib/auth'
import { Alert, Field, Logo } from '@ui'
import {
  LocationFields,
  PhoneNumberField,
  SchoolDirectoryPicker,
  type LocationValue,
  type SchoolDirectoryEntry,
} from '../../ui/RegistrationFields'

type RegisterResponse = {
  token: string
  user: { id: number; name: string; role: string }
}

export function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [contact, setContact] = useState({
    name: '',
    email: '',
    countryCode: '+91',
    phone: '',
    password: '',
  })
  const [location, setLocation] = useState<LocationValue>({ countryId: '105', stateId: '', districtId: '' })
  const [search, setSearch] = useState('')
  const [school, setSchool] = useState<SchoolDirectoryEntry | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!school) {
      setError('Choose your school from the active school directory before continuing.')
      return
    }
    setBusy(true)
    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        name: contact.name.trim(),
        email: contact.email.trim() || undefined,
        phone_country_code: contact.countryCode,
        whatsapp: contact.phone.replace(/\D/g, ''),
        password: contact.password,
        role: 'school',
        school_code: school.school_code,
        school_name: school.name,
      })
      login(response.data.user, response.data.token)
      navigate('/', { replace: true })
    } catch (cause: unknown) {
      setError(errMsg(cause, 'Could not create the school account'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">School sign in</Link>
        </div>
        <div className="card p-5 sm:p-8">
          <span className="accent-bg badge">school account</span>
          <h1 className="mt-3 text-2xl font-bold text-[var(--text)] sm:text-3xl">Connect your school</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            Find your school in the directory, then add the contact details for the person who will manage the school panel.
          </p>
          {error && <div className="mt-5"><Alert>{error}</Alert></div>}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <section className="space-y-4 rounded-2xl bg-[var(--surface-2)] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">School directory</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Search uses the active school records and location tables.</p>
              </div>
              <LocationFields value={location} onChange={(next) => { setLocation(next); setSchool(null) }} />
              <SchoolDirectoryPicker
                location={location}
                search={search}
                onSearch={(value) => { setSearch(value); setSchool(null) }}
                selectedCode={school?.school_code || ''}
                onSelect={setSchool}
              />
              {school && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
                  <School className="h-4 w-4 shrink-0" />
                  {school.name} <span className="font-normal">· {school.school_code}</span>
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)]">
                If your school is not listed, contact the marketplace administrator to add or activate its directory record.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[var(--text)]">Account contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact person">
                  <input required autoComplete="name" className="field" value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
                </Field>
                <Field label="Email" hint="Optional">
                  <input type="email" autoComplete="email" className="field" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} placeholder="name@school.edu" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PhoneNumberField
                  label="School contact mobile / WhatsApp"
                  countryCode={contact.countryCode}
                  phone={contact.phone}
                  onChange={(countryCode, phone) => setContact((current) => ({ ...current, countryCode, phone }))}
                />
                <Field label="Password">
                  <input required minLength={6} type="password" autoComplete="new-password" className="field" value={contact.password} onChange={(event) => setContact((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
              <Link to="/login" className="btn btn-secondary">Back to sign in</Link>
              <button type="submit" disabled={busy || !school} className="btn btn-primary disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <School className="h-4 w-4" />}
                {busy ? 'Creating account…' : 'Create school account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
