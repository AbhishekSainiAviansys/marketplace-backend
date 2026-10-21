import { useEffect, useState } from 'react'
import { HandCoins, School } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, EmptyState, PageHeader, Panel, Skeleton, StatCard } from '@ui'

type Linked = {
  id: number
  name?: string | null
  school_code?: string | null
  address?: string | null
  pivot?: { royalty_percent?: number | string }
}

type Royalty = { school: string; royalty: number | string }

export function Schools() {
  const [rows, setRows] = useState<Linked[]>([])
  const [royalties, setRoyalties] = useState<Royalty[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')

    void (async () => {
      const [s, r] = await Promise.allSettled([
        api.get('/vendor/schools'),
        api.get('/vendor/royalties'),
      ])
      if (!alive) return
      if (s.status === 'fulfilled') setRows(rowsOf<Linked>(s.value.data))
      else setErr(errMsg(s.reason, 'Could not load linked schools'))
      if (r.status === 'fulfilled') setRoyalties(rowsOf<Royalty>(r.value.data))
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [])

  // Average royalty across assignments - a quick health signal for the vendor.
  const avgRoyalty = royalties.length
    ? royalties.reduce((a, r) => a + Number(r.royalty ?? 0), 0) / royalties.length
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Linked schools"
        subtitle="Schools an admin has connected to your store, with the agreed royalty."
      />

      {err && <Alert>{err}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          [0, 1].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-8 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Linked schools"
              value={rows.length}
              hint="Assigned by an admin"
              icon={<School className="h-5 w-5" />}
              tone="info"
            />
            <StatCard
              label="Average royalty"
              value={avgRoyalty == null ? '—' : `${avgRoyalty.toFixed(1)}%`}
              hint="Across all assignments"
              icon={<HandCoins className="h-5 w-5" />}
              tone="ok"
            />
          </>
        )}
      </div>

      <Panel title="All linked schools" subtitle="Royalty partners for your catalogue" bodyClass="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No schools linked yet"
            hint="Once an admin assigns a school to your store it will appear here with its royalty percentage."
          />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="th">School</th>
                    <th className="th">Code</th>
                    <th className="th">Address</th>
                    <th className="th text-right">Royalty</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="row-hover">
                      <td className="td font-medium">{s.name ?? `School ${s.id}`}</td>
                      <td className="td">
                        <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-xs">
                          {s.school_code ?? '—'}
                        </code>
                      </td>
                      <td className="td text-[var(--text-muted)]">{s.address ?? '—'}</td>
                      <td className="td tnum text-right">
                        <span className="badge badge-accent">
                          {s.pivot?.royalty_percent != null ? `${s.pivot.royalty_percent}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--border)] md:hidden">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <span className="icon-tile h-10 w-10 rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)]">
                    <School className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {s.name ?? `School ${s.id}`}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {s.school_code ?? '—'}
                      {s.address ? ` · ${s.address}` : ''}
                    </p>
                  </div>
                  <span className="badge badge-accent shrink-0">
                    {s.pivot?.royalty_percent != null ? `${s.pivot.royalty_percent}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  )
}
