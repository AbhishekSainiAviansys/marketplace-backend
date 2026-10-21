import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Lock, Package, PlusCircle, Store } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { useAuth } from '@lib/auth'
import {
  Alert,
  Button,
  PageHeader,
  Panel,
  Skeleton,
  StatCard,
} from '@ui'

type School = {
  id: number
  name?: string | null
  school_code?: string | null
  is_independent?: boolean | number
  class_list?: string[] | null
}

export function Dashboard({ prefix }: { prefix: string }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    api
      .get(`/${prefix}/dashboard`)
      .then((r) => {
        if (alive) setStats(r.data)
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'API offline – is Laravel running on :8001?'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [prefix])

  const num = (k: string) => {
    const v = stats?.[k]
    return typeof v === 'number' ? v : '—'
  }

  const school = stats?.school as School | undefined
  // The backend blocks writes for non-independent schools (mustIndependent).
  const independent = Boolean(school?.is_independent)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name ?? ''}`}
        subtitle={
          school?.name
            ? `${school.name}${school.school_code ? ` · ${school.school_code}` : ''}`
            : 'Here is your school at a glance.'
        }
        actions={
          independent ? (
            <Link to="/products/new">
              <Button icon={<PlusCircle className="h-4 w-4" />}>Add product</Button>
            </Link>
          ) : undefined
        }
      />

      {err && <Alert>{err}</Alert>}

      {!independent && school && (
        <Alert kind="info">
          This school is <strong>not independent</strong>, so adding your own products is disabled.
          You can still browse the vendor catalogue and see your linked vendors.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="card p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Linked vendors"
              value={num('vendors_count')}
              hint="Supplying your school"
              icon={<Store className="h-5 w-5" />}
              tone="info"
            />
            <StatCard
              label="My products"
              value={num('products_count')}
              hint="Added by your school"
              icon={<Package className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label="Catalogue"
              value={<Link to="/catalogue" className="accent-text">Browse</Link>}
              hint="Products from linked vendors"
              icon={<BookOpen className="h-5 w-5" />}
              tone="ok"
            />
          </>
        )}
      </div>

      {school && (
        <Panel title="School profile" subtitle="Managed by your admin">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="label">Name</dt>
              <dd className="text-sm font-semibold text-[var(--text)]">{school.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="label">School code</dt>
              <dd className="text-sm font-semibold text-[var(--text)]">
                <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-xs">
                  {school.school_code ?? '—'}
                </code>
              </dd>
            </div>
            <div>
              <dt className="label">Mode</dt>
              <dd>
                <span className={`badge ${independent ? 'badge-ok' : 'badge-neutral'}`}>
                  {independent ? (
                    <>
                      <Lock className="h-3 w-3" /> Independent
                    </>
                  ) : (
                    'Vendor-managed'
                  )}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="label">Classes</dt>
              <dd className="flex flex-wrap gap-1.5">
                {(school.class_list ?? []).length === 0 ? (
                  <span className="text-sm text-[var(--text-muted)]">No classes configured</span>
                ) : (
                  (school.class_list ?? []).map((c) => (
                    <span key={c} className="badge badge-neutral">
                      Class {c}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </Panel>
      )}
    </div>
  )
}
