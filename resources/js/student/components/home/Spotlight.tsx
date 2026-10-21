/** Boosted "Featured picks" + "Surprise picks" rows (admin-managed). */
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

  const load = useCallback(() => {
    if (cfg.boostIds.length === 0) { setItems([]); return }
    fetchBoosted(cfg.boostIds)
      .then((rows) => {
        const byId = new Map(rows.map((r) => [r.id, r]))
        setItems(cfg.boostIds.map((id) => byId.get(String(id))).filter((p): p is Product => !!p))
        mergeRef.current(rows)
      })
      .catch(() => setItems([]))
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
  const { products, mergeRows } = useShop()
  const mergeRef = useRef(mergeRows)
  mergeRef.current = mergeRows
  const [items, setItems] = useState<Product[]>([])
  const [nonce, setNonce] = useState(0)

  const load = useCallback(() => {
    const fallback = () => {
      // Fisher–Yates on a copy — the Shuffle button stays useful offline.
      const pool = [...products]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      setItems(pool.slice(0, cfg.random_count))
    }
    fetchRandom(cfg.random_count)
      .then((rows) => {
        if (rows.length > 0) { setItems(rows); mergeRef.current(rows) }
        else fallback()
      })
      .catch(fallback)
  }, [cfg.random_count, products])

  useEffect(() => { load() }, [load, nonce])

  if (!cfg.sections.random) return null
  return (
    <SpotlightRow
      eyebrow={cfg.headings.randomEyebrow}
      title={cfg.headings.randomTitle}
      items={items}
      action={
        <button onClick={() => setNonce((n) => n + 1)}
          className="btn btn-secondary !py-2 text-xs">
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </button>
      }
    />
  )
}
