/** Admin -> Schools table (part 2a). */
import { Loader2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { STATUS_BADGE, STATUS_LABEL, type SchoolRow, type Status } from './schoolsTypes'

export function SchoolsTable({ rows, loading, err, status, page, lastPage, total, setPage, openProfile, setToggleModal }: {
  rows: SchoolRow[]; loading: boolean; err: string; status: '' | Status
  page: number; lastPage: number; total: number; busyId: number | null
  setPage: (f: (p: number) => number) => void
  openProfile: (row: SchoolRow) => void
  setToggleModal: (m: { row: SchoolRow; field: 'school_status'; value: Status }) => void
  toggleModal: { row: SchoolRow; field: 'school_status'; value: Status } | null
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
            <EmptyState title="No schools" hint={status ? 'Nothing matches this filter yet.' : 'Schools in the directory. Use filters to narrow the list.'} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  {['School', 'Contact', 'Location', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm font-semibold text-slate-900">{row.name}</span>
                        <span className="block text-xs text-slate-500">{row.school_code ?? '—'}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm text-slate-700">{row.email ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.whatsapp ?? ''}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{row.city ?? '—'}, {row.district ?? '—'}, {row.state ?? '—'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[row.school_status]}`}>{STATUS_LABEL[row.school_status]}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => openProfile(row)} className="btn btn-secondary !px-3 !py-1.5 !text-xs">View profile</button>
                          <button type="button" onClick={() => setToggleModal({ row, field: 'school_status', value: row.school_status === 'Active' ? 'Inactive' : 'Active' })} className={row.school_status === 'Active' ? 'btn !px-3 !py-1.5 !text-xs !bg-amber-600 !text-white hover:!bg-amber-700 disabled:opacity-60' : 'btn !px-3 !py-1.5 !text-xs !bg-emerald-600 !text-white hover:!bg-emerald-700 disabled:opacity-60'}>
                            {row.school_status === 'Active' ? 'Block' : 'Unblock'}
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