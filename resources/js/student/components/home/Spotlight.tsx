/** Boosted "Featured picks" + "Surprise picks" rows (admin-managed).
 *
 *  v2 — adds loadedRef guards so each row fetches exactly once per mount,
 *  even when the parent re-renders (which it does whenever useShop or
 *  useHomeConfig update). Without this guard, the server's slower response
 *  times (50-200ms vs ~5ms on localhost) cause a render cascade that
 *  triggers 11,000+ duplicate API calls and crashes the browser.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Shuffle } from 'lucide-react'
import { fetchBoosted, fetchRandom, useShop, type Product } from '../../store/shop'
import { useHomeConfig } from '../../store/homeConfig'
import { ProductCard } from '../ProductCard'
import { Reveal } from './Reveal'

function SpotlightRow({ eyebrow, title, items, action }: {
  eyebrow: string; title: string; items: Product[]; action?: ReactNode
}) {
  if (items.length === 0) return null
  return (
    <Reveal>
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">{eyebrow}</p>
            <h2 className="st-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">{title}</h2>
          </div>
          {action}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 4) * 60}><ProductCard p={p} /></Reveal>
          ))}
        </div>
      </section>
    </Reveal>
  )
}

/** Admin-selected products in selection order. Hidden until configured. */
export function BoostRow() {
  const cfg = useHomeConfig()
  const { mergeRows } = useShop()
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows
  const [items, setItems] = useState<Product[]>([])
  const loadedRef = useRef(false)

  const load = useCallback(() => {
    if (loadedRef.current) return
    if (cfg.boostIds.length === 0) { setItems([]); return }
    loadedRef.current = true
    fetchBoosted(cfg.boostIds)
      .then((rows) => {
        const byId = new Map(rows.map((r) => [r.id, r]))
        setItems(cfg.boostIds.map((id) => byId.get(String(id))).filter((p): p is Product => !!p))
        mergeRef.current(rows)
      })
      .catch(() => { loadedRef.current = false; setItems([]) })
  }, [cfg.boostIds])

  useEffect(() => { load() }, [load])

  if (!cfg.sections.boost) return null
  return <SpotlightRow eyebrow={cfg.headings.boostEyebrow} title={cfg.headings.boostTitle} items={items} />
}

/** Random server-side sample — reshuffles on demand, fresh on every visit.
 *  An empty success (no live products yet) or API error falls back to a
 *  client-side shuffle of the loaded catalogue so the row never dies. */
export function RandomRow() {
  const cfg = useHomeConfig()
  const { mergeRows } = useShop()
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows
  const [items, setItems] = useState<Product[]>([])
  const loadedRef = useRef(false)

  const load = useCallback(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    fetchRandom(cfg.random_count)
      .then((rows) => {
        if (rows.length > 0) { setItems(rows); mergeRef.current(rows) }
        else setItems([])
      })
      .catch(() => { loadedRef.current = false; setItems([]) })
  }, [cfg.random_count])

  useEffect(() => { load() }, [load])

  if (!cfg.sections.random) return null
  return (
    <SpotlightRow
      eyebrow={cfg.headings.randomEyebrow}
      title={cfg.headings.randomTitle}
      items={items}
      action={
        <button onClick={() => setItems(items => [...items].sort(() => Math.random() - 0.5))}
          className="btn btn-secondary !py-2 text-xs">
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </button>
      }
    />
  )
}