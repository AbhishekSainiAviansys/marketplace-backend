/** Dedicated shop page: header + the shared catalogue (filter rail, grid).
 * Shop menu links land here (/shop?cat=Book, /shop?sort=off); Home keeps only
 * the "Shop by category" tiles that link over. */
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Alert, EmptyState } from '@ui'
import { useShop } from '../store/shop'
import { useCatalogue, CatalogueRail } from '../components/Catalogue'
import { ProductCard, SkeletonGrid } from '../components/ProductCard'
import { Reveal } from '../components/home/Reveal'
import { usePageSeo } from '../lib/seo'

export function Shop() {
  const { live, loading, loadingMore, hasMore, fetchMore, student } = useShop()
  const { cat, setCat, sort, setSort, q, setQ, rows } = useCatalogue()
  const sentinelRef = useRef<HTMLDivElement>(null)

  usePageSeo({
    title: cat !== 'All' ? `${cat} · School Store` : 'All products · School Store',
    description: cat !== 'All'
      ? `Browse ${cat} products at the school shop — books, bundles, bottles and more with free school pickup and COD.`
      : 'Browse the school shop — books, bundles, bottles and more with free school pickup and COD.',
    canonical: window.location.origin + (cat !== 'All' ? `/shop?cat=${encodeURIComponent(cat)}` : '/shop'),
    type: 'website',
  })

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) fetchMore() },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadingMore, fetchMore])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-[var(--text-subtle)] uppercase">Store</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[var(--text)] sm:text-3xl">
          {cat !== 'All' ? cat : 'All products'}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {student ? `Picked for Class ${student.className} · ` : ''}Free school pickup on most items.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[240px_1fr]">
        <CatalogueRail cat={cat} setCat={setCat} sort={sort} setSort={setSort} q={q} setQ={setQ} />
        <section className="min-w-0 space-y-4">
          {!live && !loading && (
            <Alert kind="info">Showing demo products — add products from the Admin or Vendor panel and they appear here live.</Alert>
          )}
          {loading ? <SkeletonGrid /> : rows.length === 0 ? (
            <div className="card"><EmptyState title="No products found" hint="Try a different search or category." /></div>
          ) : (
            <>
              <Reveal>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="relative mt-1 inline-block text-lg font-extrabold text-[var(--text)] sm:text-xl">
                    {rows.length} product{rows.length === 1 ? '' : 's'}{cat !== 'All' ? ` in ${cat}` : ''}
                    <span className="accent-bg absolute -bottom-1.5 left-0 h-1 w-12 rounded-full" />
                  </h2>
                  <Link to="/cart" className="hidden text-xs font-bold accent-text hover:underline sm:block">View cart →</Link>
                </div>
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i % 8, 4) * 60}>
                    <ProductCard p={p} />
                  </Reveal>
                ))}
              </div>
            </>
          )}
          {live && !loading && (
            <div ref={sentinelRef} aria-live="polite"
              className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--text-subtle)]">
              {loadingMore ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--brand, #6366f1)]" />
                  Loading more products…
                </>
              ) : hasMore ? (
                'Scroll down to load more'
              ) : rows.length > 0 ? (
                '— You have seen everything —'
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
