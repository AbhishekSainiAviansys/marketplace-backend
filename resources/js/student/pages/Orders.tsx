/** Orders list + tracking timeline (local demo in v1). */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, Package, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@ui'
import { rupee, useShop } from '../store/shop'

const STAGES = ['Placed', 'Packed', 'Shipped / Ready for pickup', 'Delivered']

export function Orders() {
  const { orders, student } = useShop()
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
            <span className="badge badge-neutral">{o.payMode}</span>
            <span className="badge badge-neutral">{o.delivery}</span>
            <span className="tnum ml-auto font-bold">{rupee(o.total)}</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {o.items.map((i) => <img key={i.id} src={i.image} alt={i.name} title={`${i.name} × ${i.qty}`} className="h-14 w-16 rounded-lg border border-[var(--border)] object-cover" />)}
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{o.date} · {o.address}</p>
          <Link to={`/track?id=${o.id}`} className="mt-2 inline-block text-xs font-semibold accent-text hover:underline">Track this order →</Link>
        </article>
      ))}
    </div>
  )
}

export function Track() {
  const { orders } = useShop()
  const params = new URLSearchParams(location.search)
  const [id, setId] = useState(params.get('id') ?? orders[0]?.id ?? '')
  const o = orders.find((x) => x.id === id)
  const stage = o ? (o.delivery.includes('Pickup') ? 2 : 1) : 0

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Track order</h1>
      <div className="card flex gap-2 p-4">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Order ID (e.g. ORD123456)" className="field outline-none" />
        <button className="btn btn-secondary shrink-0" onClick={() => setId(id.trim())}>Track</button>
      </div>
      {!o ? (
        <div className="card"><EmptyState title="No order found"
          hint={orders.length ? 'Check the order ID from My orders.' : 'Place your first order, then track it here.'}
          action={<Link to="/orders" className="btn btn-secondary">Go to orders</Link>} /></div>
      ) : (
        <div className="card p-6">
          <p className="text-sm font-bold">{o.id} · <span className="tnum">{rupee(o.total)}</span></p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{o.delivery} · {o.payMode}</p>
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
                  <span className="block text-xs text-[var(--text-subtle)]">{i === 0 ? o.date : i <= stage ? 'Done' : 'Pending'}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
            <Bell className="h-4 w-4 shrink-0" /> Notifications (SMS/push) arrive here in Phase-2 via the orders API.
          </p>
        </div>
      )}
    </div>
  )
}



