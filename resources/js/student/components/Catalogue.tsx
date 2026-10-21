/** Catalogue: sticky left filter rail + infinite-scroll product grid.
 * Hook-driven (reads ?cat/?q/?sort from the URL) so it works identically on
 * Home and on the dedicated /shop page. */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CATEGORIES } from '../data/products'
import { useShop } from '../store/shop'

export function useCatalogue() {
  const { products } = useShop()
  const [params] = useSearchParams()
  const [cat, setCat] = useState(params.get('cat') ?? 'All')
  const [sort, setSort] = useState(params.get('sort') ?? 'pop')
  const [q, setQ] = useState(params.get('q') ?? '')

  // /shop?cat=Book deep links — sync when params change while mounted.
  useEffect(() => {
    setCat(params.get('cat') ?? 'All')
    setSort(params.get('sort') ?? 'pop')
    setQ(params.get('q') ?? '')
  }, [params])

  const rows = useMemo(() => {
    let r = [...products]
    if (cat !== 'All') r = r.filter((p) => p.category === cat)
    const s = (params.get('q') ?? q).trim().toLowerCase()
    if (s) {
      const bits = s.split(/\s+/)
      r = r.filter((p) => {
        const hay = `${p.name} ${p.category} ${p.blurb} ${p.classTag}`.toLowerCase()
        return bits.every((b) => hay.includes(b))
      })
    }
    if (sort === 'lo') r.sort((a, b) => a.price - b.price)
    else if (sort === 'hi') r.sort((a, b) => b.price - a.price)
    else if (sort === 'rate') r.sort((a, b) => b.rating - a.rating)
    else if (sort === 'off') r.sort((a, b) => (b.mrp - b.price) - (a.mrp - a.price))
    else r.sort((a, b) => b.reviews - a.reviews)
    return r
  }, [products, cat, sort, q, params])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => { c[p.category] = (c[p.category] ?? 0) + 1 })
    return c
  }, [products])

  return { cat, setCat, sort, setSort, q, setQ, rows, counts }
}

export function CatalogueRail({ cat, setCat, sort, setSort, q, setQ }: {
  cat: string; setCat: (c: string) => void
  sort: string; setSort: (s: string) => void
  q: string; setQ: (s: string) => void
}) {
  const { products, student } = useShop()
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => { c[p.category] = (c[p.category] ?? 0) + 1 })
    return c
  }, [products])
  return (
    <aside className="card space-y-4 p-4 lg:sticky lg:top-44">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={student ? `Search Class ${student.className}…` : 'Search the store…'} className="field pl-9 outline-none" />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Categories</p>
        <div className="space-y-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${cat === c ? 'accent-bg text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'}`}>
              <span>{c === 'All' ? 'All products' : c}</span>
              <span className={`tnum text-[11px] ${cat === c ? 'text-white/80' : 'text-[var(--text-subtle)]'}`}>
                {c === 'All' ? products.length : counts[c] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Sort by</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="field w-full outline-none" aria-label="Sort products">
          <option value="pop">Most popular</option>
          <option value="lo">Price: low to high</option>
          <option value="hi">Price: high to low</option>
          <option value="rate">Top rated</option>
          <option value="off">Biggest discount</option>
        </select>
      </div>
      {(cat !== 'All' || q) && (
        <button onClick={() => { setCat('All'); setQ('') }} className="text-left text-xs font-bold accent-text hover:underline">Clear filters ✕</button>
      )}
    </aside>
  )
}
