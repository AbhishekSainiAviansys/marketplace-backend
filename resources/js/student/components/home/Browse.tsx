/** Category tiles + horizontally scrolling deals row (+ auto-moving promo strip). */
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useShop } from '../../store/shop'
import { useHomeConfig } from '../../store/homeConfig'
import { ProductCard } from '../ProductCard'
import { Reveal } from './Reveal'
import { DealsMarquee } from './DealsMarquee'

const TILE_IMG: Record<string, string> = {
  Book: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
  'Book Bundle': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
  'Water Bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
  More: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
}

export function CategoryTiles({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Object.keys(TILE_IMG).map((c, i) => (
        <Reveal key={c} delay={i * 70}>
          <Link to={c === 'All' ? '/shop' : `/shop?cat=${encodeURIComponent(c)}`}
            className="group relative block overflow-hidden rounded-2xl text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1">
            <img src={TILE_IMG[c]} alt={c} loading="lazy" className="h-28 w-full object-cover transition duration-500 group-hover:scale-108 sm:h-32" />
            <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
            <span className="absolute right-3 bottom-3 left-3 flex items-end justify-between text-white">
              <span>
                <span className="block text-sm font-extrabold">{c}</span>
                <span className="block text-[11px] text-white/70">{counts[c] ?? 0} items</span>
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-amber-400 group-hover:text-slate-950">
                <ArrowRight className="h-4 w-4" />
              </span>
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function DealsRow() {
  const { products, add } = useShop()
  const cfg = useHomeConfig()
  const ref = useRef<HTMLDivElement>(null)
  const deals = [...products].sort((a, b) => (b.mrp - b.price) - (a.mrp - a.price)).slice(0, 8)
  if (deals.length === 0) return null
  const slide = (d: number) => ref.current?.scrollBy({ left: d * 280, behavior: 'smooth' })

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--text-subtle)] uppercase">Don&apos;t miss</p>
          <h2 className="st-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">
            {cfg.headings.deals}
            <span className="ml-2 inline-block -translate-y-1 rounded-full bg-rose-500 px-2.5 py-0.5 align-middle font-sans text-[11px] font-bold text-white">{cfg.headings.dealsChip}</span>
          </h2>
        </div>
        <span className="flex gap-1.5">
          <button onClick={() => slide(-1)} aria-label="Scroll left" className="btn btn-secondary btn-icon !p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => slide(1)} aria-label="Scroll right" className="btn btn-secondary btn-icon !p-2"><ChevronRight className="h-4 w-4" /></button>
        </span>
      </div>
      <div ref={ref} className="st-no-scrollbar relative mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
        {deals.map((p) => (
          <div key={p.id} className="w-60 shrink-0 snap-start sm:w-64">
            <ProductCard p={p} />
          </div>
        ))}
      </div>
      <DealsMarquee />
      <p className="relative mt-3 text-xs text-[var(--text-subtle)]">{cfg.headings.dealsTip} <button onClick={() => deals[0] && add(deals[0].id)} className="accent-text font-bold hover:underline">Quick-add the top deal</button></p>
    </section>
  )
}
