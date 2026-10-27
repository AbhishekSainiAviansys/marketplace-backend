import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Trash2, Zap, Eye, EyeOff, Pencil, Search } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { assetUrl } from '@lib/brand'
import { Button, EmptyState, PageHeader, Panel, Skeleton, useToast } from '@ui'

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
  productStocks?: { quantity?: number; color?: string | null; size?: string | null }[]
}

const DELIVERY: Record<string, string> = {
  self: 'Self delivery',
  thirdparty: 'Third party',
  school_pickup: 'School pickup',
}


export function Products() {
  const toast = useToast()
  const [rows, setRows] = useState<Product[]>([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)

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

  const loadProduct = async (id: string) => {
    setViewing(null)
    try {
      const { data } = await api.get(`/admin/products/${id}`)
      setViewing(data as Product)
    } catch (e) {
      toast('err', errMsg(e, 'Could not load product details'))
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
                onClick={() => void loadProduct(p.product_code ?? '')}
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
                    {p.delivery_mode ? ` · ${DELIVERY[p.delivery_mode] ?? p.delivery_mode}` : ''}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
                    <span><span className="text-[var(--text-subtle)]">MRP:</span> ₹{Number(p.mrp ?? 0).toFixed(2)}</span>
                    <span><span className="text-[var(--text-subtle)]">Price:</span> ₹{Number(p.price ?? 0).toFixed(2)}</span>
                    <span><span className="text-[var(--text-subtle)]">Stock:</span> {p.stock ?? 0}</span>
                    <span><span className="text-[var(--text-subtle)]">Delivery:</span> {p.delivery_charge == null ? 'Estimated' : `₹${Number(p.delivery_charge).toFixed(2)}`}</span>
                    <span><span className="text-[var(--text-subtle)]">Portal:</span> {p.portal_charge == null ? '—' : `₹${Number(p.portal_charge).toFixed(2)}`}</span>
                    <span><span className="text-[var(--text-subtle)]">Server:</span> {p.server_charge == null ? '—' : `₹${Number(p.server_charge).toFixed(2)}`}</span>
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

      {viewing && (
        <div className="fixed inset-y-0 right-0 z-50 flex flex-col max-w-full w-full md:w-[420px]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="relative bg-white border-l shadow-2xl flex flex-col max-h-full">
            <div className="flex items-center justify-between gap-3 p-4 border-b">
              <h2 className="text-sm font-semibold text-[var(--text)]">Product details</h2>
              <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {(viewing.images ?? []).slice(0, 1).map((img) => (
                    <img key={img.id} src={assetUrl(img.url ?? null) ?? img.url ?? ''} alt={viewing.name} className="h-24 w-24 rounded-lg object-cover bg-[var(--surface-muted)]" />
                  ))}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{viewing.name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{viewing.product_code}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${viewing.is_active ? 'badge-ok' : 'badge-danger'}`}>{viewing.is_active ? 'Active' : 'Inactive'}</span>
                      {viewing.is_boost && <span className="badge badge-warn"><Zap className="mr-1 h-3 w-3" /> Boosted</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{viewing.category?.name ?? 'Uncategorised'}{viewing.subCategory ? ` › ${viewing.subCategory.name}` : ''}</p>
                  </div>
                </div>
                {(viewing.images ?? []).length > 1 && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">Images</p>
                    <div className="flex gap-2">
                      {(viewing.images ?? []).map((img) => (
                        <img key={img.id} src={assetUrl(img.url ?? null) ?? img.url ?? ''} alt={viewing.name} className="h-12 w-12 rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><span className="block text-[var(--text-muted)]">SKU</span><span>{viewing.sku ?? '—'}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Price</span><span>₹{Number(viewing.price ?? 0).toFixed(2)}</span></div>
                  <div><span className="block text-[var(--text-muted)]">MRP</span><span>₹{Number(viewing.mrp ?? 0).toFixed(2)}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Stock</span><span>{viewing.stock ?? 0}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Delivery mode</span><span>{viewing.delivery_mode ? DELIVERY[viewing.delivery_mode] ?? viewing.delivery_mode : '—'}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Delivery charge</span><span>{viewing.delivery_charge == null ? '—' : `₹${Number(viewing.delivery_charge).toFixed(2)}`}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Portal charge</span><span>{viewing.portal_charge == null ? '—' : `₹${Number(viewing.portal_charge).toFixed(2)}`}</span></div>
                  <div><span className="block text-[var(--text-muted)]">Server charge</span><span>{viewing.server_charge == null ? '—' : `₹${Number(viewing.server_charge).toFixed(2)}`}</span></div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] mb-1">Stock</h3>
                  <table className="w-full text-xs border border-slate-200 rounded">
                    <thead>
                      <tr className="bg-[var(--surface-muted)]">
                        <th className="px-2 py-1 text-left">Size</th>
                        <th className="px-2 py-1 text-left">Colour</th>
                        <th className="px-2 py-1 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewing.productStocks ?? viewing.variants ?? []).map((s, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-1">{s.size ?? '—'}</td>
                          <td className="px-2 py-1">{s.color ?? '—'}</td>
                          <td className="px-2 py-1 text-right">{Number((s as { quantity?: number | null }).quantity ?? (s as { stock?: number | null }).stock ?? 0)}</td>
                        </tr>
                      ))}
                      {((viewing.productStocks ?? viewing.variants ?? []).length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-2 py-1 text-[var(--text-muted)]">No stock records</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {(viewing.values ?? []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] mb-1">Attributes</h3>
                    <table className="w-full text-xs border border-slate-200 rounded">
                      <tbody>
                        {(viewing.values ?? []).map((v) => (
                          <tr key={v.id} className="border-t border-slate-100">
                            <td className="px-2 py-1 text-[var(--text-muted)]">{v.field?.name ?? 'Field'}</td>
                            <td className="px-2 py-1 text-right">{v.value_text ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 border-t flex justify-end gap-2 bg-[var(--surface-muted)]">
              <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
              <Link to={`/products/${viewing.product_code}/edit`}>
                <Button variant="primary">Edit product</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

