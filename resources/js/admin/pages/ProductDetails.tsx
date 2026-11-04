import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Eye, EyeOff, Zap, Package, Loader2 } from 'lucide-react'
import { api, errMsg } from '@lib/api'
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
  images?: { id?: number; url?: string; is_primary?: boolean }[]
  values?: { id?: number; field?: { name?: string; field_name?: string; field_label?: string }; field_name?: string; field_label?: string; value_text?: string | null }[]
  variants?: { id?: number; size?: string | null; color?: string | null; stock?: number; sku?: string | null }[]
  product_stocks?: { id?: number; quantity?: number; stock?: number; qty?: number; color?: string | null; colour?: string | null; size?: string | null; color_code?: string | null; variant_id?: number | null }[]
  stock_trackings?: { id?: number; delta?: number; quantity?: number; qty?: number; change?: number; color?: string | null; colour?: string | null; size?: string | null; color_code?: string | null; reason?: string | null; created_at?: string | null; variant_id?: number | null }[]
}

const DELIVERY: Record<string, string> = {
  self: 'Self delivery',
  thirdparty: 'Third party',
  school_pickup: 'School pickup',
}

export function ProductDetails({ id }: { id: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockData, setStockData] = useState<Product | null>(null)
  const [trackingPage, setTrackingPage] = useState(1)
  const STOCK_PAGE_SIZE = 8

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/products/${id}`)
      setProduct(data as Product)
    } catch (e) {
      toast('err', errMsg(e, 'Could not load product details'))
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const openStockModal = async () => {
    if (!product) return
    setStockModalOpen(true)
    setTrackingPage(1)
    setStockLoading(true)
    try {
      const { data } = await api.get(`/admin/products/${product.product_code}`)
      setStockData(data as Product)
    } catch (e) {
      toast('err', errMsg(e, 'Could not load stock details'))
      setStockData(product)
    } finally {
      setStockLoading(false)
    }
  }
  const toggleActive = async () => {
    if (!product) return
    setBusy(true)
    try {
      await api.put(`/admin/products/${product.product_code}`, {
        is_active: !product.is_active,
      })
      toast('ok', `Product ${product.is_active ? 'deactivated' : 'activated'}`)
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Status update failed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!product) return
    if (!confirm('Delete this product? This cannot be undone.')) return
    setBusy(true)
    try {
      await api.delete(`/admin/products/${product.product_code}`)
      toast('ok', 'Product deleted')
      navigate('/products')
    } catch (e) {
      toast('err', errMsg(e, 'Delete failed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product details" />
        <Panel>
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </Panel>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product details" />
        <EmptyState title="Product not found" hint="The requested product could not be loaded." />
      </div>
    )
  }

  const isActive = !!product.is_active
  const isBoost = !!product.is_boost
  const primary = (product.images ?? []).find((i) => i.is_primary) ?? (product.images ?? [])[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        subtitle={`Code: ${product.product_code}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/products')} aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Link to={`/products/${product.product_code}/edit`}>
              <Button icon={<Pencil className="h-4 w-4" />}>Edit product</Button>
            </Link>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              disabled={busy}
              onClick={() => void toggleActive()}
              aria-label={isActive ? 'Deactivate product' : 'Activate product'}
            >
              {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void remove()}
              className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
              aria-label="Delete product"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <Panel bodyClass="p-0">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="flex flex-col gap-2">
                {primary ? (
                  <img
                    src={assetUrl(primary.url ?? null) ?? primary.url ?? ''}
                    alt={product.name}
                    className="w-full h-56 object-cover rounded-lg bg-[var(--surface-muted)]"
                  />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded-lg bg-[var(--surface-muted)] text-xs text-[var(--text-subtle)]">
                    No image
                  </div>
                )}
                {(product.images ?? []).slice(1).map((img, i) => (
                  <img
                    key={i}
                    src={assetUrl(img.url ?? null) ?? img.url ?? ''}
                    alt={product.name}
                    className="h-20 w-20 object-cover rounded border border-slate-200"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Category</h3>
                <p className="text-sm text-[var(--text)]">
                  {product.subCategory?.name ?? product.category?.name ?? 'Uncategorised'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  isActive
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {isBoost && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Boost</h3>
                  <span className="flex items-center gap-1 text-xs text-orange-700">
                    <Zap className="h-3 w-3" /> Boosted{product.boost_until ? ` until ${product.boost_until}` : ''}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Price</h3>
                <p className="text-sm font-semibold text-[var(--text)]">?{Number(product.price ?? 0).toFixed(2)}</p>
                <p className="text-xs text-[var(--text-muted)]">MRP ?{Number(product.mrp ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Stock</h3>
                <p className="text-sm font-semibold text-[var(--text)]">{product.stock ?? 0}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Delivery mode</h3>
                <p className="text-sm text-[var(--text)]">
                  {product.delivery_mode ? DELIVERY[product.delivery_mode] ?? product.delivery_mode : '-'}
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Charges</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block text-[var(--text-muted)]">Delivery charge</span>
                  <span className="text-[var(--text)]">
                    {product.delivery_charge == null ? '0' : `₹${Number(product.delivery_charge).toFixed(2)}`}
                  </span>
                </div>
                <div>
                  <span className="block text-[var(--text-muted)]">Portal charge</span>
                  <span className="text-[var(--text)]">
                    {product.portal_charge == null ? '0' : `₹${Number(product.portal_charge).toFixed(2)}`}
                  </span>
                </div>
                <div>
                  <span className="block text-[var(--text-muted)]">Server charge</span>
                  <span className="text-[var(--text)]">
                    {product.server_charge == null ? '0' : `₹${Number(product.server_charge).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

          </div>
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Stock &amp; variants</h3>
            <table className="w-full text-sm border border-slate-200 rounded">
              <thead>
                <tr className="bg-[var(--surface-muted)]">
                  <th className="px-3 py-2 text-left text-[var(--text-muted)] text-xs">Size</th>
                  <th className="px-3 py-2 text-left text-[var(--text-muted)] text-xs">Colour</th>
                  <th className="px-3 py-2 text-right text-[var(--text-muted)] text-xs">Qty</th>
                  {product.variants && product.variants.length > 0 ? (
                    <th className="px-3 py-2 text-right text-[var(--text-muted)] text-xs">SKU</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {(product.product_stocks ?? product.variants ?? []).map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{s.size ?? '-'}</td>
                    <td className="px-3 py-2">{s.color ?? '-'}</td>
                    <td className="px-3 py-2 text-right">
                      {Number((s as { quantity?: number | null }).quantity ?? (s as { stock?: number | null }).stock ?? 0)}
                    </td>
                    {product.variants && product.variants.length > 0 && 'sku' in s ? (
                      <td className="px-3 py-2 text-right">{s.sku ?? '-'}</td>
                    ) : null}
                  </tr>
                ))}
                {(product.product_stocks ?? product.variants ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-[var(--text-muted)]">
                      No stock records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button variant="secondary" onClick={() => void openStockModal()}>
              <Package className="h-4 w-4" /> View stock Log
            </Button>
          </div>

          {(product.values ?? []).length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Attributes</h3>
              <table className="w-full text-sm border border-slate-200 rounded">
                <tbody>
                  {(product.values ?? []).map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-[var(--text-muted)]">{v.field_name ?? v.field?.field_name ?? v.field?.field_label ?? v.field?.name ?? 'Field'}</td>
                      <td className="px-3 py-2 text-right">{v.value_text ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {stockModalOpen && (
        <Modal title={`Stock Log — ${product.name}`} sub="Stock movement history." wide onClose={() => setStockModalOpen(false)}>
          {stockLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-6">
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
                    {(stockData?.stock_trackings ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">No tracking rows</td></tr>
                    ) : (
                      (stockData?.stock_trackings ?? [])
                        .slice((trackingPage - 1) * STOCK_PAGE_SIZE, trackingPage * STOCK_PAGE_SIZE)
                        .map((t, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2">{t.colour ?? t.color ?? '—'}</td>
                            <td className="px-3 py-2">{t.size ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{Number(t.change ?? t.quantity ?? t.qty ?? 0)}</td>
                            <td className="px-3 py-2">{t.reason ?? '—'}</td>
                            <td className="px-3 py-2">{t.created_at ?? '—'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              {(stockData?.stock_trackings ?? []).length > STOCK_PAGE_SIZE && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <button type="button" disabled={trackingPage <= 1} onClick={() => setTrackingPage((p) => p - 1)} className="btn btn-secondary !py-1 !text-xs">Prev</button>
                  <span>Page {trackingPage} of {Math.ceil((stockData?.stock_trackings?.length ?? 0) / STOCK_PAGE_SIZE)}</span>
                  <button type="button" disabled={trackingPage >= Math.ceil((stockData?.stock_trackings?.length ?? 0) / STOCK_PAGE_SIZE)} onClick={() => setTrackingPage((p) => p + 1)} className="btn btn-secondary !py-1 !text-xs">Next</button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
