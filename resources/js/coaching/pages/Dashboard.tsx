/**
 * Coaching institute dashboard.
 *
 * GET /coaching/dashboard-analytics returns:
 *   institute, overview {total_views, total_enquiries, views_this_month,
 *     enquiries_this_month, unique_students}, monthly {day->count},
 *   admin_messages, recent_viewers, recent_enquiries
 *
 * UI: stat cards + calendar view (default current month) + interested students list.
 */
import { useEffect, useState, type MouseEvent } from 'react'
import { Activity, ArrowRight, Eye, Mail, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errMsg } from '@lib/api'
import {
  Alert,
  Button,
  PageHeader,
  Panel,
  Skeleton,
  StatCard,
} from '@ui'

type Overview = {
  total_views: number
  total_enquiries: number
  views_this_month: number
  enquiries_this_month: number
  unique_students: number
}

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

type DashboardData = {
  institute: { id: number; name: string; institute_code: string; institute_type: string } | null
  overview: Overview
  monthly: Record<string, number>
  admin_messages: any[]
  recent_viewers: Viewer[]
  recent_enquiries: Enquiry[]
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  /** Keep clicks on the header's View all link from also firing the panel onClick. */
  const stop = (e: MouseEvent) => e.stopPropagation()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    api
      .get('/coaching/dashboard-analytics')
      .then((r) => {
        if (alive) setData(r.data)
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'API offline – is Laravel running on :8001?'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Your coaching institute at a glance" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-4 w-full" />
            <div className="mt-2 grid gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 w-3/4 skeleton" />
              ))}
            </div>
          </div>
          <div className="card p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-4 w-full" />
            <div className="mt-2 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 skeleton" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Your coaching institute at a glance" />
        <Alert>{err}</Alert>
      </div>
    )
  }

  const ov = data?.overview
  const monthly = data?.monthly ?? {}
  const days = Object.entries(monthly).map(([day, count]) => ({ day, count }))
  const totalMonthViews = Object.values(monthly).reduce((a, b) => a + b, 0)
  const viewers = data?.recent_viewers ?? []
  const enquiries = data?.recent_enquiries ?? []

  const conversionRate =
    ov?.total_views && ov?.total_enquiries
      ? Math.round((ov.total_enquiries / ov.total_views) * 100)
      : 0

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      <PageHeader
        title="Dashboard"
        subtitle={`Your coaching institute at a glance · ${data?.institute?.name ?? ''}`}
        actions={
          data?.institute && (
            <Button icon={<Eye className="h-4 w-4" />} className="btn-outline">
              View public listing
            </Button>
          )
        }
      />

      {err && <Alert>{err}</Alert>}

      {/* Admin messages — top of the screen, latest 2; full list behind View all. */}
      {data?.admin_messages && data.admin_messages.length > 0 && (
        <Panel
          title="Admin messages"
          subtitle="Latest system notifications"
          tone="info"
          className="shrink-0"
          bodyClass="p-4"
          actions={
            <Link to="/messages">
              <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                View all
              </Button>
            </Link>
          }
        >
          <div className="divide-y divide-[var(--border)]">
            {data.admin_messages.slice(0, 2).map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{m.title}</p>
                  {m.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{m.body}</p>
                  )}
                </div>
                <span className="text-xs text-[var(--text-subtle)] whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total views"
          value={ov?.total_views ?? 0}
          icon={<Eye className="h-5 w-5" />}
          tone="info"
          hint="All-time search appearances"
        />
        <StatCard
          label="Enquiries"
          value={ov?.total_enquiries ?? 0}
          icon={<Mail className="h-5 w-5" />}
          tone="accent"
          hint="Student contact popups"
        />
        <StatCard
          label="Students interested"
          value={ov?.unique_students ?? 0}
          icon={<Users className="h-5 w-5" />}
          tone="ok"
          hint="Unique viewers this month"
        />
        <StatCard
          label="Conversion"
          value={`${conversionRate}%`}
          icon={<Activity className="h-5 w-5" />}
          tone="warn"
          hint="Enquiries ÷ views"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        <Panel
          title="Monthly views (calendar)"
          subtitle="Default: current month"
          tone="accent"
          className="lg:flex lg:flex-col cursor-pointer"
          bodyClass="p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          onClick={() => nav('/leads?section=views')}
          actions={
            <span onClick={stop}>
              <Link to="/leads?section=views">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                  View all
                </Button>
              </Link>
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <th key={d} className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                      No view data for this month yet.
                    </td>
                  </tr>
                ) : (
                  days.map((d) => (
                    <tr key={d.day}>
                      <td className="px-4 py-3 border-b border-[var(--border)] whitespace-nowrap">
                        <span className="text-sm text-[var(--text-muted)]">{d.day.slice(5)}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--border)]">
                        <div className="h-2 bg-[var(--surface-3)] rounded-full w-full">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (d.count / Math.max(1, ...Object.values(monthly))),
                              ) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text)] mt-1 block">
                          {d.count} view{d.count !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Total this month: <span className="font-semibold">{totalMonthViews}</span> views
          </p>
        </Panel>

        <Panel
          title="Interested students"
          subtitle="Recent profile viewers"
          tone="ok"
          className="lg:flex lg:flex-col cursor-pointer"
          bodyClass="p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          onClick={() => nav('/leads?section=students')}
          actions={
            <span onClick={stop}>
              <Link to="/leads?section=students">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                  View all
                </Button>
              </Link>
            </span>
          }
        >
          {viewers.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              No viewers yet. Students who open your listing will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {viewers.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)] truncate">
                        {v.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{v.event}</span>
                    </div>
                    {v.location && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {v.location}
                      </p>
                    )}
                    {v.filter_q && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Searched: "{v.filter_q}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(v.time).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Recent enquiries"
          subtitle="Student contact requests"
          tone="warn"
          className="lg:flex lg:flex-col cursor-pointer"
          bodyClass="p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
          onClick={() => nav('/leads?section=enquiries')}
          actions={
            <span onClick={stop}>
              <Link to="/leads?section=enquiries">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                  View all
                </Button>
              </Link>
            </span>
          }
        >
          {enquiries.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              No enquiries yet. Students who contact you will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {enquiries.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)] truncate">
                        {e.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{e.source}</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">
                      {e.enquiry_for}
                    </p>
                    {e.contact && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {e.contact}
                      </p>
                    )}
                    {e.location && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {e.location}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(e.time).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}