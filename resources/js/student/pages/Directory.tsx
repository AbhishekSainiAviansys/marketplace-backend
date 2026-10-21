/** Student directory: schools + coaching institutes + tutors filtered by
 *  country, state, district and type.
 *  Renders grouped API shape { result: { school, institute, tutor },
 *  total: { school, institute, tutor } } as colour-coded cards.
 *  Each listing links to its detail page (/directory/:kind/:id). */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GraduationCap, Loader2, MapPin, Search, School, UserCheck, Users } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, EmptyState } from '@ui'
import { LocationFields, type LocationValue } from '../../ui/RegistrationFields'
import { usePageSeo } from '../lib/seo'

type DirType = 'school' | 'private_coaching' | 'private_institute' | 'private_tutor'

type Row = {
  kind: 'school' | 'coaching'
  id: number
  name: string
  code: string
  type: DirType | string
  type_label: string
  address?: string | null
  country_name?: string | null
  state_name?: string | null
  district_name?: string | null
  /** Which API group this row came from: school | institute | tutor */
  group?: 'school' | 'institute' | 'tutor'
}

type GroupTotals = { school: number; institute: number; tutor: number }

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'school', label: 'School' },
  { value: 'private_coaching', label: 'Private coaching' },
  { value: 'private_institute', label: 'Private institute' },
  { value: 'private_tutor', label: 'Private tutor' },
]

/** Card accent per institute type â€” top border + pill + icon tint. */
const TYPE_STYLE: Record<string, { top: string; pill: string; icon: string; Icon: typeof School }> = {
  school: {
    top: 'border-t-blue-500',
    pill: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: 'bg-blue-100 text-blue-700',
    Icon: School,
  },
  private_coaching: {
    top: 'border-t-orange-500',
    pill: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: 'bg-orange-100 text-orange-700',
    Icon: Users,
  },
  private_institute: {
    top: 'border-t-violet-500',
    pill: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: 'bg-violet-100 text-violet-700',
    Icon: GraduationCap,
  },
  private_tutor: {
    top: 'border-t-emerald-500',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-700',
    Icon: UserCheck,
  },
}

function styleFor(type: string) {
  return TYPE_STYLE[type] ?? TYPE_STYLE.school
}

function locationLine(row: Row): string {
  return [row.district_name, row.state_name, row.country_name].filter(Boolean).join(', ')
}

