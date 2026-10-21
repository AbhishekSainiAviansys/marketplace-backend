/** Public detail page for a directory listing: registration details + basic
 *  details taken from the institute's stored registration / profile. */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, GraduationCap, Loader2, MapPin, School, Users } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert } from '@ui'
import { usePageSeo } from '../lib/seo'

type Detail = {
  kind: 'school' | 'coaching'
  id: number
  name: string
  code: string
  type: string
  type_label: string
  address?: string | null
  country_name?: string | null
  state_name?: string | null
  district_name?: string | null
  registration: {
    registration_number?: string | null
    board?: string | null
    established_year?: string | null
    recognition_status?: string | null
    status: string
    submitted_at?: string | null
  }
  profile: {
    contact_person?: string | null
    designation?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    medium_of_instruction?: string | null
    classes?: string[]
    streams?: string | null
    student_strength?: string | null
  }
}

function iconFor(type: string) {
  if (type === 'private_coaching') return Users
  if (type === 'private_institute') return GraduationCap
  return School
}

function Item({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{value}</dd>
    </div>
  )
}

export function DirectoryDetail() {
  const { kind, id } = useParams()
  const [data, setData] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    if (kind !== 'school' && kind !== 'coaching') {
      setState('missing')
      return () => {
        alive = false
      }
    }
    setState('loading')
    api
      .get<Detail>(`/directory/${kind}/${id}`)
      .then((response) => {
        if (!alive) return
        setData(response.data)
        setState('ready')
      })
      .catch((cause: unknown) => {
        if (!alive) return
        const status = (cause as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setState('missing')
          return
        }
        setError(errMsg(cause, 'Could not load this listing'))
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [kind, id])

  // SEO tags (unconditional — hooks must never be conditional).
  // Before the listing loads we render a placeholder; once ready we fill in the
  // real title, description and JSON-LD from the fetched data.
  const place = data ? [data.district_name, data.state_name, data.country_name].filter(Boolean).join(', ') : ''
  usePageSeo({
    title: data ? `${data.name} · ${data.type_label} · Student directory` : 'Listing · Student directory',
    description: data
      ? [
          data.profile.contact_person ? `Contact: ${data.profile.contact_person}` : null,
          data.profile.phone ? `Phone: ${data.profile.phone}` : null,
          place ? `Location: ${place}` : null,
          data.registration.registration_number ? `Registration: ${data.registration.registration_number}` : null,
        ].filter(Boolean).join(' · ') || `Details for ${data.name}, a ${data.type_label} listed in the student directory.`
      : 'Schools, coaching centres and institutes listed in the student directory.',
    canonical: window.location.origin + (data ? `/directory/${data.kind}/${data.id}` : '/directory'),
    type: 'profile',
    institute: data
      ? {
          kind: data.kind,
          name: data.name,
          code: data.code,
          type: data.type ?? null,
          address: data.address ?? null,
          phone: data.profile.phone ?? null,
          email: data.profile.email ?? null,
          website: data.profile.website ?? null,
          establishedYear: data.registration.established_year ?? null,
          registrationNumber: data.registration.registration_number ?? null,
          studentStrength: data.profile.student_strength ?? null,
        }
      : undefined,
  })

  if (state === 'loading') {
    return (
      <div className="card flex items-center justify-center gap-2 p-10 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listing...
      </div>
    )
  }

  if (state === 'missing') {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-lg font-bold text-[var(--text)]">Listing not found</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          This institute may have been unlisted or the link is out of date.
        </p>
        <Link to="/directory" className="btn btn-primary mt-5">
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </Link>
      </div>
    )
  }

  if (state === 'error' || !data) return <Alert>{error || 'Could not load this listing'}</Alert>

  const Icon = iconFor(data.type)
  const statusLabel = data.registration.status === 'approved' ? 'Active listing' : data.registration.status
  const classes = Array.isArray(data.profile.classes) ? data.profile.classes.filter(Boolean) : []
  const hasRegistration = Boolean(
    data.registration.registration_number ||
      data.registration.board ||
      data.registration.established_year ||
      data.registration.recognition_status,
  )

  return (
    <div className="space-y-5">
      <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Link>

      {/* Header */}
      <section className="card p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="accent-soft accent-soft-text flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {data.type_label}
            </span>
            <h1 className="mt-2 text-xl font-bold text-[var(--text)] sm:text-2xl">{data.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-semibold text-[var(--text)]">
                {data.code}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                {statusLabel}
              </span>
            </div>
            {(place || data.address) && (
              <p className="mt-3 flex items-start gap-1.5 text-sm text-[var(--text-muted)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {[data.address, place].filter(Boolean).join(' - ')}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Registration details */}
        <section className="card p-5 sm:p-7">
          <h2 className="mb-4 text-base font-bold text-[var(--text)]">Registration details</h2>
          {hasRegistration || data.registration.status ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Registration number" value={data.registration.registration_number} />
              <Item label={data.kind === 'school' ? 'Board' : 'Affiliation'} value={data.registration.board} />
              <Item label="Established" value={data.registration.established_year} />
              <Item label="Recognition" value={data.registration.recognition_status} />
              <Item label="Listing status" value={statusLabel} />
              <Item
                label="Listed on"
                value={data.registration.submitted_at ? new Date(data.registration.submitted_at).toLocaleDateString() : null}
              />
            </dl>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No registration details published yet.</p>
          )}
        </section>

        {/* Basic details */}
        <section className="card p-5 sm:p-7">
          <h2 className="mb-4 text-base font-bold text-[var(--text)]">Basic details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Address" value={data.address} />
            <Item label="Location" value={place} />
            <Item label="Contact person" value={data.profile.contact_person} />
            <Item label="Designation" value={data.profile.designation} />
            <Item label="Phone / WhatsApp" value={data.profile.phone} />
            <Item label="Email" value={data.profile.email} />
            <Item label="Website" value={data.profile.website} />
            <Item label="Medium of instruction" value={data.profile.medium_of_instruction} />
            <Item label="Streams" value={data.profile.streams} />
            <Item label="Student strength" value={data.profile.student_strength} />
          </dl>
          {classes.length > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">Classes offered</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {classes.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]"
                  >
                    {label}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </section>
      </div>

      {/* Owner CTA */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
        <div>
          <h2 className="text-base font-bold text-[var(--text)]">Run a coaching institute or tuition centre?</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Register your institute - it activates instantly and appears in this directory.
          </p>
        </div>
        <a href="/coaching/register" className="btn btn-primary">
          Register your institute <ArrowRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  )
}