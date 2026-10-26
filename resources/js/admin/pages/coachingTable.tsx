import { ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { STATUS_BADGE, STATUS_LABEL, fmtDate, type CoachingRow, type Status } from './coachingTypes'

export function CoachingTable({ rows, loading, err, status, page, lastPage, total, perPage, sortBy, sortDir, setPage, onSort, onPerPage, busyId, openProfile, setReview, setConfirmDelete }: {
  rows: CoachingRow[]
  loading: boolean
  err: string
  status: '' | Status
  page: number
  lastPage: number
  total: number
  perPage: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  setPage: (f: (p: number) => number) => void
  onSort: (field: string) => void
  onPerPage: (n: number) => void
  busyId: number | null
  openProfile: (row: CoachingRow) => void
  setReview: (row: CoachingRow, action: 'approve' | 'reject') => void
  setConfirmDelete: (row: CoachingRow) => void
}) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }
  const typeLabel = (t: string) => t === 'private_institute' ? 'Private institute' : t === 'private_tutor' ? 'Private tutor' : 'Private coaching'
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Page {page} of {lastPage} · {total} institute{total !== 1 ? 's' : ''}</p>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>Per page</span>
          <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))} className="field !py-1 !text-xs w-16">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="card overflow-hidden p-0">
        {err && <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8"><EmptyState title="No institutes" hint={status ? 'Nothing matches this filter yet.' : 'Registered coaching institutes appear here.'} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => onSort('name')}>
                    <span className="flex items-center gap-1">Institute <SortIcon field="name" /></span>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => onSort('institute_type')}>
                    <span className="flex items-center gap-1">Type <SortIcon field="institute_type" /></span>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => onSort('onboarding_status')}>
                    <span className="flex items-center gap-1">Status <SortIcon field="onboarding_status" /></span>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => onSort('submitted_at')}>
                    <span className="flex items-center gap-1">Submitted <SortIcon field="submitted_at" /></span>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const st = row.onboarding_status ?? 'draft'
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm font-semibold text-slate-900">{row.name}</span>
                        <span className="block text-xs text-slate-500">{row.owner_name}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{typeLabel(row.institute_type)}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm text-slate-700">{row.email ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.whatsapp ?? ''}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[st]}`}>{STATUS_LABEL[st]}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{fmtDate(row.submitted_at ?? row.created_at)}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => openProfile(row)} className="btn btn-secondary !px-3 !py-1.5 !text-xs">View profile</button>
                          {st !== 'approved' && (
                            <button type="button" disabled={busyId === row.id} onClick={() => setReview(row, 'approve')}
                              className="btn !px-3 !py-1.5 !text-xs !bg-emerald-600 !text-white hover:!bg-emerald-700 disabled:opacity-60">Approve</button>
                          )}
                          {st !== 'rejected' && (
                            <button type="button" disabled={busyId === row.id} onClick={() => setReview(row, 'reject')}
                              className="btn !px-3 !py-1.5 !text-xs !bg-red-50 !text-red-600 hover:!bg-red-100 disabled:opacity-60">Reject</button>
                          )}
                          <button type="button" aria-label="Delete" onClick={() => setConfirmDelete(row)}
                            className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {lastPage} · {total} institute{total !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-secondary !py-1.5 !text-xs disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary !py-1.5 !text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </>
  )
}