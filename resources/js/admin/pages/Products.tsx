import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, Trash2, Zap, Eye, EyeOff, Pencil, Search, Package, Loader2 } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { assetUrl } from '@lib/brand'
import { Button, EmptyState, Modal, PageHeader, Panel, Skeleton, useToast } from '@ui'

type Product = {
  id?: number
  product_code: string
  name: string
  sku?: string | null
  price?: number | string
  mrp?: number | string
  stock?: number
  is_active?: boolean
  is_boost?: boolean
  boost_until?: string | null
  delivery_mode?: string
  delivery_charge?: number | string | null
  portal_charge?: number | string | null
  server_charge?: number | string | null
  category?: { name?: string }
  subCategory?: { name?: string }
  images?: { id?: number; url?: string }[]
  values?: { id?: number; field?: { name?: string }; value_text?: string | null }[]
  variants?: { id?: number; size?: string | null; color?: string | null; stock?: number; sku?: string | null }[]
  product_stocks?: { id?: number; quantity?: number; stock?: number; qty?: number; color?: string | null; colour?: string | null; size?: string | null; color_code?: string | null; variant_id?: number | null }[]
  stock_trackings?: { id?: number; delta?: number; quantity?: number; qty?: number; change?: number; color?: string | null; colour?: string | null; size?: string | null; color_code?: string | null; reason?: string | null; created_at?: string | null; variant_id?: number | null }[]
}

const DELIVERY: Record<string, string> = {
  self: 'Self delivery',
  thirdparty: 'Third party',
  school_pickup: 'School pickup',
}


