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
import type { LocNames, SchoolProfile, SchoolRow, Stats, Status } from './schoolsTypes'

export function Schools() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'' | Status>('')
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState<LocationFilter>(EMPTY_LOCATION_FILTER)
  const [dq, setDq] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [profile, setProfile] = useState<(SchoolRow & { school: SchoolProfile }) | null>(null)
  const [locNames, setLocNames] = useState<LocNames | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [review, setReview] = useState<{ row: SchoolRow; action: 'approve' | 'reject' } | null>(null)
  const [notes, setNotes] = useState('')
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
  const pickTab = (key: '' | Status) => { setStatus(key); setPage(1) }
  const openProfile = (row: SchoolRow) => {
    setProfileId(row.id)
    setProfile(null)
    setLocNames(null)
    setProfileLoading(true)
    api
      .get(`/admin/schools/${row.id}`)
      .then((r) => {
        const full = r.data as SchoolRow & { school: SchoolProfile }
        setProfile(full)
        const ids = locOf(full.school?.onboarding ?? null)
        if (ids.country || ids.state || ids.district) {
          const p: Record<string, string> = {}
          if (ids.country) p.country_id = ids.country
          if (ids.state) p.state_id = ids.state
          if (ids.district) p.district_id = ids.district
          api.get('/directory/labels', { params: p })
            .then((lr) => setLocNames(lr.data as LocNames)).catch(() => setLocNames(null))
        }
      })
      .catch((e) => flash('err', errMsg(e, 'Could not load the school profile.')))
      .finally(() => setProfileLoading(false))
  }
  const submitReview = async () => {
    if (!review) return
    setBusyId(review.row.id)
    try {
      await api.post(`/admin/schools/${review.row.id}/review`, {
        action: review.action,
        notes: review.action === 'reject' && notes.trim() ? notes.trim() : undefined,
      })
      flash('ok', review.action === 'approve' ? 'School approved.' : 'Application rejected — the school sees your notes.')
      setReview(null); setNotes('')
      loadStats(); load()
      if (profileId === review.row.id) openProfile(review.row)
    } catch (e) {
      flash('err', errMsg(e, 'Review failed.'))
    } finally {
      setBusyId(null)
    }
  }
  const remove = async (row: SchoolRow) => {
    setBusyId(row.id)
    try {
      await api.delete(`/admin/schools/${row.id}`)
      flash('ok', 'School deleted.')
      setConfirmDelete(null)
      loadStats(); load()
    } catch (e) {
      flash('err', errMsg(e, 'Delete failed.'))
    } finally {
      setBusyId(null)
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schools</h1>
          <p className="mt-1 text-sm text-slate-500">Review school applications — approve to unlock login, reject with notes.</p>
        </div>
        <button type="button" onClick={() => { load(); loadStats() }} className="btn btn-secondary !py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>
      {msg && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = t.key === '' ? stats?.total ?? null : stats ? (stats[t.key] as number) : null
          const on = status === t.key
          return (
            <button key={t.key || 'all'} type="button" onClick={() => pickTab(t.key)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${on ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {t.label}
              {count !== null && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${on ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
            </button>
          )
        })}
      </div>
      <div className="grid gap-2 lg:grid-cols-[1fr_1.4fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search school name, code, contact, email or WhatsApp…"
            className="field focus:field-focus pl-9 outline-none" />
        </div>
        <LocationFilters value={loc} onChange={(v) => { setLoc(v); setPage(1) }} />
        {(q !== '' || hasLocationFilter(loc)) && (
          <button type="button" onClick={() => { setQ(''); setLoc(EMPTY_LOCATION_FILTER); setPage(1) }}
            className="btn btn-secondary !py-2 !text-sm whitespace-nowrap">Clear filters</button>
        )}
      </div>
      <SchoolsTable rows={rows} loading={loading} err={err} status={status} page={page} lastPage={lastPage} total={total}
        busyId={busyId} setPage={setPage} openProfile={openProfile}
        setReview={(row, action) => { setReview({ row, action }); setNotes('') }} setConfirmDelete={setConfirmDelete} />


      {profileId !== null && (
        <Modal wide title={profile?.school?.name ?? 'School profile'}
          sub={profile ? `${profile.school?.school_code ?? ''} · ${profile.email ?? profile.whatsapp ?? ''}` : undefined}
          onClose={() => setProfileId(null)}>
          {profileLoading || !profile ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading application…</div>
          ) : (
            <SchoolProfileView profile={profile} locNames={locNames} />
          )}
        </Modal>
      )}

      {review && (
        <Modal title={(review.action === 'approve' ? 'Approve ' : 'Reject ') + (review.row.school?.name ?? review.row.name)}
          sub={review.row.email ?? review.row.whatsapp ?? undefined} onClose={() => setReview(null)}>
          <p className="mt-1 text-sm text-slate-500">
            {review.action === 'approve' ? 'Unlocks login and panel access immediately.' : 'Bounced back to the wizard — they see your notes.'}
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes {review.action === 'approve' ? '(optional)' : '(required — tell them what to fix)'}
            </span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder={review.action === 'approve' ? 'Welcome aboard!' : 'e.g. Registration number mismatch.'}
              className="field focus:field-focus outline-none" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setReview(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button type="button" disabled={busyId === review.row.id || (review.action === 'reject' && !notes.trim())} onClick={submitReview}
              className={`btn !py-2 !text-sm !text-white disabled:opacity-60 ${review.action === 'approve' ? '!bg-emerald-600 hover:!bg-emerald-700' : '!bg-red-600 hover:!bg-red-700'}`}>
              {busyId === review.row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : review.action === 'approve' ? 'Approve school' : 'Reject application'}
            </button>
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title={'Delete ' + (confirmDelete.school?.name ?? 'school')} onClose={() => setConfirmDelete(null)}>
          <p className="mt-1 text-sm text-slate-500">Removes the school account permanently along with their application.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button type="button" disabled={busyId === confirmDelete.id} onClick={() => remove(confirmDelete)}
              className="btn !py-2 !text-sm !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60">
              {busyId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete school'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
