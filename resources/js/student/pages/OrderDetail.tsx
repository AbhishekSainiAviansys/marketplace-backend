/** Dedicated order details page: shows main order details and each ordered item separately. */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, Package, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@ui'
import { api, errMsg, rowsOf } from '@lib/api'
import { assetUrl } from '@lib/brand'
import { rupee, useShop, toProduct, type Order } from '../store/shop'
function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.order_code ?? row.id ?? ''),
    orderCode: row.order_code ? String(row.order_code) : undefined,
    items: Array.isArray(row.items)
      ? (row.items as Record<string, unknown>[]).map((it, i) => ({
          id: String(it.product_code ?? it.id ?? it.product_id ?? i),
          name: String(it.name ?? it.product_name ?? 'Item'),
          price: Number(it.price ?? 0),
          qty: Number(it.qty ?? it.quantity ?? 1),
          image: String(it.image ?? ''),
          courier: it.courier ? String(it.courier) : null,
          trackingNumber: it.tracking_number ? String(it.tracking_number) : (it.trackingNumber ? String(it.trackingNumber) : null),
          trackingUrl: it.tracking_url ? String(it.tracking_url) : (it.trackingUrl ? String(it.trackingUrl) : null),
          shippedAt: it.shipped_at ? String(it.shipped_at) : (it.shippedAt ? String(it.shippedAt) : null),
          deliveredAt: it.delivered_at ? String(it.delivered_at) : (it.deliveredAt ? String(it.deliveredAt) : null),
        }))
      : [],
    total: Number(row.total ?? 0),
    payMode: String(row.pay_mode ?? row.payMode ?? 'Online'),
    delivery: String(row.delivery ?? ''),
    address: String(row.address ?? ''),
    date: row.placed_at
      ? new Date(String(row.placed_at)).toLocaleString()
      : (row.created_at ? new Date(String(row.created_at)).toLocaleString() : new Date().toLocaleString()),
    status: String(row.status ?? 'Placed'),
    paymentStatus: row.payment_status ? String(row.payment_status) : (row.paymentStatus ? String(row.paymentStatus) : null),
    placedAt: row.placed_at ? String(row.placed_at) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    courier: row.courier ? String(row.courier) : null,
    trackingNumber: row.tracking_number ? String(row.tracking_number) : null,
    trackingUrl: row.tracking_url ? String(row.tracking_url) : null,
    shippedAt: row.shipped_at ? String(row.shipped_at) : null,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    refundedAt: row.refunded_at ? String(row.refunded_at) : null,
    adminNote: row.admin_note ? String(row.admin_note) : null,
  }
}

const STAGES = ['Placed', 'Packed', 'Shipped / Ready for pickup', 'Delivered']

function stageIndex(status: string) {
  if (status === 'Delivered') return 3
  if (status === 'Shipped' || status === 'Out for delivery') return 2
  if (status === 'Packed') return 1
  return 0
}

