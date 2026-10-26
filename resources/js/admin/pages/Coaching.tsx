import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { api, errMsg, metaOf, rowsOf } from "@lib/api"
import { Modal } from "@ui"
import { EMPTY_LOCATION_FILTER } from "./LocationFilters"
import { LocationFilters, hasLocationFilter } from "./LocationFilters"
import type { LocationFilter } from "./LocationFilters"
import { CoachingTable } from "./coachingTable"
import { TABS, fromApiRow } from "./coachingTypes"
import type { CoachingRow, CoachingStats, Status } from "./coachingTypes"

export function Coaching() {
  const [stats, setStats] = useState<CoachingStats | null>(null)
  const [rows, setRows] = useState<CoachingRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortBy, setSortBy] = useState("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<"" | Status>("")
  const [type, setType] = useState("")
  const [q, setQ] = useState("")
  const [loc, setLoc] = useState<LocationFilter>(EMPTY_LOCATION_FILTER)
  const [dq, setDq] = useState("")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [review, setReview] = useState<{ row: CoachingRow; action: "approve" | "reject" } | null>(null)
  const [notes, setNotes] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<CoachingRow | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flash = (kind: "ok" | "err", text: string) => { setMsg({ kind, text }); window.setTimeout(() => setMsg(null), 4000) }

  const loadStats = useCallback(() => {
    api.get<CoachingStats>("/admin/coaching/stats").then((r) => setStats(r.data)).catch(() => setStats(null))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    api.get("/admin/coaching", {
      params: {
        status: status || undefined,
        type: type || undefined,
        search: dq || undefined,
        country_id: loc.countryId || undefined,
        state_id: loc.stateId || undefined,
        district_id: loc.districtId || undefined,
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_dir: sortDir,
      },
    }).then((r) => {
      setRows(rowsOf<any>(r.data).map(fromApiRow))
      const m = metaOf(r.data)
      setPage(m.page); setLastPage(m.lastPage); setTotal(m.total)
      setErr("")
    }).catch((e) => setErr(errMsg(e, "Could not load coaching institutes.")))
      .finally(() => setLoading(false))
  }, [status, type, dq, loc, page, perPage, sortBy, sortDir])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setPage(1); setDq(q.trim()) }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q])

  const pickTab = (key: "" | Status) => { setStatus(key); setPage(1) }

  const openProfile = (row: CoachingRow) => {
    setProfileId(row.id); setProfile(null); setProfileLoading(true)
    api.get(`/admin/coaching/${row.id}`).then((r) => setProfile(r.data)).catch(() => setProfile(null)).finally(() => setProfileLoading(false))
  }

  const submitReview = async () => {
    if (!review) return
    setBusyId(review.row.id)
    try {
      await api.post(`/admin/coaching/${review.row.id}/review`, { action: review.action, notes: notes.trim() || undefined })
      flash("ok", review.action === "approve" ? "Approved." : "Rejected.")
      setReview(null)
      load(); loadStats()
    } catch (e) { flash("err", errMsg(e, "Review failed.")) }
    finally { setBusyId(null) }
  }

  const remove = async (row: CoachingRow) => {
    setBusyId(row.id)
    try {
      await api.delete(`/admin/coaching/${row.id}`)
      flash("ok", "Deleted.")
      setConfirmDelete(null)
      load(); loadStats()
    } catch (e) { flash("err", errMsg(e, "Delete failed.")) }
    finally { setBusyId(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Coaching institutes</h1>
          <p className="text-sm text-slate-500">Review and approve private coaching / institute / tutor listings.</p>
        </div>
        <button type="button" onClick={() => { load(); loadStats() }} className="btn btn-secondary !py-2 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const count = t.key === "" ? stats?.total ?? null : stats ? stats[t.key] : null
          return (
            <button key={t.key || "all"} type="button" onClick={() => pickTab(t.key)}
              className={`btn !py-2 !text-sm ${status === t.key ? "!bg-brand-600 !text-white" : "btn-secondary"}`}>
              {t.label}{count !== null ? ` (${count})` : ""}
            </button>
          )
        })}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, address…"
              className="field pl-9 focus:field-focus outline-none" />
          </div>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} className="field focus:field-focus outline-none">
            <option value="">All types</option>
            <option value="private_coaching">Private coaching</option>
            <option value="private_institute">Private institute</option>
            <option value="private_tutor">Private tutor</option>
          </select>
          <LocationFilters value={loc} onChange={(v) => { setLoc(v); setPage(1) }} />
          {hasLocationFilter(loc) && (
            <button type="button" onClick={() => { setLoc(EMPTY_LOCATION_FILTER); setPage(1) }} className="btn btn-secondary !py-2 !text-sm whitespace-nowrap">Clear filters</button>
          )}
        </div>
      </div>

      <CoachingTable rows={rows} loading={loading} err={err} status={status} page={page} lastPage={lastPage} total={total}
        perPage={perPage} sortBy={sortBy} sortDir={sortDir}
        setPage={setPage}
        onSort={(field) => {
          if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
          else { setSortBy(field); setSortDir('asc') }
          setPage(1)
        }}
        onPerPage={(n) => { setPerPage(n); setPage(1) }}
        busyId={busyId} openProfile={openProfile}
        setReview={(row, action) => { setReview({ row, action }); setNotes("") }} setConfirmDelete={setConfirmDelete} />

      {profileId !== null && (
        <Modal wide title={profile?.name ?? "Coaching profile"} onClose={() => setProfileId(null)}>
          {profileLoading || !profile ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-50 p-4 text-xs">{JSON.stringify(profile, null, 2)}</pre>
          )}
        </Modal>
      )}

      {review && (
        <Modal title={(review.action === "approve" ? "Approve " : "Reject ") + review.row.name}
          sub={review.row.email ?? review.row.whatsapp ?? undefined} onClose={() => setReview(null)}>
          <p className="mt-1 text-sm text-slate-500">
            {review.action === "approve" ? "Unlocks login and panel access immediately." : "Bounced back to the wizard — they see your notes."}
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes {review.action === "approve" ? "(optional)" : "(required — tell them what to fix)"}
            </span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder={review.action === "approve" ? "Welcome aboard!" : "e.g. Fix address details."}
              className="field focus:field-focus outline-none" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setReview(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button type="button" disabled={busyId === review.row.id || (review.action === "reject" && !notes.trim())} onClick={submitReview}
              className={`btn !py-2 !text-sm !text-white disabled:opacity-60 ${review.action === "approve" ? "!bg-emerald-600 hover:!bg-emerald-700" : "!bg-red-600 hover:!bg-red-700"}`}>
              {busyId === review.row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : review.action === "approve" ? "Approve institute" : "Reject application"}
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={"Delete " + confirmDelete.name} onClose={() => setConfirmDelete(null)}>
          <p className="mt-1 text-sm text-slate-500">Removes the institute permanently.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
            <button type="button" disabled={busyId === confirmDelete.id} onClick={() => remove(confirmDelete)}
              className="btn !py-2 !text-sm !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60">
              {busyId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete institute"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
