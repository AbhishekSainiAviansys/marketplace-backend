/** Admin -> Schools table (part 2a). */
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { EmptyState } from '@ui'
import { STATUS_BADGE, STATUS_LABEL, type SchoolRow, type Status } from './schoolsTypes'

export function SchoolsTable({
  rows,
  loading,
  err,
  status,
  page,
  lastPage,
  total,
  perPage,
  sortBy,
  sortDir,
  setPage,
  onSort,
  onPerPage,
  openProfile,
  setToggleModal,
}: {
  rows: SchoolRow[];
  loading: boolean;
  err: string;
  status: '' | string;
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  setPage: (f: (p: number) => number) => void;
  onSort: (field: string) => void;
  onPerPage: (n: number) => void;
  openProfile: (row: SchoolRow) => void;
  setToggleModal: (m: { row: SchoolRow; field: 'school_status'; value: Status }) => void;
}) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Page {page} of {lastPage} · {total} school{total !== 1 ? 's' : ''}</p>
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
                  <th key="School" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">School</th>
                  {/* <th key="Code" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th> */}
                  <th key="Contact" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                  <th key="Location" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th key="Status" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none" onClick={() => onSort('school_status')}>
                    <span className="flex items-center gap-1">Status <SortIcon field="school_status" /></span>
                  </th>
                  <th key="Actions" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const toggleValue: Status = row.school_status === 'Active' ? 'Inactive' : 'Active'
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <button type="button" onClick={() => openProfile(row)} className="text-left">
                          <span className="block text-sm font-semibold text-slate-900">{row.school_name ?? row.name}</span>
                          <span className="block text-xs text-slate-500">{row.school_code ?? '—'}</span>
                        </button>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="block text-sm text-slate-700">{row.school_email ?? row.email ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{row.school_mobile ?? row.whatsapp ?? ''}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{row.city ?? '—'}, {row.district ?? '—'}, {row.state ?? '—'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[row.school_status] ?? STATUS_BADGE['Deleted']}`}>{STATUS_LABEL[row.school_status] ?? row.school_status}</span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => openProfile(row)} className="btn btn-secondary !px-3 !py-1.5 !text-xs">View profile</button>
                          <button type="button" onClick={() => setToggleModal({ row, field: 'school_status', value: toggleValue })} className={row.school_status === 'Active' ? 'btn !px-3 !py-1.5 !text-xs !bg-amber-600 !text-white hover:!bg-amber-700 disabled:opacity-60' : 'btn !px-3 !py-1.5 !text-xs !bg-emerald-600 !text-white hover:!bg-emerald-700 disabled:opacity-60'}>
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