export function Directory() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') ?? ''
  const qFromUrl = params.get('q') ?? ''
  const countryFromUrl = params.get('country_id') ?? ''
  const stateFromUrl = params.get('state_id') ?? ''
  const districtFromUrl = params.get('district_id') ?? ''
  // Deep-link support: /directory?country_id=105&state_id=14686 pre-fills
  // the LocationFields so the API request matches the URL.
  // NOTE: initialised empty + synced from URL below. Initialising useState
  // directly from params() captures '' on first mount (React Router quirk)
  // and the page would request unfiltered then look "stuck".
  const [location, setLocation] = useState<LocationValue>({ countryId: '', stateId: '', districtId: '' })
  const [qInput, setQInput] = useState(qFromUrl)

  usePageSeo({
    title: 'Schools & coaching institutes near you Â· Student directory',
    description: 'Find schools, private coaching centres, institutes and tutors near you. Filter by country, state and district, then open a listing for its registration and basic details.',
    canonical: window.location.origin + '/directory',
    type: 'website',
  })
  const [rows, setRows] = useState<Row[]>([])
  const [totals, setTotals] = useState<GroupTotals>({ school: 0, institute: 0, tutor: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectType = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('type', value)
    else next.delete('type')
    setParams(next, { replace: true })
  }

  /** Keep the URL shareable when the location dropdowns change.
   *  Changing country resets state+district; changing state resets district â€”
   *  otherwise a stale district_id (e.g. Meerut 678 with Maharashtra 14686)
   *  filters everything to zero and the page wrongly shows "no institutes". */
  const changeLocation = (next: LocationValue) => {
    const fixed: LocationValue = { ...next }
    if (next.countryId !== location.countryId) {
      fixed.stateId = ''
      fixed.districtId = ''
    } else if (next.stateId !== location.stateId) {
      fixed.districtId = ''
    }
    setLocation(fixed)
    const sp = new URLSearchParams(params)
    if (fixed.countryId) sp.set('country_id', fixed.countryId)
    else sp.delete('country_id')
    if (fixed.stateId) sp.set('state_id', fixed.stateId)
    else sp.delete('state_id')
    if (fixed.districtId) sp.set('district_id', fixed.districtId)
    else sp.delete('district_id')
    setParams(sp, { replace: true })
  }

  // Debounce the search box into ?q= so typing filters (shareable URL),
  // back/forward works, and only one fetch fires per settled value.
  useEffect(() => {
    const trimmed = qInput.trim()
    if (trimmed === qFromUrl) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput])

  // Sync location dropdowns when the URL changes (deep-links, back/forward,
  // Clear filters). Guards against loops by only setting when different.
  useEffect(() => {
    setLocation((current) => {
      if (
        current.countryId === countryFromUrl &&
        current.stateId === stateFromUrl &&
        current.districtId === districtFromUrl
      ) {
        return current
      }
      return { countryId: countryFromUrl, stateId: stateFromUrl, districtId: districtFromUrl }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryFromUrl, stateFromUrl, districtFromUrl])

  // Keep the search box in sync with ?q= (deep-links, back/forward, Clear).
  useEffect(() => {
    setQInput((current) => (current === qFromUrl ? current : qFromUrl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl])

  const q = qFromUrl.trim()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api
      .get<{ result: { school?: Row[]; institute?: Row[]; tutor?: Row[] }; total: Partial<GroupTotals> }>('/directory', {
        params: {
          country_id: location.countryId || undefined,
          state_id: location.stateId || undefined,
          district_id: location.districtId || undefined,
          type: type || undefined,
          q: q || undefined,
        },
      })
      .then((response) => {
        if (!alive) return
        // Accept both shapes: {result:{school,institute,tutor},total:{...}}
        // (current API) and legacy bare {school,institute,tutor}.
        const payload = response.data as {
          result?: { school?: Row[]; institute?: Row[]; tutor?: Row[] }
          total?: Partial<GroupTotals>
        } & { school?: Row[]; institute?: Row[]; tutor?: Row[] }
        const groups = payload?.result ?? {
          school: payload?.school,
          institute: payload?.institute,
          tutor: payload?.tutor,
        }
        const asArray = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])
        // Tag each row with its group so the card colour survives flattening.
        // API: school[] -> School, institute[] -> Private coaching, tutor[] -> institute/tutor.
        const tagged: Row[] = [
          ...asArray(groups.school).map((r) => ({ ...r, group: 'school' as const })),
          ...asArray(groups.institute).map((r) => ({ ...r, group: 'institute' as const })),
          ...asArray(groups.tutor).map((r) => ({ ...r, group: 'tutor' as const })),
        ]
        setRows(tagged)
        setTotals({
          school: Number(response.data?.total?.school ?? asArray(groups.school).length),
          institute: Number(response.data?.total?.institute ?? asArray(groups.institute).length),
          tutor: Number(response.data?.total?.tutor ?? asArray(groups.tutor).length),
        })
      })
      .catch((cause: unknown) => {
        if (alive) setError(errMsg(cause, 'Could not load the directory'))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [location.countryId, location.stateId, location.districtId, type, q])

  const total = totals.school + totals.institute + totals.tutor
  const breakdown = `${totals.school} school${totals.school === 1 ? '' : 's'} Â· ${totals.institute} institute${totals.institute === 1 ? '' : 's'} Â· ${totals.tutor} tutor${totals.tutor === 1 ? '' : 's'}`
  // Default (no filters): backend returns a random 10+10+10 sample.
  // Any filter: backend returns the full newest-first list.
  const isDefault = !location.countryId && !location.stateId && !location.districtId && !type && !q
  const statusLine = loading
    ? 'Searching...'
    : isDefault
      ? `Showing ${rows.length} random picks (${breakdown}) â€” of ${total} total`
      : `${total} listing${total === 1 ? '' : 's'} (${breakdown})`

  const clearFilters = () => {
    setLocation({ countryId: '', stateId: '', districtId: '' })
    setQInput('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
          Institute directory
        </p>
        <h1 className="mt-1 text-xl font-bold text-[var(--text)] sm:text-2xl">
          Schools & coaching institutes near you
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
          Filter by country, state, district and type, then open a listing to see its registration
          and basic details.
        </p>
      </header>

      {/* Filters */}
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">Location</h2>
          <p className="mb-3 mt-1 text-xs text-[var(--text-muted)]">
            Leave a dropdown empty to search everywhere.
          </p>
          <LocationFields value={location} onChange={changeLocation} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-bold text-[var(--text)]">Type</h2>
            <div className="flex flex-wrap gap-2">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value || 'all'}
                  type="button"
                  onClick={() => selectType(tab.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    type === tab.value
                      ? 'accent-bg text-white'
                      : 'border border-[var(--border)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Colour legend: school=blue, coaching=orange, institute=violet, tutor=green */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> School
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Private coaching
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Private institute
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Private tutor
              </span>
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold text-[var(--text)]">Search</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                value={qInput}
                onChange={(event) => setQInput(event.target.value)}
                placeholder="Name or code... (e.g. Royal International)"
                className="field pl-9"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <p className="text-xs text-[var(--text-subtle)]" role="status">
            {statusLine}
          </p>
          <button type="button" onClick={clearFilters} className="btn btn-secondary !py-1.5 text-xs">
            Clear filters
          </button>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      {/* Debug: shows exactly what the page requested + got. Remove once stable. */}
      <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-subtle)]">
        API <code>{api.defaults.baseURL}/directory</code> Â· params{' '}
        <code>
          {JSON.stringify({
            country_id: location.countryId || undefined,
            state_id: location.stateId || undefined,
            district_id: location.districtId || undefined,
            type: type || undefined,
            q: q || undefined,
          })}
        </code>{' '}
        Â· rows <code>{rows.length}</code> Â· total <code>{total}</code> Â· URL{' '}
        <code>{window.location.pathname}{window.location.search}</code>
      </p>

      {loading ? (
        <div className="card flex items-center justify-center gap-2 p-10 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading listings...
        </div>
      ) : !error && rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title={total > 0 ? 'No cards on this page for these filters' : 'No institutes match these filters'}
            hint={
              total > 0
                ? `The API found ${breakdown} but this combination returned no cards (e.g. type tab "${type || 'All'}" or a district that belongs to another state). Try All types or Clear filters.`
                : 'Try clearing the district or switching the type tab - new coaching institutes join the directory every day.'
            }
            action={
              <button type="button" onClick={clearFilters} className="btn btn-primary">
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const style = styleFor(row.type)
            const { Icon } = style
            const place = locationLine(row)
            return (
              <article
                key={`${row.group ?? row.kind}-${row.kind}-${row.id}`}
                className={`card card-hover flex flex-col border-t-4 p-5 ${style.top}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.pill}`}>
                      {row.type_label}
                    </span>
                    <h2 className="mt-1.5 line-clamp-2 text-sm font-bold text-[var(--text)]">{row.name}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{row.code}</p>
                  </div>
                </div>
                {place && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {place}
                  </p>
                )}
                {row.address && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-subtle)]">{row.address}</p>}
                <Link
                  to={`/directory/${row.kind}/${row.id}`}
                  className="btn btn-secondary mt-4 w-full"
                >
                  View details
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
