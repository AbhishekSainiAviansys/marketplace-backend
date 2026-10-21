import { useCallback, useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type CatProduct = {
  id: number
  name: string
  price?: number | string
  stock?: number
  category?: { name?: string }
}

/** Products from every vendor linked to this school, plus its own. */
export function Catalogue() {
  const [rows, setRows] = useState<CatProduct[]>([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.get('/school/catalog', { params: { page } })
      setRows(rowsOf<CatProduct>(data))
      setMeta(metaOf(data))
    } catch (e) {
      setErr(errMsg(e, 'Could not load the catalogue'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue"
        subtitle="Products available from vendors linked to your school."
      />

      {err && <Alert>{err}</Alert>}

      <Panel bodyClass="p-0">
        {loading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] p-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing in the catalogue yet"
            hint="Products appear here once an admin links a vendor to your school and that vendor adds products."
          />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((p) => (
              <article
                key={p.id}
                className="card card-hover flex flex-col p-4 hover:shadow-[var(--shadow-raised)]"
              >
                <span className="icon-tile accent-soft accent-soft-text">
                  <BookOpen className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-[var(--text)]">{p.name}</h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {p.category?.name ?? 'Uncategorised'}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="tnum text-lg font-bold text-[var(--text)]">
                    ₹{Number(p.price ?? 0).toFixed(2)}
                  </span>
                  <span className={`badge ${(p.stock ?? 0) > 0 ? 'badge-ok' : 'badge-danger'}`}>
                    {p.stock ?? 0} in stock
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {meta.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-[var(--text-muted)]">
            Page {meta.page} of {meta.lastPage}
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
