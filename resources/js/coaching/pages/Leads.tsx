/**
 * Coaching panel — Enquiry / Leads screen (full version of the dashboard's
 * three clickable panels: calendar, interested students, enquiries).
 *
 *   GET /coaching/insights/summary?month=YYYY-MM → { month, days: {day: count}, ... }
 *   GET /coaching/insights/views?date=YYYY-MM-DD → viewer rows for the day (≤200)
 *   GET /coaching/enquiries                      → paginated 20/page leads
 *
 * Deep links: /leads?section=views|students|enquiries scrolls to that panel.
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type Viewer = {
  id: number
  name: string
  event: string
  location?: string | null
  filter_q?: string | null
  source?: string | null
  time: string
}

type Enquiry = {
  id: number
  name: string
  contact: string
  enquiry_for: string
  location?: string | null
  source?: string | null
  time: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
/** Shift YYYY-MM by n months. */
const shiftMonth = (month: string, n: number) => ym(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1))
/** Most recent YYYY-MM-DD key in a day map, or '' when empty. */
const latestDay = (days: Record<string, number>) =>
  Object.keys(days).sort().at(-1) ?? ''
const nextPageOf = (r: { data: unknown }): string | null =>
  (r.data as { next_page_url?: string | null })?.next_page_url ?? null
const timeOf = (t: string) =>
  new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function Leads() {
  const [params] = useSearchParams()
  const section = params.get('section') ?? 'views'

  const [month, setMonth] = useState(() => ym(new Date()))
  const [days, setDays] = useState<Record<string, number>>({})
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [date, setDate] = useState('')
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [viewsLoading, setViewsLoading] = useState(false)

  const [leads, setLeads] = useState<Enquiry[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [leadsMore, setLeadsMore] = useState(false)
  const [err, setErr] = useState('')

  const viewsRef = useRef<HTMLDivElement>(null)
  const studentsRef = useRef<HTMLDivElement>(null)
  const enquiriesRef = useRef<HTMLDivElement>(null)

  // Load the selected section once after data settles (deep link from dashboard).
  useEffect(() => {
    if (summaryLoading || leadsLoading) return
    const target = section === 'students' ? studentsRef.current : section === 'enquiries' ? enquiriesRef.current : viewsRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section, summaryLoading, leadsLoading])

  // Month → per-day counts; pick the busiest latest day by default.
  useEffect(() => {
    let alive = true
    setSummaryLoading(true)
    api
      .get('/coaching/insights/summary', { params: { month } })
      .then((r) => {
        if (!alive) return
        const map = (r.data?.days ?? {}) as Record<string, number>
        setDays(map)
        setDate((cur) => (cur && map[cur] != null ? cur : latestDay(map)))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load the view summary.'))
      })
      .finally(() => {
        if (alive) setSummaryLoading(false)
      })
    return () => {
      alive = false
    }
  }, [month])

  // Selected day → viewer rows.
  useEffect(() => {
    if (!date) {
      setViewers([])
      return
    }
    let alive = true
    setViewsLoading(true)
    api
      .get('/coaching/insights/views', { params: { date } })
      .then((r) => {
        if (alive) setViewers(rowsOf<Viewer>(r.data))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load viewers for that day.'))
      })
      .finally(() => {
        if (alive) setViewsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [date])

  // Leads (enquiries), paginated.
  useEffect(() => {
    let alive = true
    api
      .get('/coaching/enquiries')
      .then((r) => {
        if (!alive) return
        setLeads(rowsOf<Enquiry>(r.data))
        setNext(nextPageOf(r))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load leads.'))
      })
      .finally(() => {
        if (alive) setLeadsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const loadMoreLeads = () => {
    if (!next) return
    setLeadsMore(true)
    api
      .get(next)
      .then((r) => {
        setLeads((prev) => [...prev, ...rowsOf<Enquiry>(r.data)])
        setNext(nextPageOf(r))
      })
      .catch((e) => setErr(errMsg(e, 'Could not load more leads.')))
      .finally(() => setLeadsMore(false))
  }

  const [y, m] = month.split('-').map(Number)
  const maxCount = Math.max(1, ...Object.values(days))
  const totalMonth = Object.values(days).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiry/Leads" subtitle="Views, interested students and student enquiries" />
      {err && <Alert>{err}</Alert>}

      {/* 1 — Monthly views calendar (click a day to load its viewers). */}
      <div ref={viewsRef} className="scroll-mt-20">
        <Panel
          title="Monthly views (calendar)"
          subtitle="Pick a day to see who viewed your listing"
          tone="accent"
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                aria-label="Previous month"
                onClick={() => setMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-8 text-sm font-semibold text-[var(--text)]">
                {MONTHS[m - 1]} {y}
              </span>
              <Button
                variant="ghost"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          {summaryLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : Object.keys(days).length === 0 ? (
            <EmptyState title="No views this month" hint="Views appear here as students find your listing." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <th key={d} className="border-b border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(days).map(([day, count]) => {
                      const dow = new Date(`${day}T00:00:00`).getDay()
                      return (
                        <tr key={day}>
                          {Array.from({ length: dow }).map((_, i) => (
                            <td key={`pad-${i}`} className="border-b border-[var(--border)] px-4 py-3" />
                          ))}
                          <td
                            className={`cursor-pointer border-b border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)] ${
                              date === day ? 'accent-soft' : ''
                            }`}
                            onClick={() => setDate(day)}
                            title={`Show viewers on ${day}`}
                          >
                            <span className="text-sm font-semibold text-[var(--text)]">{Number(day.slice(8))}</span>
                            <div className="mt-1 h-2 w-full rounded-full bg-[var(--surface-3)]">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="mt-0.5 block text-xs font-semibold text-[var(--text)]">
                              {count} view{count !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Total this month: <span className="font-semibold">{totalMonth}</span> views
              </p>
            </>
          )}
        </Panel>
      </div>

      {/* 2 — Interested students for the selected day. */}
      <div ref={studentsRef} className="scroll-mt-20">
        <Panel
          title="Interested students"
          subtitle={date ? `Viewers on ${date}` : 'Pick a day above to see viewers'}
          tone="ok"
          bodyClass="p-0 lg:max-h-[28rem] lg:overflow-y-auto"
        >
          {viewsLoading ? (
            <div className="divide-y divide-[var(--border)]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : viewers.length === 0 ? (
            <EmptyState title="No viewers for this day" hint="Choose another day from the calendar." />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {viewers.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text)]">{v.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{v.event}</span>
                    </div>
                    {v.location && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{v.location}</p>}
                    {v.filter_q && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">Searched: &quot;{v.filter_q}&quot;</p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">{timeOf(v.time)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 3 — Enquiries / leads, paginated. */}
      <div ref={enquiriesRef} className="scroll-mt-20">
        <Panel
          title="Enquiry / leads"
          subtitle="Students who asked to be contacted"
          tone="warn"
          bodyClass="p-0 lg:max-h-[28rem] lg:overflow-y-auto"
        >
          {leadsLoading ? (
            <div className="divide-y divide-[var(--border)]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <EmptyState title="No leads yet" hint="Enquiries from students will appear here." />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {leads.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text)]">{e.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{e.source}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{e.enquiry_for}</p>
                    {e.contact && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{e.contact}</p>}
                    {e.location && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{e.location}</p>}
                  </div>
                  <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">{timeOf(e.time)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        {next && (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" busy={leadsMore} onClick={loadMoreLeads}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
