import { useEffect, useState } from 'react'
import { HandCoins, Store } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type LinkedVendor = {
  id: number
  shop_name?: string | null
  name?: string | null
  address?: string | null
  pivot?: { royalty_percent?: number | string }
}

export function Vendors() {
  const [rows, setRows] = useState<LinkedVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    api
      .get('/school/vendors')
      .then((r) => {
        if (alive) setRows(rowsOf<LinkedVendor>(r.data))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load vendors'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Linked vendors"
        subtitle="Vendors an admin has connected to your school."
      />

      {err && <Alert>{err}</Alert>}

      <Panel bodyClass="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No vendors linked"
            hint="Once an admin assigns a vendor to your school it will appear here with its royalty."
          />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="th">Shop</th>
                    <th className="th">Contact</th>
                    <th className="th">Address</th>
                    <th className="th text-right">Royalty</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id} className="row-hover">
                      <td className="td font-medium">{v.shop_name ?? v.name ?? `Vendor ${v.id}`}</td>
                      <td className="td text-[var(--text-muted)]">{v.name ?? '—'}</td>
                      <td className="td text-[var(--text-muted)]">{v.address ?? '—'}</td>
                      <td className="td tnum text-right">
                        <span className="badge badge-accent">
                          {v.pivot?.royalty_percent != null ? `${v.pivot.royalty_percent}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--border)] md:hidden">
              {rows.map((v) => (
                <li key={v.id} className="flex items-center gap-3 p-4">
                  <span className="icon-tile h-10 w-10 rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)]">
                    <Store className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {v.shop_name ?? v.name ?? `Vendor ${v.id}`}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{v.address ?? '—'}</p>
                  </div>
                  <span className="badge badge-accent shrink-0">
                    {v.pivot?.royalty_percent != null ? `${v.pivot.royalty_percent}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
        <HandCoins className="h-3.5 w-3.5" />
        Royalty percentages are set by an admin and apply to sales made through your school.
      </p>
    </div>
  )
}
