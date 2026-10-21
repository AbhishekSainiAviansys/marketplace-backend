/**
 * Coaching panel profile — the basic details from registration, kept editable.
 *
 * GET /coaching/profile → payload() shape; PUT /coaching/profile → lenient update.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, MapPin } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Button, Field, PageHeader, Panel, Skeleton } from '@ui'

type Profile = {
  id: number
  institute_code: string
  name: string
  institute_type: string
  address: string | null
  district_name: string | null
  state_name: string | null
  country_name: string | null
  contact: { person_name: string | null; email: string | null; phone: string | null }
  status: string | null
  created_at: string
}

type Form = {
  name: string
  institute_type: string
  address: string
  person_name: string
  email: string
  phone: string
}

const TYPES = [
  { value: 'private_coaching', label: 'Private coaching' },
  { value: 'private_institute', label: 'Private institute' },
  { value: 'private_tutor', label: 'Private tutor' },
]

const toForm = (p: Profile): Form => ({
  name: p.name ?? '',
  institute_type: p.institute_type ?? 'private_coaching',
  address: p.address ?? '',
  person_name: p.contact?.person_name ?? '',
  email: p.contact?.email ?? '',
  phone: p.contact?.phone ?? '',
})

export function Profile() {
  const [data, setData] = useState<Profile | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .get('/coaching/profile')
      .then((r) => {
        if (!alive) return
        setData(r.data)
        setForm(toForm(r.data))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load your profile.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    if (!form) return
    setForm({ ...form, [k]: e.target.value })
    setSaved('')
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    setErr('')
    setSaved('')
    api
      .put('/coaching/profile', {
        name: form.name,
        institute_type: form.institute_type,
        address: form.address,
        contact: { person_name: form.person_name, email: form.email, phone: form.phone },
      })
      .then((r) => {
        setData(r.data)
        setForm(toForm(r.data))
        setSaved('Profile updated.')
      })
      .catch((e) => setErr(errMsg(e, 'Could not save the profile.')))
      .finally(() => setBusy(false))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" subtitle="Your institute's basic details" />
        <div className="card p-6">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle={data ? `${data.name} · ${data.institute_code}` : "Your institute's basic details"}
      />

      {err && <Alert>{err}</Alert>}
      {saved && (
        <Alert kind="ok">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {saved}
          </span>
        </Alert>
      )}

      {form && (
        <form onSubmit={save}>
          <Panel title="Basic details" subtitle="Shown to students on your directory listing" tone="accent">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Institute name">
                <input className="field" value={form.name} onChange={set('name')} required maxLength={200} />
              </Field>
              <Field label="Institute type">
                <select className="field" value={form.institute_type} onChange={set('institute_type')}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input className="field" value={form.address} onChange={set('address')} maxLength={500} />
                </Field>
              </div>
            </div>

            <h3 className="mt-6 mb-3 text-sm font-bold text-[var(--text)]">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Contact person">
                <input className="field" value={form.person_name} onChange={set('person_name')} maxLength={200} />
              </Field>
              <Field label="Email">
                <input type="email" className="field" value={form.email} onChange={set('email')} maxLength={190} />
              </Field>
              <Field label="Phone">
                <input className="field" value={form.phone} onChange={set('phone')} maxLength={15} />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <Button type="submit" busy={busy}>
                Save changes
              </Button>
            </div>
          </Panel>
        </form>
      )}

      {data && (
        <Panel title="Listing" subtitle="Where your institute appears" tone="info">
          <div className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {[data.district_name, data.state_name, data.country_name].filter(Boolean).join(', ') ||
                'Location not set'}
              <div className="mt-1">
                Status:{' '}
                <span className={`badge ${data.status === 'approved' ? 'badge-ok' : 'badge-neutral'}`}>
                  {data.status ?? 'unknown'}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
