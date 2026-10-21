/** Auto-moving promo strip inside "Deal of the day" (admin-toggleable via sections.dealStrip).
 *
 * Products: the admin's boosted picks first, then a random catalogue sample,
 * then whatever is already loaded — an EMPTY API success (fresh catalogue,
 * zero products) counts as "no random picks" and falls through like a network
 * error, so the strip still renders whenever the shop shows products at all.
 *
 * The row is two identical halves (items repeated to fill the container twice)
 * and a rAF loop advances scrollLeft, wrapping at the halfway mark for a
 * seamless loop; hover, hidden tabs and prefers-reduced-motion pause it. The
 * chevrons nudge one card at a time and briefly hold the loop still so the
 * two motions never fight. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchBoosted, fetchRandom, useShop, type Product } from '../../store/shop'
import { useHomeConfig } from '../../store/homeConfig'
import { ProductCard } from '../ProductCard'

/** px advanced per frame — gentle drift, not a rocket. */
const SPEED = 0.6
/** One chevron click ≈ card width (w-52 sm:w-56) + gap-4. */
const STEP = 240
/** Loop stays held this long after a chevron click. */
const HOLD_MS = 1400
/** Copies of the item list per half before we stop growing (safety cap). */
const MAX_COPIES = 16

export function DealsMarquee() {
  const cfg = useHomeConfig()
  const { products, mergeRows } = useShop()
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows
  const [items, setItems] = useState<Product[]>([])
  const [copies, setCopies] = useState(1)

  const viewport = useRef<HTMLDivElement>(null)
  const hovering = useRef(false)
  const held = useRef(false)
  const holdTimer = useRef<number | undefined>(undefined)

  const load = useCallback(() => {
    // An empty success (catalogue has no active products yet) must fall back
    // too — otherwise a fresh install would render no strip at all.
    const useCatalogue = (rows: Product[]) => {
      if (rows.length > 0) { mergeRef.current(rows); setItems(rows) }
      else setItems(products.slice(0, 12))
    }
    const pickRandom = () => fetchRandom(12).then(useCatalogue).catch(() => setItems(products.slice(0, 12)))
    // Promoted/boosted first — the admin's hand-picked row gets a second life here.
    if (cfg.boostIds.length > 0) {
      fetchBoosted(cfg.boostIds)
        .then((rows) => { if (rows.length > 0) { mergeRef.current(rows); setItems(rows) } else pickRandom() })
        .catch(pickRandom)
    } else {
      pickRandom()
    }
  }, [cfg.boostIds, products])

  useEffect(() => { load() }, [load])

  // Grow the per-half copy count until one half is wider than the container,
  // so scrollLeft always has somewhere to go (a handful of products on a wide
  // screen would otherwise sit still). Each bump re-runs the effect via the
  // `copies` dep until it converges; the observer re-checks on container resize.
  useLayoutEffect(() => {
    const el = viewport.current
    if (items.length === 0 || !el) return
    if (el.scrollWidth / 2 < el.clientWidth && copies < MAX_COPIES) {
      setCopies((c) => c + 1)
      return
    }
    const ro = new ResizeObserver(() => {
      if (el.scrollWidth / 2 < el.clientWidth) setCopies((c) => (c < MAX_COPIES ? c + 1 : c))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [items, copies])

  // Auto-loop: advance scrollLeft and wrap at the halfway mark (two identical
  // halves, so half a scrollWidth lands back on an identical frame).
  useEffect(() => {
    const el = viewport.current
    if (items.length === 0 || !el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const tick = () => {
      if (!hovering.current && !held.current && !document.hidden) {
        const half = el.scrollWidth / 2
        if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half
        el.scrollLeft += SPEED
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items])

  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  const nudge = (dir: 1 | -1) => {
    viewport.current?.scrollBy({ left: dir * STEP, behavior: 'smooth' })
    held.current = true
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => { held.current = false }, HOLD_MS)
  }

  if (!cfg.sections.dealStrip) return null
  if (items.length === 0) return null

  const half = Array.from({ length: copies }, () => items).flat()

  return (
    <div className="relative mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">
          {cfg.headings.dealStripTitle}
        </p>
        <span className="flex gap-1.5">
          <button type="button" onClick={() => nudge(-1)} aria-label="Move deals left"
            className="btn btn-secondary btn-icon !p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => nudge(1)} aria-label="Move deals right"
            className="btn btn-secondary btn-icon !p-2"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
      <div
        ref={viewport}
        onMouseEnter={() => { hovering.current = true }}
        onMouseLeave={() => { hovering.current = false }}
        className="st-no-scrollbar flex gap-4 overflow-x-auto pb-1"
      >
        {/* Two identical halves for the seamless wrap — index-suffixed keys. */}
        {[half, half].map((copy, h) =>
          copy.map((p, i) => (
            <div key={`${h}-${p.id}-${i}`} className="w-52 shrink-0 sm:w-56">
              <ProductCard p={p} />
            </div>
          )),
        )}
      </div>
    </div>
  )
}