export function OrderDetail() {
  const { id } = useParams()
  const { orders, student, add, products, mergeRows } = useShop()
  const [order, setOrder] = useState<Order | null>(() => (id ? orders.find((o) => o.id === id) ?? null : null))
  const [loading, setLoading] = useState(() => (id ? !orders.find((o) => o.id === id) : false))
  const [err, setErr] = useState('')
  const [buying, setBuying] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const found = orders.find((o) => o.id === id)
    if (found) {
      setOrder(found)
      setLoading(false)
      return
    }
    if (!student) return
    setLoading(true)
    setErr('')
    api
      .get(`/student/orders/${encodeURIComponent(id)}`)
      .then((r) => setOrder(mapOrder((r.data ?? {}) as Record<string, unknown>)))
      .catch((e) => setErr(errMsg(e, 'Could not load order.')))
      .finally(() => setLoading(false))
  }, [id, orders, student])

  const downloadInvoice = async (orderId: string) => {
    try {
      const res = await api.get(`/student/orders/${encodeURIComponent(orderId)}/invoice`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  const buyAgain = async (item: Order['items'][number]) => {
    setBuying(item.id)
    try {
      if (!products.some((p) => p.id === item.id)) {
        try {
          const r = await api.get('/products', { params: { ids: item.id } })
          const rows = rowsOf<Record<string, unknown>>(r.data).map(toProduct)
          if (rows.length > 0) mergeRows(rows)
        } catch {
          // ignore
        }
      }
      add(item.id, item.qty)
      setAdded(item.id)
      window.setTimeout(() => setAdded(null), 2000)
    } finally {
    }
  }
  if (!student) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-lg font-bold">Login required</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to see order details.</p>
        <Link to="/login?next=/orders" className="btn btn-primary mt-4">Login / Register</Link>
      </div>
    )
  }

  if (loading) {
    return <div className="card p-4 text-sm text-[var(--text-muted)]">Loading order...</div>
  }

  if (!order) {
    return (
      <div className="card">
        <EmptyState title="Order not found" hint={err || 'Check the order ID from My orders.'} action={<Link to="/orders" className="btn btn-secondary">Go to orders</Link>} />
      </div>
    )
  }

  const status = order.status
  const cancelled = status === 'Cancelled'
  const refunded = status === 'Refunded'
  const stage = stageIndex(status)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/orders" className="btn btn-secondary !py-1 !px-3 text-xs flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>
      </div>

      <article className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold"><Package className="h-4 w-4" /> {order.id}</span>
          <span className="badge badge-ok">{order.status}</span>
          {order.paymentStatus && <span className="badge badge-neutral">{order.paymentStatus}</span>}
          <span className="badge badge-neutral">{order.payMode}</span>
          <span className="badge badge-neutral">{order.delivery}</span>
          <span className="tnum ml-auto font-bold">{rupee(order.total)}</span>
        </div>

        <p className="text-xs text-[var(--text-muted)]">{order.date} – {order.address}</p>

        {(order.trackingNumber || order.trackingUrl || order.courier) && (
          <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)] space-y-1">
            {order.trackingNumber && <p>Tracking number: <b className="text-[var(--text)]">{order.trackingNumber}</b></p>}
            {order.courier && <p>Courier: <b className="text-[var(--text)]">{order.courier}</b></p>}
            {order.trackingUrl && <p><a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold accent-text hover:underline">Open tracking link</a></p>}
            <Link to={`/track?id=${order.id}`} className="inline-block font-semibold accent-text hover:underline">Track this order →</Link>
          </div>
        )}

        {!cancelled && !refunded && (
          <ol className="mt-2 space-y-0">
            {STAGES.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${i <= stage ? 'accent-bg text-white' : 'bg-[var(--surface-3)] text-[var(--text-subtle)]'}`}>
                    {i <= stage ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </span>
                  {i < STAGES.length - 1 && <span className={`w-0.5 flex-1 ${i < stage ? 'accent-bg' : 'bg-[var(--border)]'}`} style={{ minHeight: 28 }} />}
                </span>
                <span className="pb-6">
                  <span className={`block text-sm font-bold ${i <= stage ? 'text-[var(--text)]' : 'text-[var(--text-subtle)]'}`}>{s}</span>
                  <span className="block text-xs text-[var(--text-subtle)]">{i === 0 ? order.date : i <= stage ? 'Done' : 'Pending'}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {(cancelled || refunded) && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {cancelled ? 'This order was cancelled.' : 'This order was refunded.'}
          </p>
        )}

        <button onClick={() => downloadInvoice(String(order.id))} className="inline-flex items-center gap-1 text-xs font-semibold accent-text hover:underline">
          <Download className="h-3 w-3" /> Download invoice
        </button>
      </article>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Items ordered ({order.items.length})</h2>
        {order.items.length === 0 ? (
          <div className="card p-4 text-sm text-[var(--text-muted)]">No item details available for this order.</div>
        ) : (
          order.items.map((item, idx) => (
            <article key={`${item.id}-${idx}`} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                {item.image ? (
                  <img src={assetUrl(item.image) ?? item.image} alt={item.name} className="h-16 w-16 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center text-[var(--text-subtle)]">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text)] truncate">{item.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">Qty: {item.qty} · Unit price: {rupee(item.price)}</p>
                <p className="mt-0.5 text-xs font-medium text-[var(--text)]">Line total: {rupee(item.price * item.qty)}</p>
                {(item.courier || item.trackingNumber || item.trackingUrl || item.shippedAt || item.deliveredAt) && (
                  <div className="mt-1 rounded-lg bg-[var(--surface-2)] px-2 py-1.5 text-xs text-[var(--text-muted)] space-y-0.5">
                    {item.courier && <p>Courier: <b className="text-[var(--text)]">{item.courier}</b></p>}
                    {item.trackingNumber && <p>Tracking: <b className="text-[var(--text)]">{item.trackingNumber}</b></p>}
                    {item.trackingUrl && <p><a href={item.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold accent-text hover:underline">Open tracking link</a></p>}
                    {item.shippedAt && <p>Shipped: {new Date(item.shippedAt).toLocaleString()}</p>}
                    {item.deliveredAt && <p>Delivered: {new Date(item.deliveredAt).toLocaleString()}</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => buyAgain(item)}
                  disabled={buying === item.id}
                  className="btn btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> {buying === item.id ? 'Adding…' : 'Buy again'}
                </button>
                {added === item.id && <span className="text-xs font-semibold text-emerald-600">Added to cart</span>}
                <Link to="/cart" className="text-xs accent-text hover:underline">Go to cart</Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