export function Products() {
  const toast = useToast()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockPage, setStockPage] = useState(1)
  const [trackingPage, setTrackingPage] = useState(1)
  const STOCK_PAGE_SIZE = 8

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/products', {
        params: { page, per_page: perPage, search: search || undefined, admin_only: 1 },
      })
      setRows(rowsOf<Product>(data))
      setMeta(metaOf(data))
    } catch (e) {
      toast('err', errMsg(e, 'Could not load products'))
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [search])

  const toggleActive = async (p: Product) => {
    setBusyId(p.product_code)
    try {
      await api.put(`/admin/products/${p.product_code}`, { is_active: !p.is_active })
      toast('ok', `Product ${p.is_active ? 'deactivated' : 'activated'}`)
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Status update failed'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setBusyId(id)
    try {
      await api.delete(`/admin/products/${id}`)
      toast('ok', 'Product deleted')
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Delete failed'))
    } finally {
      setBusyId(null)
    }
  }

  const openStockModal = async (p: Product) => {
    setStockModalProduct(p)
    setStockModalOpen(true)
    setStockPage(1)
    setTrackingPage(1)
    setStockLoading(true)
    try {
      const { data } = await api.get(`/admin/products/${p.product_code}`)
      setStockModalProduct(data as Product)
    } catch (e) {
      toast('err', errMsg(e, 'Could not load stock details'))
    } finally {
      setStockLoading(false)
    }
  }

  const toggleBoost = async (p: Product) => {
    setBusyId(p.product_code)
    try {
      await api.put(`/admin/products/${p.product_code}`, {
        is_boost: !p.is_boost,
        boost_until: p.is_boost ? null : p.boost_until ?? null,
      })
      toast('ok', p.is_boost ? 'Boost removed' : 'Boost enabled')
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Boost update failed'))
    } finally {
      setBusyId(null)
    }
  }

  const updateBoostUntil = async (p: Product, value: string) => {
    setBusyId(p.product_code)
    try {
      await api.put(`/admin/products/${p.product_code}`, {
        is_boost: true,
        boost_until: value || null,
      })
      toast('ok', 'Boost date updated')
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Boost update failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Products"
        subtitle={`${meta.total} product${meta.total === 1 ? '' : 's'} managed by admin`}
        actions={
          <Link to="/products/new">
            <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
          </Link>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name"
              className="field focus:field-focus w-full pl-9 outline-none"
            />
          </div>
          <span className="text-sm text-[var(--text-muted)]">
            Page {meta.page} of {meta.lastPage}
          </span>
          <label className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            Per page
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="field focus:field-focus text-xs border border-slate-300 rounded px-1 py-0.5 outline-none bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </Panel>

      <Panel bodyClass="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Products you add here appear in the catalogue."
            action={
              <Link to="/products/new">
                <Button icon={<PlusCircle className="h-4 w-4" />}>Add your first product</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((p) => (
              <li
                key={p.product_code}
                className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start cursor-pointer hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
                onClick={() => void navigate('/products/' + p.product_code)}
              >
                <div className="flex shrink-0 gap-1.5">
                  {(p.images ?? []).slice(0, 4).map((img, i) =>
                    img.url ? (
                      <img
                        key={i}
                        src={assetUrl(img.url) ?? img.url}
                        alt={p.name}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : null,
                  )}
                  {(p.images ?? []).length === 0 && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-xs text-[var(--text-subtle)]">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{p.name}</p>
                    <span className={`badge ${p.is_active ? 'badge-ok' : 'badge-danger'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {p.is_boost && (
                      <span className="badge badge-warn">
                        <Zap className="mr-1 h-3 w-3" />
                        Boosted
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {p.category?.name ?? 'Uncategorised'}
                    {p.delivery_mode ? ` ${DELIVERY[p.delivery_mode] ?? p.delivery_mode}` : ''}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
                    <span><span className="text-[var(--text-subtle)]">MRP:</span> ?{Number(p.mrp ?? 0).toFixed(2)}</span>
                    <span><span className="text-[var(--text-subtle)]">Price:</span> ?{Number(p.price ?? 0).toFixed(2)}</span>
                    <span><span className="text-[var(--text-subtle)]">Stock:</span> {p.stock ?? 0}</span>
                    <span><span className="text-[var(--text-subtle)]">Delivery:</span> {p.delivery_charge == null ? 'Estimated' : `?${Number(p.delivery_charge).toFixed(2)}`}</span>
                    <span><span className="text-[var(--text-subtle)]">Portal:</span> {p.portal_charge == null ? '0' : `?${Number(p.portal_charge).toFixed(2)}`}</span>
                    <span><span className="text-[var(--text-subtle)]">Server:</span> {p.server_charge == null ? '0' : `?${Number(p.server_charge).toFixed(2)}`}</span>
                  </div>
                </div>

                <div
                  className="flex flex-wrap items-center gap-2 lg:w-[360px] lg:justify-end"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => e.stopPropagation()}
                >
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={!!p.is_boost}
                      disabled={busyId === p.product_code}
                      onChange={() => void toggleBoost(p)}
                      className="rounded border-slate-300 text-accent"
                    />
                    <Zap className="h-3.5 w-3.5" />
                    Boost
                  </label>
                  <input
                    type="date"
                    value={p.boost_until ? String(p.boost_until).slice(0, 10) : ''}
                    disabled={busyId === p.product_code || !p.is_boost}
                    onChange={(e) => void updateBoostUntil(p, e.target.value)}
                    className="field focus:field-focus w-36 py-1 text-xs outline-none"
                  />
                  <Button
                    variant={p.is_active ? 'secondary' : 'ghost'}
                    aria-label={`Toggle ${p.name}`}
                    disabled={busyId === p.product_code}
                    onClick={() => void toggleActive(p)}
                    className="shrink-0"
                  >
                    {p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Stock ${p.name}`}
                    className="shrink-0"
                    onClick={() => void openStockModal(p)}
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                  <Link to={`/products/${p.product_code}/edit`}>
                    <Button variant="ghost" aria-label={`Edit ${p.name}`} className="shrink-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${p.name}`}
                    disabled={busyId === p.product_code}
                    onClick={() => void remove(p.product_code)}
                    className="shrink-0 text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!loading && meta.lastPage > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
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
      {stockModalOpen && (
        <Modal title={`Stock details ${stockModalProduct?.name ?? ''}`} sub="Product stock rows and tracking history." wide onClose={() => setStockModalOpen(false)}>
          {stockLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stock details…
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Product stocks</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Colour</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Size</th>
                        <th className="px-3 py-2 text-right text-xs text-slate-500">Qty</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Color code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockModalProduct?.product_stocks ?? []).length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No stock rows</td></tr>
                      ) : (
                        (stockModalProduct?.product_stocks ?? [])
                          .slice((stockPage - 1) * STOCK_PAGE_SIZE, stockPage * STOCK_PAGE_SIZE)
                          .map((s, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-3 py-2">{s.colour ?? s.color ?? '0'}</td>
                              <td className="px-3 py-2">{s.size ?? '0'}</td>
                              <td className="px-3 py-2 text-right">{Number(s.quantity ?? s.stock ?? s.qty ?? 0)}</td>
                              <td className="px-3 py-2">{s.color_code ?? '0'}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
                {(stockModalProduct?.product_stocks ?? []).length > STOCK_PAGE_SIZE && (
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <button type="button" disabled={stockPage <= 1} onClick={() => setStockPage((p) => p - 1)} className="btn btn-secondary !py-1 !text-xs">Prev</button>
                    <span>Page {stockPage} of {Math.ceil((stockModalProduct?.product_stocks?.length ?? 0) / STOCK_PAGE_SIZE)}</span>
                    <button type="button" disabled={stockPage >= Math.ceil((stockModalProduct?.product_stocks?.length ?? 0) / STOCK_PAGE_SIZE)} onClick={() => setStockPage((p) => p + 1)} className="btn btn-secondary !py-1 !text-xs">Next</button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Stock trackings</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Colour</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Size</th>
                        <th className="px-3 py-2 text-right text-xs text-slate-500">Quantity</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Reason</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockModalProduct?.stock_trackings ?? []).length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">No tracking rows</td></tr>
                      ) : (
                        (stockModalProduct?.stock_trackings ?? [])
                          .slice((trackingPage - 1) * STOCK_PAGE_SIZE, trackingPage * STOCK_PAGE_SIZE)
                          .map((t, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-3 py-2">{t.colour ?? t.color ?? '0'}{t.color_code}</td>
                              <td className="px-3 py-2">{t.size ?? '0'}</td>
                              <td className="px-3 py-2 text-right">{Number(t.change ?? t.quantity ?? t.qty ?? 0)}</td>
                              <td className="px-3 py-2">{t.reason ?? '0'}</td>
                              <td className="px-3 py-2">{t.created_at ?? '0'}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
                {(stockModalProduct?.stock_trackings ?? []).length > STOCK_PAGE_SIZE && (
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <button type="button" disabled={trackingPage <= 1} onClick={() => setTrackingPage((p) => p - 1)} className="btn btn-secondary !py-1 !text-xs">Prev</button>
                    <span>Page {trackingPage} of {Math.ceil((stockModalProduct?.stock_trackings?.length ?? 0) / STOCK_PAGE_SIZE)}</span>
                    <button type="button" disabled={trackingPage >= Math.ceil((stockModalProduct?.stock_trackings?.length ?? 0) / STOCK_PAGE_SIZE)} onClick={() => setTrackingPage((p) => p + 1)} className="btn btn-secondary !py-1 !text-xs">Next</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

    </div>
  )
}

