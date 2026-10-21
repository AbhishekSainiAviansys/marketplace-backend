/** Two auto-moving product rows (admin-toggleable via sections.marquee).
 *
 * Row 1 runs right → left, row 2 runs left → right — opposite directions
 * give the double-marquee look and max product exposure near the fold.
 * Each row repeats its list until it fills the container twice (measured), so
 * the `translateX(-50%)` loop is seamless and gap-free on any screen.
 * Hover pauses; `prefers-reduced-motion` kills the animation entirely.
 *
 * Data: fetchRandom(16) (fresh sample each visit — spreads exposure across
 * the catalogue). An EMPTY success or an API error falls back to the loaded
 * catalogue products, so the rows never vanish on a fresh/empty install.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { fetchRandom, useShop, type Product } from '../../store/shop'
import { useHomeConfig } from '../../store/homeConfig'
import { ProductCard } from '../ProductCard'
import { Reveal } from './Reveal'

/** Copies of a row's items before we stop growing (safety cap). */
const MAX_COPIES = 16

export function MovingRows() {
  const cfg = useHomeConfig()
  if (!cfg.sections.marquee) return null

  const { products, mergeRows } = useShop()
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows

  const [items, setItems] = useState<Product[]>([])
  const [, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    // Empty success == no live products yet — treat like the offline path so
    // the rows still render from whatever catalogue is loaded.
    fetchRandom(16)
      .then((rows) => {
        if (rows.length > 0) {
          mergeRef.current(rows)
          setItems(rows)
          setError(null)
        } else if (products.length > 0) {
          setItems(products.slice(0, 16))
        } else {
          setItems([])
        }
      })
      .catch((cause) => {
        // Offline / API down — fall back to whatever catalogue is loaded so the
        // row never renders empty while products exist.
        setError(cause as Error)
        if (products.length > 0) setItems(products.slice(0, 16))
        else setItems([])
      })
  }, [products])

  useEffect(() => { load() }, [load])

  if (items.length === 0) return null

  const rowA = items.slice(0, 8)
  const rowB = items.slice(8, 16)

  return (
    <Reveal>
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">
              {cfg.headings.marqueeEyebrow}
            </p>
            <h2 className="st-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">
              {cfg.headings.marqueeTitle}
            </h2>
          </div>
          <Link to="/shop" className="btn btn-secondary !py-2 text-xs">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {rowA.length > 0 && <MovingRow items={rowA} reverse={false} />}
        {rowB.length > 0 && <MovingRow items={rowB} reverse />}
      </section>
    </Reveal>
  )
}

/** One marquee row: renders two identical halves (items repeated until a half
 *  is wider than the box), so translateX(-50%) wraps seamlessly, gap-free. */
function MovingRow({ items, reverse }: { items: Product[]; reverse: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    // Parent is the overflow-hidden row box; one half must be wider than the
    // visible box, otherwise the -50% wrap shows a gap / jumps visibly.
    const box = el.parentElement
    if (!box) return
    if (el.scrollWidth / 2 < box.clientWidth && copies < MAX_COPIES) {
      setCopies((c) => c + 1)
    }
  }, [items, copies])

  const half = Array.from({ length: copies }, () => items).flat()

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
      <div ref={track} className={`${reverse ? 'st-marquee-rev' : 'st-marquee'} mt-5 gap-4 pb-1`}>
        {[half, half].map((copy, h) =>
          copy.map((p, i) => (
            <div key={`${h}-${p.id}-${i}`} className="shrink-0 w-60 sm:w-64">
              <ProductCard p={p} />
            </div>
          )),
        )}
      </div>
    </div>
  )
}
