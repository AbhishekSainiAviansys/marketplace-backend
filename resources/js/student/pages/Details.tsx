/** Product details with gallery, specs, qty + related items. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Heart, Minus, Plus, ShoppingCart, Truck, Zap } from 'lucide-react'
import { EmptyState } from '@ui'
import { deliveryLabel, discount, fetchProduct, rupee, useShop } from '../store/shop'
import { ProductCard, Stars } from '../components/ProductCard'
import { usePageSeo } from '../lib/seo'

export function Details() {
  const { id } = useParams()
  const { products, add, wish, toggleWish, mergeRows } = useShop()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeImg, setActiveImg] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const imgBoxRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const p = products.find((x) => x.id === id)

  // SEO tags (applied unconditionally — hooks must never be conditional).
  // Before the product loads (deep-link fetch) we render a placeholder title.
  usePageSeo({
    title: p ? `${p.name} · ${p.category} · School Store` : 'Product · School Store',
    description: p
      ? (p.blurb || `${p.name} — ${p.category}, Class ${p.classTag}. School pickup available.`)
      : 'Browse the school shop — books, bundles, bottles and more.',
    canonical: window.location.origin + `/product/${id}`,
    type: 'product',
    product: p
      ? {
          sku: p.sku ?? null,
          price: p.price ?? null,
          mrp: p.mrp ?? null,
          currency: 'INR',
          condition: 'NewCondition',
          availability: p.stock > 0 ? 'InStock' : 'OutOfStock',
          brand: p.brand ?? null,
          category: p.category ?? null,
        }
      : undefined,
  })
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows

  useEffect(() => {
    if (!id || p) return
    let alive = true
    fetchProduct(id)
      .then((row) => { if (alive) mergeRef.current([row]) })
      .catch(() => { /* genuinely missing — the not-found card shows below */ })
    return () => { alive = false }
  }, [id, p])
  if (!p) return <div className="card"><EmptyState title="Product not found" hint="It may have been removed." action={<button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/shop'))} className="btn btn-primary">Back to shop</button>} /></div>
  const off = discount(p)
  const loved = wish.includes(p.id)
  useEffect(() => {
    if (!p) return
    setActiveImg(p.image)
    setZoom(1)
    const el = imgBoxRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => {
        const next = z + (e.deltaY < 0 ? 0.25 : -0.25)
        return Math.min(4, Math.max(1, Number(next.toFixed(2))))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [p?.id])

  const hasVariants = (p.variants ?? []).length > 0
  const variant = useMemo(() => {
    if (!hasVariants) return undefined
    return (p.variants ?? []).find((v) =>
      (selectedColor == null || v.color === selectedColor) &&
      (selectedSize == null || v.size === selectedSize)
    )
  }, [p, hasVariants, selectedColor, selectedSize])
  const availableQty = hasVariants ? Number((variant?.stock ?? p.stock) ?? 0) : Number(p.stock ?? 0)
  const canAdd = selectedColor != null && selectedSize != null && availableQty > 0 && !added

  const related = products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4)

  const buy = () => { add(p.id, qty, selectedColor, selectedSize); nav('/checkout') }
  const cart = () => { add(p.id, qty, selectedColor, selectedSize); setAdded(true); setTimeout(() => setAdded(false), 1600) }

  return (
    <div className="space-y-6">
      <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/shop'))} className="text-sm font-medium text-[var(--text-muted)] hover:underline">← Back to shop</button>
      <div className="card grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
        <div>
          <div ref={imgBoxRef} className="overflow-hidden rounded-2xl border border-[var(--border)] cursor-zoom-in" title="Scroll over image to zoom">
            <img src={activeImg || p.image} alt={p.name} className="aspect-[4/3] w-full bg-transparent object-contain p-4 transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/' + p.id + '/800/600' }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(1)} className="hover:underline">Reset zoom</button>
          </div>
          <div className="mt-3 flex gap-2">
            {(p.images && p.images.length ? p.images : [p.image]).map((s, i) => (
              <button key={i} type="button" onClick={() => { setActiveImg(s); setZoom(1) }}
                className={`h-16 w-20 overflow-hidden rounded-xl border ${activeImg === s ? 'accent-ring border-transparent' : 'border-[var(--border)]'}`}>
                <img src={s} alt="" className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--text-subtle)] uppercase">{p.category} · Class {p.classTag} · {p.schoolCode}</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Stars v={p.rating} /><span className="text-xs text-[var(--text-subtle)]">{p.reviews} ratings</span>
            {(hasVariants ? (
              <span className={`badge ${availableQty > 0 ? 'badge-ok' : 'badge-danger'}`}>
                {selectedColor == null || selectedSize == null ? 'Select colour & size' : availableQty > 0 ? `${availableQty} in stock` : 'Out of stock'}
              </span>
            ) : (
              <span className={`badge ${p.stock > 0 ? 'badge-ok' : 'badge-danger'}`}>{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
            ))}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="tnum text-3xl font-bold text-[var(--text)]">{rupee(p.price)}</span>
            {p.mrp > p.price && <><span className="tnum text-sm text-[var(--text-subtle)] line-through">{rupee(p.mrp)}</span><span className="badge badge-ok">{off}% off</span></>}
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{p.blurb}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"><Truck className="h-4 w-4" /> {deliveryLabel[p.delivery]} · Free school pickup where available</p>
          <div className="mt-4 rounded-xl bg-[var(--surface-2)] p-4">
            <p className="text-xs font-bold tracking-wide text-[var(--text-subtle)] uppercase">Specifications</p>
            <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {p.specs.map((s) => <div key={s.label} className="flex justify-between gap-2 text-sm"><dt className="text-[var(--text-muted)]">{s.label}</dt><dd className="font-semibold text-[var(--text)]">{s.value}</dd></div>)}
            </dl>
          </div>
          {hasVariants ? (
            <div className="mt-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Colour</span>
                  <div className="flex gap-2">
                    {Array.from(new Set((p.variants ?? []).map((v) => v.color).filter(Boolean))).map((color) => (
                      <button key={color} type="button" onClick={() => setSelectedColor(color ?? null)} disabled={availableQty <= 0} className={`h-9 w-9 rounded border relative flex items-center justify-center text-xs font-medium transition ${selectedColor === color ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)] text-accent-foreground' : 'border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-2)]'}`}>
                        {(color ?? '').slice(0, 1).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Size</span>
                  <div className="flex gap-2">
                    {Array.from(new Set((p.variants ?? []).map((v) => v.size).filter(Boolean))).map((size) => (
                      <button key={size} type="button" onClick={() => setSelectedSize(size ?? null)} disabled={availableQty <= 0 || (selectedColor != null && !(p.variants ?? []).some((v) => v.color === selectedColor && v.size === size))} className={`h-9 w-9 rounded border border-[var(--border)] bg-white text-[var(--text)] text-xs font-medium flex items-center justify-center transition ${selectedSize === size ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)] text-accent-foreground' : 'hover:bg-[var(--surface-2)]'}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">Qty</span>
                <span className="flex items-center rounded-xl border border-[var(--border)]">
                  <button className="btn btn-ghost btn-icon" onClick={() => setQty((v) => Math.max(1, v - 1))} aria-label="less"><Minus className="h-4 w-4" /></button>
                  <b className="tnum w-8 text-center text-[var(--text)]">{qty}</b>
                  <button className="btn btn-ghost btn-icon" onClick={() => setQty((v) => Math.min(availableQty > 0 ? Math.min(9, availableQty) : 1, v + 1))} aria-label="more"><Plus className="h-4 w-4" /></button>
                </span>
                <button onClick={() => toggleWish(p.id)} className={`btn ${loved ? 'bg-rose-50 text-rose-500' : 'btn-secondary'}`}><Heart className={`h-4 w-4 ${loved ? 'fill-rose-500' : ''}`} /> {loved ? 'Saved' : 'Wishlist'}</button>
              </div>
              <p className={`text-xs ${availableQty > 0 ? 'text-[var(--text-muted)]' : 'text-red-600'}`}>
                {selectedColor == null || selectedSize == null ? 'Select colour & size' : availableQty > 0 ? `${availableQty} available` : 'Out of stock'}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button onClick={cart} disabled={!canAdd} className={`btn btn-secondary flex-1 !py-3 ${!canAdd ? 'opacity-50' : ''}`}><ShoppingCart className="h-4 w-4" /> {added ? 'Added ✓' : 'Add to cart'}</button>
                <button onClick={buy} disabled={!canAdd} className={`btn btn-primary flex-1 !py-3 ${!canAdd ? 'opacity-50' : ''}`}><Zap className="h-4 w-4" /> Buy now</button>
              </div>
            </div>
          ) : (<>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Qty</span>
              <span className="flex items-center rounded-xl border border-[var(--border)]">
                <button className="btn btn-ghost btn-icon" onClick={() => setQty((v) => Math.max(1, v - 1))} aria-label="less"><Minus className="h-4 w-4" /></button>
                <b className="tnum w-8 text-center text-[var(--text)]">{qty}</b>
                <button className="btn btn-ghost btn-icon" onClick={() => setQty((v) => Math.min(9, v + 1))} aria-label="more"><Plus className="h-4 w-4" /></button>
              </span>
              <button onClick={() => toggleWish(p.id)} className={`btn ${loved ? 'bg-rose-50 text-rose-500' : 'btn-secondary'}`}><Heart className={`h-4 w-4 ${loved ? 'fill-rose-500' : ''}`} /> {loved ? 'Saved' : 'Wishlist'}</button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button onClick={cart} className="btn btn-secondary flex-1 !py-3"><ShoppingCart className="h-4 w-4" /> {added ? 'Added ✓' : 'Add to cart'}</button>
              <button onClick={buy} className="btn btn-primary flex-1 !py-3"><Zap className="h-4 w-4" /> Buy now</button>
            </div>
          </>)}
          {added && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Added to cart — <Link to="/cart" className="underline">view cart</Link></p>}
        </div>
      </div>
      {related.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Related {p.category}s</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </div>
      )}
    </div>
  )
}



