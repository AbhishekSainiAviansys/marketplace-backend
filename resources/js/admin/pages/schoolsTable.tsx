/** Admin -> Schools table (part 2a). */
import { Loader2, Trash2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { STATUS_BADGE, STATUS_LABEL, fmtDate, type SchoolRow, type Status } from './schoolsTypes'

export function SchoolsTable({ rows, loading, err, status, page, lastPage, total, busyId, setPage, openProfile, setReview, setConfirmDelete }: {
  rows: SchoolRow[]; loading: boolean; err: string; status: '' | Status
  page: number; lastPage: number; total: number; busyId: number | null
  setPage: (f: (p: number) => number) => void
  openProfile: (row: SchoolRow) => void
  setReview: (row: SchoolRow, action: 'approve' | 'reject') => void
  setConfirmDelete: (row: SchoolRow) => void
}) {
  return (
    <>
      <div className="card overflow-hidden p-0">
        {err && <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading schools…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No school requests" hint={status ? 'Nothing matches this filter yet.' : 'New school applications land here the moment they submit the onboarding wizard.'} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  {['School', 'Contact', 'Status', 'Submitted', 'Vendors', 'Actions'].map((h) => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const st = row.school?.onboarding_status ?? 'draft'
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm font-semibold text-slate-900">{row.school?.name ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.school?.school_code ?? row.name}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm text-slate-700">{row.email ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.whatsapp ?? ''}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[st]}`}>{STATUS_LABEL[st]}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{fmtDate(row.school?.submitted_at ?? null)}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{row.school?.vendors?.length ?? 0}</td>
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
                          <button type="button" aria-label="Delete school" onClick={() => setConfirmDelete(row)}
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
          <p className="text-xs text-slate-500">Page {page} of {lastPage} · {total} school{total !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-secondary !py-1.5 !text-xs disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary !py-1.5 !text-xs disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </>
  )
}
