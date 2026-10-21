import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Trash2 } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type Product = {
  id: number
  name: string
  price?: number | string
  stock?: number
  delivery_mode?: string
  category?: { name?: string }
}

const DELIVERY: Record<string, string> = {
  self: 'Self delivery',
  thirdparty: 'Third party',
  school_pickup: 'School pickup',
}

export function Products() {
  const [rows, setRows] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.get('/vendor/products', { params: { page } })
      setRows(rowsOf<Product>(data))
      setMeta(metaOf(data))
    } catch (e) {
      setErr(errMsg(e, 'Could not load products'))
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
      await api.delete(`/vendor/products/${id}`)
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
        subtitle={`${meta.total} product${meta.total === 1 ? '' : 's'} in your catalogue`}
        actions={
          <Link to="/products/new">
            <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
          </Link>
        }
      />

      {err && <Alert>{err}</Alert>}

      <Panel bodyClass="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Products you add here become visible to every school linked to your store."
            action={
              <Link to="/products/new">
                <Button icon={<PlusCircle className="h-4 w-4" />}>Add your first product</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop table - full column set */}
            <div className="table-wrap hidden md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="th">Product</th>
                    <th className="th">Category</th>
                    <th className="th">Delivery</th>
                    <th className="th text-right">Price</th>
                    <th className="th text-right">Stock</th>
                    <th className="th text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="row-hover">
                      <td className="td font-medium">{p.name}</td>
                      <td className="td text-[var(--text-muted)]">{p.category?.name ?? '—'}</td>
                      <td className="td text-[var(--text-muted)]">
                        {DELIVERY[p.delivery_mode ?? ''] ?? '—'}
                      </td>
                      <td className="td tnum text-right">₹{Number(p.price ?? 0).toFixed(2)}</td>
                      <td className="td tnum text-right">
                        <span className={`badge ${(p.stock ?? 0) > 0 ? 'badge-ok' : 'badge-danger'}`}>
                          {p.stock ?? 0}
                        </span>
                      </td>
                      <td className="td text-right">
                        <Button
                          variant="ghost"
                          aria-label={`Delete ${p.name}`}
                          disabled={busyId === p.id}
                          onClick={() => remove(p.id)}
                          className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards - a 6-column table cannot fit a phone */}
            <ul className="divide-y divide-[var(--border)] md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {p.category?.name ?? 'Uncategorised'} ·{' '}
                        {DELIVERY[p.delivery_mode ?? ''] ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${(p.stock ?? 0) > 0 ? 'badge-ok' : 'badge-danger'}`}
                    >
                      {p.stock ?? 0} in stock
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="tnum text-lg font-bold text-[var(--text)]">
                      ₹{Number(p.price ?? 0).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      aria-label={`Delete ${p.name}`}
                      disabled={busyId === p.id}
                      onClick={() => remove(p.id)}
                      className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
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
