/** Admin -> Students main page. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Search, Trash2, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Modal } from '@ui'
import { LocationFilters, EMPTY_LOCATION_FILTER, hasLocationFilter } from './LocationFilters'
import type { LocationFilter } from './LocationFilters'
import { fromApiUser } from './studentsTypes'
import type { StudentRow } from './studentsTypes'

const TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
] as const

export function Students() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<StudentRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('')
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [loc, setLoc] = useState<LocationFilter>(EMPTY_LOCATION_FILTER)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StudentRow | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text })
    window.setTimeout(() => setMsg(null), 4000)
  }

  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/students', {
        params: {
          search: dq || undefined,
          country_id: loc.countryId || undefined,
          state_id: loc.stateId || undefined,
          district_id: loc.districtId || undefined,
          is_active: status === 'active' ? true : status === 'inactive' ? false : undefined,
          page,
          per_page: perPage,
          sort_by: sortBy,
          sort_dir: sortDir,
        },
      })
      .then((r) => {
        setRows(rowsOf<any>(r.data).map(fromApiUser))
        const m = metaOf(r.data)
        setPage(m.page); setLastPage(m.lastPage); setTotal(m.total)
        setErr('')
      })
      .catch((e) => setErr(errMsg(e, 'Could not load students.')))
      .finally(() => setLoading(false))
  }, [status, dq, loc, page, perPage, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setPage(1); setDq(q.trim()) }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q])

  const pickTab = (key: '' | 'active' | 'inactive') => { setStatus(key); setPage(1) }

  const remove = async (row: StudentRow) => {
    setBusyId(row.id)
    try {
      await api.delete(`/admin/students/${row.id}`)
      flash('ok', 'Student deleted.')
      setConfirmDelete(null)
      load()
    } catch (e) {
      flash('err', errMsg(e, 'Could not delete student.'))
    } finally {
      setBusyId(null)
    }
  }
  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone…"
              className="field !pl-9 focus:field-focus outline-none"
            />
          </div>
          <button type="button" onClick={() => load()} className="btn btn-secondary !py-2 !text-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
        <LocationFilters value={loc} onChange={(v) => { setLoc(v); setPage(1) }} />

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pickTab(t.key as '' | 'active' | 'inactive')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              status === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {q || status || hasLocationFilter(loc) && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setStatus('')
              setLoc(EMPTY_LOCATION_FILTER)
              setPage(1)
            }}
            className="btn btn-ghost btn-icon text-slate-500 text-sm disabled:opacity-60"
            aria-label="Clear filters"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <label className="text-xs text-slate-500">Per page</label>
        <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <label className="text-xs text-slate-500">Sort</label>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
          <option value="created_at">Joined</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
          <option value="is_active">Status</option>
        </select>
        <button type="button" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : err ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-red-600">{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No students found.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" />{r.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{r.email ?? '—'}</div>
                      <div className="text-xs text-slate-400">{r.whatsapp ?? r.phone_e164 ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-slate-600">{r.orders_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => navigate(`/students/profile?id=${r.id}`)} className="btn btn-secondary !py-1.5 !text-xs">
                          View profile/orders
                        </button>
                        <button type="button" disabled={busyId === r.id} onClick={() => setConfirmDelete(r)} className="btn btn-ghost btn-icon text-red-600 disabled:opacity-60" aria-label="Delete student">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <div>{total} total</div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50">
              Prev
            </button>
            <span>Page {page} of {lastPage}</span>
            <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <Modal title={'Delete ' + confirmDelete.name} onClose={() => setConfirmDelete(null)}>
          <p className="mt-1 text-sm text-slate-500">Removes the student account permanently along with their orders.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button type="button" disabled={busyId === confirmDelete.id} onClick={() => remove(confirmDelete)} className="btn !py-2 !text-sm !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60">
              {busyId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete student'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

