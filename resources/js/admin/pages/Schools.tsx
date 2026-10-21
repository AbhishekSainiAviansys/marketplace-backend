/** Admin -> Schools main page (part 1). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { Modal } from '@ui'
import { EMPTY_LOCATION_FILTER } from './LocationFilters'
import { LocationFilters, hasLocationFilter } from './LocationFilters'
import type { LocationFilter } from './LocationFilters'
import { SchoolsTable } from './schoolsTable'
import { SchoolProfileView } from './schoolsProfile'
import { TABS, locOf } from './schoolsTypes'
import type { LocNames, SchoolRow, Stats, Status } from './schoolsTypes'

export function Schools() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<Status>('Active')
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState<LocationFilter>(EMPTY_LOCATION_FILTER)
  const [dq, setDq] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [profile, setProfile] = useState<SchoolRow & { school: SchoolProfile | null } | null>(null)
  const [locNames, setLocNames] = useState<LocNames | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [toggleModal, setToggleModal] = useState<{ row: SchoolRow; field: 'school_status'; value: Status } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SchoolRow | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text })
    window.setTimeout(() => setMsg(null), 4000)
  }
  const loadStats = useCallback(() => {
    api.get<Stats>('/admin/schools/stats').then((r) => setStats(r.data)).catch(() => setStats(null))
  }, [])
  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/schools', { params: { status: status || undefined, search: dq || undefined, country_id: loc.countryId || undefined, state_id: loc.stateId || undefined, district_id: loc.districtId || undefined, page } })
      .then((r) => {
        setRows(rowsOf<SchoolRow>(r.data))
        const m = metaOf(r.data)
        setPage(m.page); setLastPage(m.lastPage); setTotal(m.total)
        setErr('')
      })
      .catch((e) => setErr(errMsg(e, 'Could not load schools.')))
      .finally(() => setLoading(false))
  }, [status, dq, loc, page])
  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setPage(1); setDq(q.trim()) }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q])
  const pickTab = (key: Status) => { setStatus(key); setPage(1) }
  const openProfile = (row: SchoolRow) => {
    setProfileId(row.id)
    setProfile(null)
    setLocNames(null)
    setProfileLoading(true)
    api
      .get(`/admin/schools/${row.id}`)
      .then((r) => {
        const full = r.data as SchoolRow & { school: SchoolProfile | null }
        setProfile(full)
        const ids = locOf(full.school?.onboarding ?? full)
        setLocNames({ country_name: ids.country, state_name: ids.state, district_name: ids.district })
        setProfileLoading(false)
      })
      .catch(() => setProfileLoading(false))
  }
return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-bold text-slate-900">School Directory</h2>
        <StatsStats stats={stats} />
        <LocationFilters value={loc} onChange={setLoc} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <select aria-label="Filter by status" className="field !py-2 !text-sm"
            value={status} onChange={(e) => pickTab(e.target.value as Status)}>
            <option value="All">All</option>
            {TABS.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input aria-label="Search schools" className="field !py-2 !text-sm"
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, code, city..." />
        </div>
      </div>
      <SchoolsTable
        rows={rows} loading={loading} err={err} status={status as Status} page={page} lastPage={lastPage} total={total}
        busyId={busyId} setPage={setPage} openProfile={openProfile}
        setToggleModal={setToggleModal} toggleModal={toggleModal} />
      {profileId !== null && (
        <SchoolProfileView profile={profile} locNames={locNames} setToggleModal={setToggleModal} />
      )}
      {toggleModal && (
        <Modal title={toggleModal.value === 'Active' ? 'Block School' : 'Unblock School'}
          onClose={() => setToggleModal(null)}
        >
          <p className="mt-1 text-sm text-slate-500">
            {toggleModal.value === 'Active' ? 'Are you sure you want to block this school? This will prevent them from logging in.' : 'Are you sure you want to unblock this school?'}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClose={() => setToggleModal(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button disabled={busyId === toggleModal.row.id}
              onClick={() => {
                api.put(`/admin/schools/${toggleModal.row.id}`, { school_status: toggleModal.value })
                  .then(() => { setToggleModal(null); load(); fetchLocNames() })
                  .catch(e => setErr(errMsg(e, 'Could not update school status')))}
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
            <button type="button" onClose={() => setConfirmDelete(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button disabled={busyId === confirmDelete.id}
              onClick={() => {
                api.delete(`/admin/schools/${confirmDelete.id}`).then(() => { setConfirmDelete(null); load() })
                  .catch(e => setErr(errMsg(e, 'Could not delete school')))}
              className="btn !py-2 !text-sm !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60">
                Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
