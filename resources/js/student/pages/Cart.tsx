/** Cart page + order summary with free-pickup progress. */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { errMsg } from '@lib/api'
import { cartGst, cartShipping, cartTotal, deliveryLabel, rupee, useShop } from '../store/shop'

export function Cart() {
  const { cart, cartDetailed, setQty, remove, subTotal, mrpTotal, toggleWish, wish, couponCode, couponDiscount, applyCoupon, clearCoupon, refreshProducts } = useShop()
  const nav = useNavigate()
  const [stockRefresh, setStockRefresh] = useState<'loading' | 'ready' | 'error'>('loading')
  const [couponInput, setCouponInput] = useState(couponCode ?? '')
  const [couponErr, setCouponErr] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)
  const save = mrpTotal - subTotal
  const FREE = 999
  const pct = Math.min(100, Math.round((subTotal / FREE) * 100))
  const shipping = cartShipping('home', cartDetailed)
  const gst = cartGst('home', cartDetailed)
  const couponAmount = couponCode ? couponDiscount : 0
  const payable = Math.max(0, cartTotal('home', cartDetailed) - couponAmount)
  const hasStockIssue = cartDetailed.some(({ p, qty, color, size }) => {
    const hasVariants = p.is_variant ?? (p.variants ?? []).length > 0
    const lineVariant = (color != null || size != null) ? (p.variants ?? []).find((x) => x.color === color && x.size === size) : undefined
    const lineStock = hasVariants ? Number(lineVariant?.stock ?? 0) : p.stock
    return lineStock <= 0 || qty > lineStock
  })
  const cartKey = [...new Set(cart.map((line) => line.id))].sort().join('|')
  const refreshRef = useRef(refreshProducts)
  refreshRef.current = refreshProducts

  useEffect(() => {
    if (!cartKey) {
      setStockRefresh('ready')
      return
    }
    let active = true
    setStockRefresh('loading')
    refreshRef.current(cartKey.split('|'))
      .then(() => { if (active) setStockRefresh('ready') })
      .catch(() => { if (active) setStockRefresh('error') })
    return () => { active = false }
  }, [cartKey])

  useEffect(() => { setCouponInput(couponCode ?? '') }, [couponCode])
  useEffect(() => {
    if (couponCode) {
      applyCoupon(couponCode, subTotal).catch(() => {})
    }
  }, [subTotal]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    const code = couponInput.trim()
    if (!code) return
    setCouponErr('')
    setCouponBusy(true)
    try {
      await applyCoupon(code, subTotal)
      setCouponInput(code.toUpperCase())
    } catch (e) {
      setCouponErr(errMsg(e, 'Could not apply coupon.'))
    } finally {
      setCouponBusy(false)
    }
  }

  if (cartDetailed.length === 0) {
    return <div className="card"><EmptyState title="Your cart is empty"
      hint="Add books, bundles and bottles from the shop."
      action={<Link to="/" className="btn btn-primary"><ShoppingCart className="h-4 w-4" /> Browse shop</Link>} /></div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card divide-y divide-[var(--border)]">
        {cartDetailed.map(({ p, qty, color, size }) => {
          const hasVariants = p.is_variant ?? (p.variants ?? []).length > 0
          const lineVariant = (color != null || size != null) ? (p.variants ?? []).find((x) => x.color === color && x.size === size) : undefined
          const lineStock = hasVariants ? Number(lineVariant?.stock ?? 0) : p.stock
          return (
            <div key={`${p.id}::${color ?? '-'}::${size ?? '-'}`} className="flex gap-3 p-4">
              <Link to={`/product/${p.id}`}><img src={p.image} alt={p.name} className="h-20 w-24 rounded-xl border border-[var(--border)] object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${p.id}`} className="truncate text-sm font-bold text-[var(--text)] hover:underline">{p.name}</Link>
                {(color || size) ? <p className="text-[10px] text-[var(--text-muted)]">{color ?? ''}{size ? ' / ' + size : ''}</p> : null}
                <p className="text-xs text-[var(--text-muted)]">{p.category} · Class {p.classTag}</p>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">
                  {deliveryLabel[p.delivery]}
                  {p.deliveryCharge != null ? ` · ${rupee(p.deliveryCharge)} delivery` : ''}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${lineStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {lineStock > 0 ? `In stock: ${lineStock}` : 'Out of stock'}
                  {qty > lineStock && lineStock > 0 ? ' · quantity exceeds stock' : ''}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center rounded-lg border border-[var(--border)]">
                    <button className="btn btn-ghost btn-icon !p-1.5" onClick={() => setQty(p.id, qty - 1, color, size)} aria-label="less"><Minus className="h-3.5 w-3.5" /></button>
                    <b className="tnum w-7 text-center text-sm text-[var(--text)]">{qty}</b>
                    <button className="btn btn-ghost btn-icon !p-1.5" onClick={() => setQty(p.id, qty + 1, color, size)} aria-label="more" disabled={qty >= Math.min(9, lineStock)}><Plus className="h-3.5 w-3.5" /></button>
                  </span>
                  <button onClick={() => toggleWish(p.id)} className="btn btn-ghost !px-2 !py-1.5 text-xs">
                    <Heart className={`h-3.5 w-3.5 ${wish.includes(p.id) ? 'fill-rose-500 text-rose-500' : ''}`} /> {wish.includes(p.id) ? 'Saved' : 'Wishlist'}
                  </button>
                  <button onClick={() => remove(p.id, color, size)} className="btn btn-ghost !px-2 !py-1.5 text-xs text-[var(--color-danger-600)]"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              </div>
              <div className="text-right">
                <p className="tnum text-sm font-bold text-[var(--text)]">{rupee(p.price * qty)}</p>
                {p.mrp > p.price && <p className="tnum text-xs text-[var(--text-subtle)] line-through">{rupee(p.mrp * qty)}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <aside className="card h-fit p-5">
        <h2 className="text-base font-bold text-[var(--text)]">Order summary</h2>
        {hasStockIssue && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            Some items are out of stock or exceed available stock. Update quantities before checkout.
          </p>
        )}
        {stockRefresh === 'loading' && <p className="mt-2 text-xs text-[var(--text-muted)]">Checking current stock…</p>}
        {stockRefresh === 'error' && <p className="mt-2 text-xs text-rose-700">Could not refresh stock. Reload the cart before checkout.</p>}
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="accent-bg h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="tnum font-semibold text-[var(--text)]">{rupee(subTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Delivery Charges</dt><dd className="tnum font-semibold text-[var(--text)]">{rupee(shipping)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">GST (18%)</dt><dd className="tnum font-semibold text-[var(--text)]">{rupee(gst)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">MRP total</dt><dd className="tnum text-[var(--text-subtle)] line-through">{rupee(mrpTotal)}</dd></div>
          <div className="flex justify-between text-emerald-600"><dt>You save</dt><dd className="tnum font-bold">{rupee(save)}</dd></div>
          {couponCode && (
            <div className="flex justify-between text-emerald-600"><dt>Coupon {couponCode}</dt><dd className="tnum font-bold">-{rupee(couponAmount)}</dd></div>
          )}
          <div className="flex justify-between border-t border-[var(--border)] pt-2"><dt className="font-bold text-[var(--text)]">Payable total</dt><dd className="tnum font-bold text-[var(--text)]">{rupee(payable)}</dd></div>
        </dl>
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              disabled={couponBusy}
            />
            <button type="button" className="btn btn-secondary !px-3" onClick={() => void apply()} disabled={couponBusy || !couponInput.trim()}>
              {couponBusy ? '...' : 'Apply'}
            </button>
          </div>
          {couponCode && (
            <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => { clearCoupon(); setCouponInput('') }}>
              Remove coupon
            </button>
          )}
          {couponErr && <p className="text-xs text-rose-600">{couponErr}</p>}
        </div>
        <button onClick={() => nav('/checkout')} className="btn btn-primary mt-4 w-full !py-3" disabled={hasStockIssue || stockRefresh !== 'ready'}>Proceed to checkout <ArrowRight className="h-4 w-4" /></button>
        <Link to="/" className="mt-2 block text-center text-xs font-medium text-[var(--text-muted)] hover:underline">Continue shopping</Link>
      </aside>
    </div>
  )
}




