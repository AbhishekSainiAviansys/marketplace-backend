/** Cart page + order summary with free-pickup progress. */
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { rupee, useShop } from '../store/shop'

export function Cart() {
  const { cartDetailed, setQty, remove, subTotal, mrpTotal, toggleWish, wish } = useShop()
  const nav = useNavigate()
  const save = mrpTotal - subTotal
  const FREE = 999
  const pct = Math.min(100, Math.round((subTotal / FREE) * 100))

  if (cartDetailed.length === 0) {
    return <div className="card"><EmptyState title="Your cart is empty"
      hint="Add books, bundles and bottles from the shop."
      action={<Link to="/" className="btn btn-primary"><ShoppingCart className="h-4 w-4" /> Browse shop</Link>} /></div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card divide-y divide-[var(--border)]">
        {cartDetailed.map(({ p, qty }) => (
          <div key={p.id} className="flex gap-3 p-4">
            <Link to={`/product/${p.id}`}><img src={p.image} alt={p.name} className="h-20 w-24 rounded-xl border border-[var(--border)] object-cover" /></Link>
            <div className="min-w-0 flex-1">
              <Link to={`/product/${p.id}`} className="truncate text-sm font-bold text-[var(--text)] hover:underline">{p.name}</Link>
              <p className="text-xs text-[var(--text-muted)]">{p.category} · Class {p.classTag}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center rounded-lg border border-[var(--border)]">
                  <button className="btn btn-ghost btn-icon !p-1.5" onClick={() => setQty(p.id, qty - 1)} aria-label="less"><Minus className="h-3.5 w-3.5" /></button>
                  <b className="tnum w-7 text-center text-sm text-[var(--text)]">{qty}</b>
                  <button className="btn btn-ghost btn-icon !p-1.5" onClick={() => setQty(p.id, qty + 1)} aria-label="more"><Plus className="h-3.5 w-3.5" /></button>
                </span>
                <button onClick={() => toggleWish(p.id)} className="btn btn-ghost !px-2 !py-1.5 text-xs">
                  <Heart className={`h-3.5 w-3.5 ${wish.includes(p.id) ? 'fill-rose-500 text-rose-500' : ''}`} /> {wish.includes(p.id) ? 'Saved' : 'Wishlist'}
                </button>
                <button onClick={() => remove(p.id)} className="btn btn-ghost !px-2 !py-1.5 text-xs text-[var(--color-danger-600)]"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
              </div>
            </div>
            <div className="text-right">
              <p className="tnum text-sm font-bold text-[var(--text)]">{rupee(p.price * qty)}</p>
              {p.mrp > p.price && <p className="tnum text-xs text-[var(--text-subtle)] line-through">{rupee(p.mrp * qty)}</p>}
            </div>
          </div>
        ))}
      </div>
      <aside className="card h-fit p-5">
        <h2 className="text-base font-bold text-[var(--text)]">Order summary</h2>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="accent-bg h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {subTotal >= FREE ? 'You unlocked FREE home delivery!' : `Add ${rupee(FREE - subTotal)} more for free home delivery (pickup is always free)`}
          </p>
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="tnum font-semibold text-[var(--text)]">{rupee(subTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">MRP total</dt><dd className="tnum text-[var(--text-subtle)] line-through">{rupee(mrpTotal)}</dd></div>
          <div className="flex justify-between text-emerald-600"><dt>You save</dt><dd className="tnum font-bold">{rupee(save)}</dd></div>
        </dl>
        <button onClick={() => nav('/checkout')} className="btn btn-primary mt-4 w-full !py-3">Proceed to checkout <ArrowRight className="h-4 w-4" /></button>
        <Link to="/" className="mt-2 block text-center text-xs font-medium text-[var(--text-muted)] hover:underline">Continue shopping</Link>
      </aside>
    </div>
  )
}



