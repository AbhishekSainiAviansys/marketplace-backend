/** Orders list + tracking timeline. */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bell, CheckCircle2, Download, Package, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@ui'
import { api } from '@lib/api'
import { rupee, useShop } from '../store/shop'

const STAGES = ['Placed', 'Packed', 'Shipped / Ready for pickup', 'Delivered']

function stageIndex(status: string) {
  if (status === 'Delivered') return 3
  if (status === 'Shipped' || status === 'Out for delivery') return 2
  if (status === 'Packed') return 1
  return 0
}

export function Orders() {
  const { orders, student } = useShop()
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
      // ignore download errors
    }
  }
  if (!student) {
    return <div className="card p-10 text-center">
      <h2 className="text-lg font-bold">Login required</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to see your orders.</p>
      <Link to="/login?next=/orders" className="btn btn-primary mt-4">Login / Register</Link>
    </div>
  }
  if (orders.length === 0) {
    return <div className="card"><EmptyState title="No orders yet"
      hint="Your placed orders appear here with tracking."
      action={<Link to="/" className="btn btn-primary"><ShoppingCart className="h-4 w-4" /> Start shopping</Link>} /></div>
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My orders ({orders.length})</h1>
      {orders.map((o) => (
        <article key={o.id} className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold"><Package className="h-4 w-4" /> {o.id}</span>
            <span className="badge badge-ok">{o.status}</span>
            {o.paymentStatus && <span className="badge badge-neutral">{o.paymentStatus}</span>}
            <span className="badge badge-neutral">{o.payMode}</span>
            <span className="badge badge-neutral">{o.delivery}</span>
            <span className="tnum ml-auto font-bold">{rupee(o.total)}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{o.date} – {o.address}</p>
          {(o.trackingNumber || o.trackingUrl) && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {o.trackingNumber ? `Tracking: ${o.trackingNumber}` : ''}
              {o.trackingUrl ? <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold accent-text hover:underline">Open tracking link</a> : null}
            </p>
          )}
          {o.items?.some((it: any) => it.trackingNumber || it.trackingUrl || it.courier || it.shippedAt || it.deliveredAt || it.tracking_number || it.tracking_url || it.shipped_at || it.delivered_at) && (
            <div className="mt-2 space-y-1 rounded-lg bg-[var(--surface-2)] p-2 text-xs text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text)]">Item tracking</p>
              {o.items.filter((it: any) => it.trackingNumber || it.trackingUrl || it.courier || it.shippedAt || it.deliveredAt || it.tracking_number || it.tracking_url || it.shipped_at || it.delivered_at).map((it: any, idx) => {
                const name = String(it.name ?? it.product_name ?? 'Item')
                const courier = it.courier ? String(it.courier) : null
                const trackingNumber = it.trackingNumber ? String(it.trackingNumber) : (it.tracking_number ? String(it.tracking_number) : null)
                const trackingUrl = it.trackingUrl ? String(it.trackingUrl) : (it.tracking_url ? String(it.tracking_url) : null)
                const shippedAt = it.shippedAt ? String(it.shippedAt) : (it.shipped_at ? String(it.shipped_at) : null)
                const deliveredAt = it.deliveredAt ? String(it.deliveredAt) : (it.delivered_at ? String(it.delivered_at) : null)
                return (
                  <div key={`${it.id ?? idx}-${idx}`} className="rounded-md bg-[var(--surface-3)] px-2 py-1.5">
                    <p className="font-medium text-[var(--text)]">{name}</p>
                    {courier && <p>Courier: <b className="text-[var(--text)]">{courier}</b></p>}
                    {trackingNumber && <p>Tracking: <b className="text-[var(--text)]">{trackingNumber}</b></p>}
                    {trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="font-semibold accent-text hover:underline">Open tracking link</a>}
                    {shippedAt && <p>Shipped: {new Date(shippedAt).toLocaleString()}</p>}
                    {deliveredAt && <p>Delivered: {new Date(deliveredAt).toLocaleString()}</p>}
                  </div>
                )
              })}
            </div>
          )}
          <Link to={`/orders/${encodeURIComponent(String(o.id))}`} className="mt-2 inline-block text-xs font-semibold accent-text hover:underline">View order details →</Link>
          <Link to={`/track?id=${o.id}`} className="mt-2 ml-3 inline-block text-xs font-semibold accent-text hover:underline">Track this order ?</Link>
          <button onClick={() => downloadInvoice(String(o.id))} className="mt-2 ml-3 inline-flex items-center gap-1 text-xs font-semibold accent-text hover:underline"><Download className="h-3 w-3" /> Download invoice</button>
        </article>
      ))}
    </div>
  )
}

