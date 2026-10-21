import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowUpRight, Package, School, Store, Tags, Users } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { useAuth } from '@lib/auth'

type Tile = { key: string; label: string; icon: ReactNode; tone: string }

export function Dashboard({ role, prefix }: { role: string; prefix: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    let alive = true
    setData(null)
    setErr('')
    api
      .get(`/${prefix}/dashboard`)
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setErr(errMsg(e, 'API offline – is Laravel running on :8001?')))
    return () => {
      alive = false
    }
  }, [prefix])

  const tiles: Record<string, Tile[]> = {
    admin: [
      { key: 'vendors_count', label: 'Vendors', icon: <Store className="h-5 w-5" />, tone: 'bg-brand-50 text-brand-600' },
      { key: 'schools_count', label: 'Schools', icon: <School className="h-5 w-5" />, tone: 'bg-emerald-50 text-emerald-600' },
      { key: 'products_count', label: 'Products', icon: <Package className="h-5 w-5" />, tone: 'bg-amber-50 text-amber-600' },
      { key: 'categories_count', label: 'Categories', icon: <Tags className="h-5 w-5" />, tone: 'bg-sky-50 text-sky-600' },
      { key: 'assignments_count', label: 'School–vendor links', icon: <Users className="h-5 w-5" />, tone: 'bg-rose-50 text-rose-600' },
    ],
    vendor: [
      { key: 'products_count', label: 'My products', icon: <Package className="h-5 w-5" />, tone: 'bg-brand-50 text-brand-600' },
      { key: 'schools_count', label: 'Linked schools', icon: <School className="h-5 w-5" />, tone: 'bg-emerald-50 text-emerald-600' },
    ],
    school: [
      { key: 'vendors_count', label: 'Vendors', icon: <Store className="h-5 w-5" />, tone: 'bg-brand-50 text-brand-600' },
      { key: 'products_count', label: 'My products', icon: <Package className="h-5 w-5" />, tone: 'bg-amber-50 text-amber-600' },
    ],
  }

  const list = tiles[role] ?? tiles.admin

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="text-sm text-slate-500">Welcome back,</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{user?.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          You are signed in to the <span className="capitalize">{role}</span> panel.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {!data && !err && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <div key={t.key} className="card animate-pulse p-5">
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
              <div className="mt-4 h-7 w-16 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <div key={t.key} className="card p-5 transition hover:shadow-md">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.tone}`}>{t.icon}</div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {typeof data[t.key] === 'number' ? (data[t.key] as number) : (data[t.key] as string) ?? '—'}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                {t.label} <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
              </p>
            </div>
          ))}
        </div>
      )}

      {data && role === 'school' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800">School profile</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            {JSON.stringify(data.school ?? {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
