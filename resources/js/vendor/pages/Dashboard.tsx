import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Package, PlusCircle, School, Store } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { useAuth } from '@lib/auth'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton, StatCard } from '@ui'

type SchoolRow = { id: number; name?: string | null; pivot?: { royalty_percent?: number } }
type Product = { id: number; name: string; price?: number | string; stock?: number; category?: { name?: string } }

export function Dashboard({ prefix }: { prefix: string }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')

    void (async () => {
      // allSettled: one failing panel must not blank the whole dashboard.
      const [d, p, s] = await Promise.allSettled([
        api.get(`/${prefix}/dashboard`),
        api.get('/vendor/products'),
        api.get('/vendor/schools'),
      ])
      if (!alive) return

      if (d.status === 'fulfilled') setStats(d.value.data)
      else setErr(errMsg(d.reason, 'Could not load dashboard stats'))

      if (p.status === 'fulfilled') setProducts(rowsOf<Product>(p.value.data).slice(0, 5))
      if (s.status === 'fulfilled') setSchools(rowsOf<SchoolRow>(s.value.data))
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [prefix])

  const num = (k: string) => {
    const v = stats?.[k]
    return typeof v === 'number' ? v : '—'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name ?? ''}`}
        subtitle="Here's how your store is doing today."
        actions={
          <Link to="/products/new">
            <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
          </Link>
        }
      />

      {err && <Alert>{err}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [0, 1].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="My products"
              value={num('products_count')}
              hint="Live in the catalogue"
              icon={<Package className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label="Linked schools"
              value={num('schools_count')}
              hint="Schools you supply"
              icon={<School className="h-5 w-5" />}
              tone="info"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent products */}
        <div className="lg:col-span-2">
          <Panel
            title="Recent products"
            subtitle="Your five most recent listings"
            actions={
              <Link to="/products" className="accent-text text-sm font-semibold hover:underline">
                View all
              </Link>
            }
            bodyClass="p-0"
          >
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                title="No products yet"
                hint="Add your first product to start selling to linked schools."
                action={
                  <Link to="/products/new">
                    <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
                  </Link>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th className="th">Product</th>
                      <th className="th">Category</th>
                      <th className="th text-right">Price</th>
                      <th className="th text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="row-hover">
                        <td className="td font-medium">{p.name}</td>
                        <td className="td text-[var(--text-muted)]">{p.category?.name ?? '—'}</td>
                        <td className="td tnum text-right">₹{Number(p.price ?? 0).toFixed(2)}</td>
                        <td className="td tnum text-right">
                          <span className={`badge ${(p.stock ?? 0) > 0 ? 'badge-ok' : 'badge-danger'}`}>
                            {p.stock ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Linked schools */}
        <Panel title="Linked schools" subtitle="Royalty partners" bodyClass="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : schools.length === 0 ? (
            <EmptyState
              title="No schools linked"
              hint="An admin assigns schools and royalty percentages to your store."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {schools.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="icon-tile h-9 w-9 rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)]">
                    <School className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {s.name ?? `School ${s.id}`}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {s.pivot?.royalty_percent != null
                        ? `${s.pivot.royalty_percent}% royalty`
                        : 'Linked'}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/products" className="card card-hover p-5 hover:shadow-[var(--shadow-raised)]">
          <div className="flex items-center gap-3">
            <span className="icon-tile accent-soft accent-soft-text">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text)]">Manage products</p>
              <p className="text-xs text-[var(--text-muted)]">Edit prices, stock and delivery</p>
            </div>
          </div>
        </Link>
        <Link to="/schools" className="card card-hover p-5 hover:shadow-[var(--shadow-raised)]">
          <div className="flex items-center gap-3">
            <span className="icon-tile bg-[var(--color-info-50)] text-[var(--color-info-600)]">
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text)]">View linked schools</p>
              <p className="text-xs text-[var(--text-muted)]">Royalties and assignments</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
