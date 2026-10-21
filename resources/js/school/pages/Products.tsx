import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, PlusCircle, Trash2 } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type Product = {
  id: number
  name: string
  price?: number | string
  stock?: number
  category?: { name?: string }
}

export function Products() {
  const [rows, setRows] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [locked, setLocked] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.get('/school/products', { params: { page } })
      setRows(rowsOf<Product>(data))
      setMeta(metaOf(data))
      setLocked(false)
    } catch (e) {
      // The backend aborts 403 for non-independent schools (mustIndependent).
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        setLocked(true)
        setErr('')
      } else {
        setErr(errMsg(e, 'Could not load products'))
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setBusyId(id)
    setErr('')
    try {
      await api.delete(`/school/products/${id}`)
      await load()
    } catch (e) {
      setErr(errMsg(e, 'Delete failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My products"
        subtitle={`${meta.total} product${meta.total === 1 ? '' : 's'} added by your school`}
        actions={
          locked ? undefined : (
            <Link to="/products/new">
              <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
            </Link>
          )
        }
      />

      {locked && (
        <Alert kind="info">
          <span className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This school is <strong>not independent</strong>, so it cannot add or manage its own
              products. Browse the vendor <Link to="/catalogue" className="accent-text font-semibold underline">catalogue</Link> instead.
            </span>
          </span>
        </Alert>
      )}

      {err && <Alert>{err}</Alert>}

      {!locked && (
        <Panel bodyClass="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No products yet"
              hint="Products your school adds here appear alongside vendor items in the catalogue."
              action={
                <Link to="/products/new">
                  <Button icon={<PlusCircle className="h-4 w-4" />}>Add your first product</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{p.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {p.category?.name ?? 'Uncategorised'}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-bold text-[var(--text)]">
                    ₹{Number(p.price ?? 0).toFixed(2)}
                  </span>
                  <span className={`badge shrink-0 ${(p.stock ?? 0) > 0 ? 'badge-ok' : 'badge-danger'}`}>
                    {p.stock ?? 0}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${p.name}`}
                    disabled={busyId === p.id}
                    onClick={() => remove(p.id)}
                    className="shrink-0 text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {!locked && meta.lastPage > 1 && (
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
