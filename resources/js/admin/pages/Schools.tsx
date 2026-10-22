/** Admin -> Schools main page (part 1). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Modal } from '@ui'
import { EMPTY_LOCATION_FILTER } from './LocationFilters'
import { LocationFilters } from './LocationFilters'
import type { LocationFilter } from './LocationFilters'
import { SchoolsTable } from './schoolsTable'
import { STATUS_FILTERS, type StatusFilterValue } from './schoolsTypes'
import type { SchoolRow, Status } from './schoolsTypes'

export function Schools() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [sortBy, setSortBy] = useState<'school_name' | 'created_at' | 'school_status'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [status, setStatus] = useState<'' | StatusFilterValue>('')
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState<LocationFilter>(EMPTY_LOCATION_FILTER)
  const [dq, setDq] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId] = useState<number | null>(null)
  const [toggleModal, setToggleModal] = useState<{ row: SchoolRow; field: 'school_status'; value: Status } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SchoolRow | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/schools', { params: {
        status: status || undefined, search: dq || undefined,
        country_id: loc.countryId || undefined, state_id: loc.stateId || undefined, district_id: loc.districtId || undefined,
        per_page: perPage, sort_by: sortBy, sort_dir: sortDir, page,
      } })
      .then((r) => {
        setRows(rowsOf<SchoolRow>(r.data))
        const m = metaOf(r.data)
        setPage(m.page); setLastPage(m.lastPage); setTotal(m.total)
        setErr('')
      })
      .catch((e) => setErr(errMsg(e, 'Could not load schools.')))
      .finally(() => setLoading(false))
  }, [status, dq, loc, perPage, sortBy, sortDir, page])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setPage(1); setDq(q.trim()) }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q])
  const pickTab = (key: '' | StatusFilterValue) => { setStatus(key); setPage(1) }
  const openProfile = (row: SchoolRow) => {
    navigate(`/schools/profile?id=${row.id}`)
  }
return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-bold text-slate-900">School Directory</h2>
        <LocationFilters value={loc} onChange={setLoc} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <select aria-label="Filter by status" className="field !py-2 !text-sm"
            value={status} onChange={(e) => pickTab(e.target.value as '' | StatusFilterValue)}>
            <option value="">All</option>
            {STATUS_FILTERS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input aria-label="Search schools" className="field !py-2 !text-sm"
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, city..." />
        </div>
      </div>
      <SchoolsTable
        rows={rows} loading={loading} err={err} status={status} page={page} lastPage={lastPage} total={total}
        perPage={perPage} sortBy={sortBy} sortDir={sortDir}
        setPage={setPage}
        onSort={(f) => {
          if (f === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
          else { setSortBy(f as typeof sortBy); setSortDir('asc') }
          setPage(1)
        }}
        onPerPage={(n) => { setPerPage(n); setPage(1) }}
        openProfile={openProfile}
        setToggleModal={setToggleModal} />
      {toggleModal && (
        <Modal title={toggleModal.value === 'Active' ? 'Block School' : 'Unblock School'}
          onClose={() => setToggleModal(null)}
        >
          <p className="mt-1 text-sm text-slate-500">
            {toggleModal.value === 'Active' ? 'Are you sure you want to block this school? This will prevent them from logging in.' : 'Are you sure you want to unblock this school?'}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setToggleModal(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button disabled={busyId === toggleModal.row.id}
              onClick={() => {
                api.put(`/admin/schools/${toggleModal.row.id}`, { school_status: toggleModal.value })
                  .then(() => { setToggleModal(null); load() })
                  .catch(e => setErr(errMsg(e, 'Could not update school status'))) }}
              className={`btn !py-2 !text-sm !text-white disabled:opacity-60 ${toggleModal.value === 'Active' ? '!bg-red-600 hover:!bg-red-700' : '!bg-emerald-600 hover:!bg-emerald-700'}`}>
                {toggleModal.value === 'Active' ? 'Block' : 'Unblock'}
              </button>
            </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="Delete School Confirmation" onClose={() => setConfirmDelete(null)}>
          <p className="mt-1 text-sm text-slate-500">Are you sure you want to delete this school?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button disabled={busyId === confirmDelete.id}
              onClick={() => {
                api.delete(`/admin/schools/${confirmDelete.id}`).then(() => { setConfirmDelete(null); load() })
                  .catch(e => setErr(errMsg(e, 'Could not delete school'))) }}
              className="btn !py-2 !text-sm !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60">
                Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
