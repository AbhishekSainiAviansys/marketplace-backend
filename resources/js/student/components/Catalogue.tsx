/** Catalogue: sticky left filter rail + infinite-scroll product grid.
 * Hook-driven (reads ?cat/?q/?sort from the URL) so it works identically on
 * Home and on the dedicated /shop page. */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { useCategories } from '../store/categories'
import { useShop } from '../store/shop'

export function useCatalogue() {
  const { products } = useShop()
  const [params] = useSearchParams()
  const [cat, setCat] = useState(params.get('cat') ?? 'All')
  const [sub, setSub] = useState(params.get('sub') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'pop')
  const [q, setQ] = useState(params.get('q') ?? '')

  // /shop?cat=Book&sub=... deep links — sync when params change while mounted.
  useEffect(() => {
    setCat(params.get('cat') ?? 'All')
    setSub(params.get('sub') ?? '')
    setSort(params.get('sort') ?? 'pop')
    setQ(params.get('q') ?? '')
  }, [params])

  const rows = useMemo(() => {
    let r = [...products]
    if (cat !== 'All') r = r.filter((p) => p.category === cat)
    if (sub) r = r.filter((p) => p.subCategory === sub)
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
  }, [products, cat, sub, sort, q, params])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => { c[p.category] = (c[p.category] ?? 0) + 1 })
    return c
  }, [products])

  return { cat, setCat, sub, setSub, sort, setSort, q, setQ, rows, counts }
}

export function CatalogueRail({ cat, setCat, sub, setSub, sort, setSort, q, setQ }: {
  cat: string; setCat: (c: string) => void
  sub: string; setSub: (s: string) => void
  sort: string; setSort: (s: string) => void
  q: string; setQ: (s: string) => void
}) {
  const { products, student } = useShop()
  const { categories } = useCategories()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    products.forEach((p) => { c[p.category] = (c[p.category] ?? 0) + 1 })
    return c
  }, [products])

  const toggleExpand = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <aside className="card space-y-4 p-4 lg:sticky lg:top-44">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={student ? `Search Class ${student.className}…` : 'Search the store…'} className="field pl-9 outline-none" />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Categories</p>
        <ul className="space-y-1">
          <li>
            <button onClick={() => { setCat('All'); setSub('') }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${cat === 'All' ? 'accent-bg text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'}`}>
              <span>All products</span>
              <span className={`tnum text-[11px] ${cat === 'All' ? 'text-white/80' : 'text-[var(--text-subtle)]'}`}>{products.length}</span>
            </button>
          </li>
          {categories.map((c) => {
            const active = cat === c.name
            const open = expanded[c.name] ?? active
            return (
              <li key={c.id}>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setCat(c.name); setSub(''); toggleExpand(c.name) }}
                    className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${active && !sub ? 'accent-bg text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'}`}>
                    <span>{c.name}</span>
                    <span className="flex items-center gap-2">
                      <span className={`tnum text-[11px] ${active && !sub ? 'text-white/80' : 'text-[var(--text-subtle)]'}`}>{counts[c.name] ?? 0}</span>
                      {(c.subCategories ?? []).length > 0 && (
                        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
                      )}
                    </span>
                  </button>
                </div>
                {open && (c.subCategories ?? []).length > 0 && (
                  <ul className="ml-3 mt-1 space-y-1 border-l border-[var(--border)] pl-2">
                    {(c.subCategories ?? []).map((s) => (
                      <li key={s.id}>
                        <button onClick={() => { setCat(c.name); setSub(s.name) }}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium transition ${cat === c.name && sub === s.name ? 'accent-soft accent-soft-text' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'}`}>
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
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
      {(cat !== 'All' || sub || q) && (
        <button onClick={() => { setCat('All'); setSub(''); setQ('') }} className="text-left text-xs font-bold accent-text hover:underline">Clear filters ✕</button>
      )}
    </aside>
  )
}
