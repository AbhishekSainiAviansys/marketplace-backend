/** 4-step checkout: identity → address → payment → review → success. */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, CheckCircle2, GraduationCap, MapPin, School, ShieldCheck, Truck } from 'lucide-react'
import { Alert, EmptyState, Field } from '@ui'
import { cartGst, cartShipping, deliveryLabel, rupee, useShop } from '../store/shop'
import { errMsg } from '@lib/api'

export function Checkout() {
  const { cart, cartDetailed, subTotal, mrpTotal, student, placeOrder, refreshProducts, couponCode, couponDiscount } = useShop()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [identityOk, setIdentityOk] = useState(false)
  const [addr, setAddr] = useState({ name: student?.name ?? '', phone: student?.whatsapp ?? '', line: '', pin: '' })
  const [mode, setMode] = useState<'home' | 'pickup'>('pickup')
  const [pay, setPay] = useState<'online'>('online')
  const [doneId, setDoneId] = useState('')
  const [err, setErr] = useState('')
  const [paying, setPaying] = useState(false)
  const [stockRefresh, setStockRefresh] = useState<'loading' | 'ready' | 'error'>('loading')
  const hasStockIssue = cartDetailed.some(({ p, qty, color, size }) => {
    const hasVariants = p.is_variant ?? (p.variants ?? []).length > 0
    const variant = hasVariants ? (p.variants ?? []).find((row) => row.color === color && row.size === size) : undefined
    const available = hasVariants ? Number(variant?.stock ?? 0) : p.stock
    return available <= 0 || qty > available
  })
  const ship = cartShipping(mode === 'pickup' ? 'pickup' : 'home', cartDetailed)
  const gst = cartGst(mode === 'pickup' ? 'pickup' : 'home', cartDetailed)
  const total = Math.max(0, subTotal + ship + gst - couponDiscount)
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

  if (cartDetailed.length === 0 && !doneId) {
    return <div className="card"><EmptyState title="Nothing to check out" hint="Your cart is empty." action={<button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/shop'))} className="btn btn-primary">Back to shop</button>} /></div>
  }
  if (!student) {
    return <div className="card p-10 text-center">
      <h2 className="text-lg font-bold text-[var(--text)]">Login required</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in as a student to place your order.</p>
      <Link to="/login?next=/checkout" className="btn btn-primary mt-4">Login / Register</Link>
    </div>
  }
  const place = async () => {
    if (stockRefresh !== 'ready') {
      setErr(stockRefresh === 'error' ? 'Could not verify current stock. Return to your cart and try again.' : 'Checking current stock. Please wait.')
      return
    }
    if (hasStockIssue) {
      setErr('Some items are out of stock or exceed available stock. Update your cart before placing the order.')
      return
    }
    setErr('')
    setPaying(true)
    try {
      const freshProducts = await refreshProducts(cart.map((line) => line.id))
      const freshByCode = new Map(freshProducts.map((product) => [product.id, product]))
      const stockIssue = cart.find((line) => {
        const product = freshByCode.get(line.id)
        if (!product) return true
        const hasVariants = product.is_variant ?? (product.variants ?? []).length > 0
        const variant = hasVariants
          ? (product.variants ?? []).find((row) => row.color === line.color && row.size === line.size)
          : undefined
        const available = hasVariants
          ? Number(variant?.stock ?? 0)
          : product.stock_rows?.length
            ? product.stock_rows.reduce((sum, row) => sum + (row.quantity ?? row.stock ?? row.qty ?? 0), 0)
            : product.stock
        return available <= 0 || line.qty > available
      })
      if (stockIssue) {
        throw new Error('Current stock is lower than your cart quantity. Review your cart before placing the order.')
      }
      const checkoutItems = cart.map((line) => {
        const product = freshByCode.get(line.id)!
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: line.qty,
          image: product.image,
          color: line.color,
          size: line.size,
        }
      })
      const o = await placeOrder({
        items: checkoutItems,
        total, payMode: 'Online (Razorpay test)',
        couponCode,

        delivery: mode === 'pickup' ? 'Pickup from school' : 'Home delivery',
        address: mode === 'pickup' ? `Pickup · ${student.schoolCode}` : `${addr.line}, ${addr.pin} · ${addr.phone}`,
      })
      setDoneId(o.id)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setPaying(false)
    }
  }

  if (doneId) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Order placed!</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Order <b className="text-[var(--text)]">{doneId}</b> · online payment (test mode).</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/orders" className="btn btn-primary">View orders</Link>
          <Link to="/track" className="btn btn-secondary">Track order</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card p-5 sm:p-6">
        <ol className="flex gap-2 text-xs font-semibold">
          {['Identity', 'Address', 'Delivery & payment', 'Review'].map((s, i) => (
            <li key={s} className={`flex-1 rounded-lg px-2 py-2 text-center ${i === step ? 'accent-bg text-white' : i < step ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'}`}>{i + 1}. {s}</li>
          ))}
        </ol>

        {/* Step 0 — confirm the student's identity before anything else. */}
        {step === 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-2)] p-4">
              <span className="accent-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text)]">Confirm you are this student</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">This is the account the order is placed under and picked up for.</p>
              </div>
            </div>
            <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-xs font-semibold text-[var(--text-muted)]">Name</dt>
                <dd className="text-sm font-bold text-[var(--text)]">{student.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-xs font-semibold text-[var(--text-muted)]">Class</dt>
                <dd className="text-sm font-bold text-[var(--text)]">Class {student.className}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-xs font-semibold text-[var(--text-muted)]">School code</dt>
                <dd className="text-sm font-bold text-[var(--text)]"><code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-xs">{student.schoolCode}</code></dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-xs font-semibold text-[var(--text-muted)]">WhatsApp</dt>
                <dd className="tnum text-sm font-bold text-[var(--text)]">{student.whatsapp || '—'}</dd>
              </div>
            </dl>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
              <input type="checkbox" checked={identityOk} onChange={(e) => setIdentityOk(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
              <span><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-500" />I confirm this is me and I'm ordering for <b className="text-[var(--text)]">Class {student.className}</b>.</span>
            </label>
            <button onClick={() => setStep(1)} disabled={!identityOk} className="btn btn-primary w-full !py-3 disabled:opacity-50">Confirm &amp; continue</button>
            <p className="text-center text-xs text-[var(--text-muted)]">Not you? <Link to="/login?next=/checkout" className="accent-text font-semibold hover:underline">Switch account</Link></p>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setMode('pickup')} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold ${mode === 'pickup' ? 'accent-ring border-transparent' : 'border-[var(--border)]'}`}>
                <School className="h-5 w-5" /> Pickup from school <span className="badge badge-ok ml-auto">{ship === 0 ? 'FREE' : rupee(ship)}</span>
              </button>
              <button onClick={() => setMode('home')} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold ${mode === 'home' ? 'accent-ring border-transparent' : 'border-[var(--border)]'}`}>
                <Truck className="h-5 w-5" /> Home delivery <span className="badge badge-neutral ml-auto">{ship === 0 ? 'FREE' : rupee(ship)}</span>
              </button>
            </div>
            {mode === 'home' && (
              <>
                <Field label="Full name"><input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} className="field outline-none" placeholder="Aarav Patel" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone"><input value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} className="field outline-none" placeholder="9876543210" /></Field>
                  <Field label="Pincode"><input value={addr.pin} onChange={(e) => setAddr({ ...addr, pin: e.target.value })} className="field outline-none" placeholder="390001" /></Field>
                </div>
                <Field label="Address"><textarea value={addr.line} onChange={(e) => setAddr({ ...addr, line: e.target.value })} className="field outline-none" rows={2} placeholder="House, street, area…" /></Field>
              </>
            )}
            {mode === 'pickup' && <Alert kind="info"><span className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" /> Collect from your school office ({student.schoolCode}) — show the order ID.{ship > 0 ? ` Delivery charge: ${rupee(ship)}.` : ' No delivery fee.'}</span></Alert>}
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(2)} className="btn btn-primary flex-1 !py-3">Continue</button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-[var(--text)]">Payment method</p>
            {[
              // { k: 'cod', t: 'Cash on Delivery / Pay at pickup', d: 'Pay cash or UPI when you receive the order.', icon: <Banknote className="h-5 w-5" /> },
              { k: 'online', t: 'Pay online', d: 'UPI / card — test mode in v1, no real charge.', icon: <CreditCard className="h-5 w-5" /> },
            ].map((o) => (
              <button key={o.k} onClick={() => setPay('online')}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${pay === o.k ? 'accent-ring border-transparent' : 'border-[var(--border)]'}`}>
                {o.icon}
                <span><span className="block text-sm font-bold text-[var(--text)]">{o.t}</span><span className="block text-xs text-[var(--text-muted)]">{o.d}</span></span>
              </button>
            ))}
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
              Delivery mix: {[...new Set(cartDetailed.map((l) => deliveryLabel[l.p.delivery]))].join(' · ')}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-1">Review order</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-3">
            {cartDetailed.map(({ p, qty, color, size }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] p-3">
                <img src={p.image} alt="" className="h-12 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{p.name} × {qty}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {deliveryLabel[p.delivery]}
                    {p.deliveryCharge != null ? ` · ${rupee(p.deliveryCharge)} delivery` : ''}
                    {p.stock > 0 ? ` · In stock: ${p.stock}` : ' · Out of stock'}
                    {(color || size) ? ` · ${color ?? ''}${size ? ' / ' + size : ''}` : ''}
                  </p>
                </div>
                <b className="tnum text-sm text-[var(--text)]">{rupee(p.price * qty)}</b>
              </div>
            ))}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">MRP total</dt><dd className="tnum font-semibold">{rupee(mrpTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Discounted subtotal</dt><dd className="tnum font-semibold">{rupee(subTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Discount</dt><dd className="tnum font-semibold">{rupee(mrpTotal - subTotal)} ({mrpTotal > 0 ? Math.round(((mrpTotal - subTotal) / mrpTotal) * 100) : 0}%)</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Delivery</dt><dd className="tnum font-semibold">{ship === 0 ? 'FREE' : rupee(ship)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">GST (18%)</dt><dd className="tnum font-semibold">{rupee(gst)}</dd></div>
              {couponCode && <div className="flex justify-between text-emerald-600"><dt>Coupon {couponCode}</dt><dd className="tnum font-semibold">-{rupee(couponDiscount)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Payable total</dt><dd className="tnum">{rupee(total)}</dd></div>
            </dl>
            {hasStockIssue && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                Some items are out of stock or exceed available stock. Update your cart before placing the order.
              </p>
            )}
            {stockRefresh === 'loading' && <p className="text-xs text-[var(--text-muted)]">Checking current stock…</p>}
            {stockRefresh === 'error' && <p className="text-xs text-rose-700">Could not verify current stock. Return to your cart and try again.</p>}
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={place} className="btn btn-primary flex-1 !py-3" disabled={hasStockIssue || stockRefresh !== 'ready' || paying}>{paying ? 'Processing payment…' : `Place order · ${rupee(total)}`}</button>
            </div>
            <button onClick={() => nav('/cart')} className="w-full text-center text-xs text-[var(--text-muted)] hover:underline">Edit cart</button>
          </div>
        )}
      </div>
      <aside className="card h-fit p-5">
        <h2 className="text-base font-bold">Summary</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{cartDetailed.length} item(s) · {mode === 'pickup' ? 'School pickup' : 'Home delivery'} · Online</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="tnum font-semibold">{rupee(subTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Delivery</dt><dd className="tnum font-semibold">{ship === 0 ? 'FREE' : rupee(ship)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--text-muted)]">GST</dt><dd className="tnum font-semibold">{rupee(gst)}</dd></div>
          {couponCode && <div className="flex justify-between text-emerald-600"><dt>Coupon</dt><dd className="tnum font-semibold">-{rupee(couponDiscount)}</dd></div>}
        </dl>
        <p className="tnum mt-3 text-2xl font-bold">{rupee(total)}</p>
      </aside>
    </div>
  )
}




