/** Product details with gallery, specs, qty + related items. */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Heart, Maximize2, Minus, Plus, ShoppingCart, Truck, X, Zap, ZoomIn, ZoomOut } from 'lucide-react'
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
  const [zoomOrigin, setZoomOrigin] = useState('center center')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const imgBoxRef = useRef<HTMLDivElement>(null)
  const lightboxRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!p) return
    setActiveImg(p.image)
    setZoom(1)
    setZoomOrigin('center center')
    setLightboxOpen(false)
    setSelectedColor(null)
    setSelectedSize(null)
    setQty(1)
  }, [p?.id])

  const hasVariants = p?.is_variant ?? (p?.variants ?? []).length > 0
  const variant = (p?.variants ?? []).find((row) => row.color === selectedColor && row.size === selectedSize)
  const colorOptions = (p?.variants ?? []).filter((row, index, rows) =>
    Boolean(row.color) && rows.findIndex((other) => other.color === row.color) === index
  )
  const sizeOptions = (p?.variants ?? []).filter((row, index, rows) =>
    row.color === selectedColor && Boolean(row.size) && rows.findIndex((other) => other.color === row.color && other.size === row.size) === index
  )
  const imageList = p ? (p.images?.length ? p.images : [p.image]) : []
  const activeImageIndex = Math.max(0, imageList.indexOf(activeImg))

  useEffect(() => {
    if (!p || !hasVariants) {
      setSelectedColor(null)
      setSelectedSize(null)
      return
    }

    const selected = (p.variants ?? []).find((row) =>
      row.color === selectedColor && row.size === selectedSize && Number(row.stock ?? 0) > 0
    )
    if (selected) return

    const firstAvailable = (p.variants ?? []).find((row) =>
      Boolean(row.color) && Boolean(row.size) && Number(row.stock ?? 0) > 0
    )
    setSelectedColor(firstAvailable?.color ?? null)
    setSelectedSize(firstAvailable?.size ?? null)
  }, [p?.id, p?.variants, hasVariants, selectedColor, selectedSize])

  useEffect(() => {
    if (!p) return
    const elements = [imgBoxRef.current, lightboxRef.current].filter((element): element is HTMLDivElement => element !== null)
    const cleanups = elements.map((element) => {
      const onWheel = (event: WheelEvent) => {
        event.preventDefault()
        const bounds = element.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100))
        const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
        setZoomOrigin(`${x}% ${y}%`)
        setZoom((current) => {
          const next = current + (event.deltaY < 0 ? 0.25 : -0.25)
          return Math.min(4, Math.max(1, Number(next.toFixed(2))))
        })
      }
      element.addEventListener('wheel', onWheel, { passive: false })
      return () => element.removeEventListener('wheel', onWheel)
    })

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [p?.id, lightboxOpen])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false)
      if (event.key === 'ArrowLeft') selectImage(activeImageIndex - 1)
      if (event.key === 'ArrowRight') selectImage(activeImageIndex + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, activeImageIndex])

  // Compute available quantity from stock_rows when no variants, otherwise from variant or product stock
  const availableQty = !p ? 0 : hasVariants
    ? Number(variant?.stock ?? 0)
    : p.stock_rows?.length
      ? p.stock_rows.reduce((sum, row) => sum + (row.quantity ?? row.stock ?? row.qty ?? 0), 0)
      : Number(p.stock ?? 0)
  const canAdd = Boolean(p) && availableQty > 0 && !added && (!hasVariants || (selectedColor != null && selectedSize != null))

  const off = p ? discount(p) : 0
  const loved = Boolean(p && wish.includes(p.id))
  const related = p ? products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4) : []
  const changeZoom = (amount: number) => {
    setZoom((current) => Math.min(4, Math.max(1, Number((current + amount).toFixed(2)))))
    setZoomOrigin('center center')
  }
  const resetZoom = () => {
    setZoom(1)
    setZoomOrigin('center center')
  }
  const selectImage = (index: number) => {
    if (imageList.length === 0) return
    setActiveImg(imageList[(index + imageList.length) % imageList.length])
    resetZoom()
  }
  const buy = () => {
    if (!p) return
    add(p.id, qty, selectedColor, selectedSize)
    nav('/checkout')
  }
  const cart = () => {
    if (!p) return
    add(p.id, qty, selectedColor, selectedSize)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  if (!p) return <div className="card"><EmptyState title="Product not found" hint="It may have been removed." action={<button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/shop'))} className="btn btn-primary">Back to shop</button>} /></div>

  return (
    <div className="space-y-6">
      <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/shop'))} className="text-sm font-medium text-[var(--text-muted)] hover:underline">← Back to shop</button>
      <div className="card grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
            <div ref={imgBoxRef} className="aspect-[4/3] cursor-zoom-in overflow-hidden" onClick={() => setLightboxOpen(true)}>
              <img src={activeImg || p.image} alt={p.name} className="h-full w-full bg-transparent object-contain p-4 transition-transform duration-150 ease-out"
                style={{ transform: `scale(${zoom})`, transformOrigin: zoomOrigin }}
                onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/' + p.id + '/800/600' }} />
            </div>
            <button type="button" onClick={() => setLightboxOpen(true)} aria-label="Open image viewer" title="Open image viewer" className="absolute right-3 top-3 btn btn-icon border border-[var(--border)] bg-white/90 shadow-sm">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)]">{activeImageIndex + 1} / {imageList.length} · {Math.round(zoom * 100)}%</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 1} aria-label="Zoom out" title="Zoom out" className="btn btn-icon btn-secondary disabled:opacity-40"><ZoomOut className="h-4 w-4" /></button>
              <button type="button" onClick={resetZoom} aria-label="Reset zoom" title="Reset zoom" className="btn btn-icon btn-secondary"><span className="text-[10px] font-semibold">1:1</span></button>
              <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 4} aria-label="Zoom in" title="Zoom in" className="btn btn-icon btn-secondary disabled:opacity-40"><ZoomIn className="h-4 w-4" /></button>
            </div>
          </div>
          {imageList.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {imageList.map((image, index) => (
              <button key={`${image}-${index}`} type="button" onClick={() => selectImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={activeImg === image}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border ${activeImg === image ? 'accent-ring border-transparent' : 'border-[var(--border)]'}`}>
                <img src={image} alt={`${p.name} view ${index + 1}`} className="h-full w-full object-contain p-1" />
              </button>
            ))}
          </div>}
          {lightboxOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={`${p.name} image viewer`} onClick={() => setLightboxOpen(false)}>
            <button type="button" autoFocus onClick={() => setLightboxOpen(false)} aria-label="Close image viewer" title="Close image viewer" className="absolute right-4 top-4 z-10 btn btn-icon bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
            {imageList.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); selectImage(activeImageIndex - 1) }} aria-label="Previous image" title="Previous image" className="absolute left-3 top-1/2 z-10 btn btn-icon bg-white/10 text-white hover:bg-white/20 sm:left-6"><ChevronLeft className="h-6 w-6" /></button>}
            <div ref={lightboxRef} className="flex h-full max-h-[85vh] w-full max-w-6xl items-center justify-center overflow-hidden" onClick={(event) => event.stopPropagation()}>
              <img src={activeImg || p.image} alt={p.name} className="max-h-full max-w-full object-contain transition-transform duration-150 ease-out" style={{ transform: `scale(${zoom})`, transformOrigin: zoomOrigin }} />
            </div>
            {imageList.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); selectImage(activeImageIndex + 1) }} aria-label="Next image" title="Next image" className="absolute right-3 top-1/2 z-10 btn btn-icon bg-white/10 text-white hover:bg-white/20 sm:right-6"><ChevronRight className="h-6 w-6" /></button>}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-black/60 p-2 text-white">
              <button type="button" onClick={(event) => { event.stopPropagation(); changeZoom(-0.25) }} disabled={zoom <= 1} aria-label="Zoom out" title="Zoom out" className="btn btn-icon bg-white/10 text-white disabled:opacity-40"><ZoomOut className="h-4 w-4" /></button>
              <span className="min-w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={(event) => { event.stopPropagation(); resetZoom() }} aria-label="Reset zoom" title="Reset zoom" className="btn btn-icon bg-white/10 text-white"><span className="text-[10px] font-semibold">1:1</span></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); changeZoom(0.25) }} disabled={zoom >= 4} aria-label="Zoom in" title="Zoom in" className="btn btn-icon bg-white/10 text-white disabled:opacity-40"><ZoomIn className="h-4 w-4" /></button>
            </div>
          </div>}
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
              <span className={`badge ${availableQty > 0 ? 'badge-ok' : 'badge-danger'}`}>
                {availableQty > 0 ? `${availableQty} in stock` : 'Out of stock'}
              </span>
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
                  <span className="text-xs font-medium text-[var(--text-muted)]">Colour <span className="font-semibold text-[var(--text)]">{selectedColor ?? 'Choose'}</span></span>
                  <div className="flex flex-wrap gap-3">
                    {colorOptions.map((option) => {
                      const color = option.color
                      if (!color) return null
                      const colorAvailable = (p.variants ?? []).some((row) => row.color === color && Number(row.stock ?? 0) > 0)
                      return <button key={color} type="button" onClick={() => {
                        const firstSize = (p.variants ?? []).find((row) => row.color === color && row.size && Number(row.stock ?? 0) > 0)?.size ?? null
                        setSelectedColor(color)
                        setSelectedSize(firstSize)
                        setQty(1)
                      }} disabled={!colorAvailable} aria-label={`Colour ${color}${colorAvailable ? '' : ', out of stock'}`} aria-pressed={selectedColor === color} title={`${color}${colorAvailable ? '' : ' (out of stock)'}`}
                        className={`relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${selectedColor === color ? 'ring-2 ring-[var(--accent)] ring-offset-2' : 'hover:scale-105'} ${!colorAvailable ? 'cursor-not-allowed opacity-35' : ''}`} style={{ backgroundColor: option.color_code || '#e5e7eb' }}>
                        {selectedColor === color && <span className="h-2 w-2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.65)]" />}
                      </button>
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Size</span>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((option) => {
                      const size = option.size
                      if (!size) return null
                      const sizeAvailable = Number(option.stock ?? 0) > 0
                      return <button key={size} type="button" onClick={() => { setSelectedSize(size); setQty(1) }} disabled={!sizeAvailable} aria-pressed={selectedSize === size} title={`${size}${sizeAvailable ? '' : ' (out of stock)'}`} className={`min-h-10 min-w-12 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedSize === size ? 'accent-ring border-transparent bg-[var(--accent)] text-accent-foreground' : 'border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surface-2)]'}`}>
                        {size}
                      </button>
                    })}
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
                <button type="button" onClick={async () => {
                    try {
                      const fresh = await fetchProduct(p.id)
                      mergeRows([fresh])
                    } catch {}
                    add(p.id, qty, selectedColor, selectedSize)
                    setAdded(true)
                    setTimeout(() => setAdded(false), 1600)
                  }} disabled={!canAdd} className={`btn btn-secondary flex-1 !py-3 ${!canAdd ? 'opacity-50' : ''}`}><ShoppingCart className="h-4 w-4" /> {added ? 'Added ✓' : 'Choose options'}</button>
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
              <button type="button" onClick={cart} disabled={!canAdd} className={`btn btn-secondary flex-1 !py-3 ${!canAdd ? 'opacity-50' : ''}`}><ShoppingCart className="h-4 w-4" /> {added ? 'Added ✓' : 'Add to cart'}</button>
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