export function Track() {
  const { orders } = useShop()
  const [searchParams] = useSearchParams()
  const [id, setId] = useState(searchParams.get('id') ?? orders[0]?.id ?? '')
  const [remote, setRemote] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || !id) { setRemote(null); return }
    setLoading(true)
    api.get(`/student/orders/${encodeURIComponent(id)}`).then((r) => setRemote(r.data)).catch(() => setRemote(null)).finally(() => setLoading(false))
  }, [id])

  const o = remote ?? orders.find((x) => x.id === id)
  const status = String(o?.status ?? '')
  const cancelled = status === 'Cancelled'
  const refunded = status === 'Refunded'
  const stage = o ? stageIndex(status) : 0

  const fmt = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : '')

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Track order</h1>
      <div className="card flex gap-2 p-4">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Order ID (e.g. ORD123456)" className="field outline-none" />
        <button className="btn btn-secondary shrink-0" onClick={() => setId(id.trim())}>Track</button>
      </div>
      {loading && <div className="card p-4 text-sm text-[var(--text-muted)]">Loading order...</div>}
      {!o ? (
        <div className="card"><EmptyState title="No order found"
          hint={orders.length ? 'Check the order ID from My orders.' : 'Place your first order, then track it here.'}
          action={<Link to="/orders" className="btn btn-secondary">Go to orders</Link>} /></div>
      ) : (
        <div className="card p-6 space-y-4">
          <div>
            <p className="text-sm font-bold">{o.id ?? o.order_code} - <span className="tnum">{rupee(Number(o.total ?? 0))}</span></p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{o.delivery} - {o.payMode ?? o.pay_mode}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge badge-ok">{status}</span>
              {(o.paymentStatus ?? o.payment_status) && <span className="badge badge-neutral">{o.paymentStatus ?? o.payment_status}</span>}
            </div>
          </div>

          {((o.trackingNumber ?? o.tracking_number) || o.courier || (o.trackingUrl ?? o.tracking_url)) && (
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)] space-y-1">
              {(o.trackingNumber ?? o.tracking_number) && <p>Tracking number: <b className="text-[var(--text)]">{o.trackingNumber ?? o.tracking_number}</b></p>}
              {o.courier && <p>Courier: <b className="text-[var(--text)]">{o.courier}</b></p>}
              {(o.trackingUrl ?? o.tracking_url) && <p><a href={o.trackingUrl ?? o.tracking_url} target="_blank" rel="noreferrer" className="font-semibold accent-text hover:underline">Open tracking link</a></p>}
            </div>
          )}

          {Array.isArray(o.items) && o.items.some((it: any) => it.trackingNumber || it.trackingUrl || it.courier || it.shippedAt || it.deliveredAt || it.tracking_number || it.tracking_url || it.shipped_at || it.delivered_at) && (
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)] space-y-1">
              <p className="font-semibold text-[var(--text)]">Item tracking</p>
              {o.items.filter((it: any) => it.trackingNumber || it.trackingUrl || it.courier || it.shippedAt || it.deliveredAt || it.tracking_number || it.tracking_url || it.shipped_at || it.delivered_at).map((it: any, idx: number) => {
                const name = String(it.name ?? it.product_name ?? 'Item')
                const courier = it.courier ? String(it.courier) : null
                const trackingNumber = it.trackingNumber ? String(it.trackingNumber) : (it.tracking_number ? String(it.tracking_number) : null)
                const trackingUrl = it.trackingUrl ? String(it.trackingUrl) : (it.tracking_url ? String(it.tracking_url) : null)
                const shippedAt = it.shippedAt ? String(it.shippedAt) : (it.shipped_at ? String(it.shipped_at) : null)
                const deliveredAt = it.deliveredAt ? String(it.deliveredAt) : (it.delivered_at ? String(it.delivered_at) : null)
                return (
                  <div key={`${it.id ?? idx}-${idx}`} className="rounded-md bg-[var(--surface-3)] px-2 py-1.5">
                    <p className="font-medium text-[var(--text)]">{name}</p>
                    {courier && <p>Courier: <b className="text-[var(--text)]">{courier}</b></p>}
                    {trackingNumber && <p>Tracking: <b className="text-[var(--text)]">{trackingNumber}</b></p>}
                    {trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="font-semibold accent-text hover:underline">Open tracking link</a>}
                    {shippedAt && <p>Shipped: {new Date(shippedAt).toLocaleString()}</p>}
                    {deliveredAt && <p>Delivered: {new Date(deliveredAt).toLocaleString()}</p>}
                  </div>
                )
              })}
            </div>
          )}

          {!cancelled && !refunded && (
            <ol className="mt-5 space-y-0">
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
                    <span className="block text-xs text-[var(--text-subtle)]">{i === 0 ? (o.date ?? fmt(o.placedAt ?? o.placed_at)) : i <= stage ? 'Done' : 'Pending'}</span>
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

          <div className="space-y-1 text-xs text-[var(--text-muted)]">
            {(o.placedAt ?? o.placed_at) && <p>Placed: {fmt(o.placedAt ?? o.placed_at)}</p>}
            {(o.shippedAt ?? o.shipped_at) && <p>Shipped: {fmt(o.shippedAt ?? o.shipped_at)}</p>}
            {(o.deliveredAt ?? o.delivered_at) && <p>Delivered: {fmt(o.deliveredAt ?? o.delivered_at)}</p>}
            {(o.cancelledAt ?? o.cancelled_at) && <p>Cancelled: {fmt(o.cancelledAt ?? o.cancelled_at)}</p>}
            {(o.refundedAt ?? o.refunded_at) && <p>Refunded: {fmt(o.refundedAt ?? o.refunded_at)}</p>}
            {(o.adminNote ?? o.admin_note) && <p>Note: {o.adminNote ?? o.admin_note}</p>}
          </div>

          <p className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
            <Bell className="h-4 w-4 shrink-0" /> Notifications (SMS/push) arrive here in Phase-2 via the orders API.
          </p>
        </div>
      )}
    </div>
  )
}
