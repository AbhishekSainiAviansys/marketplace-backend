/** School institute details: courses, tutor education, portfolio (website / PDF).
 *  Loaded from GET /school/details, saved via PUT /school/details. */
import { useEffect, useState, type FormEvent } from 'react'
import { BookOpen, CheckCircle2, Eye, FileText, GraduationCap, Globe, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api, apiOrigin, errMsg } from '@lib/api'
import { Alert, Field } from '@ui'
import { LocationFields } from '../../ui/RegistrationFields'

type Profile = Record<string, unknown> | null
type Course = { id?: number; name: string; subject?: string | null; level?: string | null; batch?: string | null; duration?: string | null; fee_range?: string | null; description?: string | null }
type Education = { id?: number; degree: string; university?: string | null; year?: string | null; specialization?: string | null; description?: string | null }
type Portfolio = { id?: number; kind: string; label?: string | null; url?: string | null }
type Details = { profile: Profile; courses: Course[]; education: Education[]; portfolio: Portfolio[] }

type ProfileForm = {
  website: string; contact_person: string; contact_phone: string; contact_email: string
  detailed_address: string; country_id: string; state_id: string; district_id: string
  established_year: string; registration_number: string; board_affiliation: string
  recognition_status: string; medium_of_instruction: string; student_strength: string
  streams: string; classes: string
}

const emptyProfile = (): ProfileForm => ({
  website: '', contact_person: '', contact_phone: '', contact_email: '',
  detailed_address: '', country_id: '', state_id: '', district_id: '',
  established_year: '', registration_number: '', board_affiliation: '',
  recognition_status: '', medium_of_instruction: '', student_strength: '',
  streams: '', classes: '',
})

const toProfileForm = (p: Profile): ProfileForm => {
  const g = (k: string) => {
    const v = p?.[k]
    if (Array.isArray(v)) return v.join(', ')
    return v == null ? '' : String(v)
  }
  return {
    website: g('website'), contact_person: g('contact_person'), contact_phone: g('contact_phone'),
    contact_email: g('contact_email'), detailed_address: g('detailed_address'),
    country_id: g('country_id'), state_id: g('state_id'), district_id: g('district_id'),
    established_year: g('established_year'), registration_number: g('registration_number'),
    board_affiliation: g('board_affiliation'), recognition_status: g('recognition_status'),
    medium_of_instruction: g('medium_of_instruction'), student_strength: g('student_strength'),
    streams: g('streams'), classes: g('classes'),
  }
}

/** Serialize the profile form: '' -> null, 'a, b' -> ['a','b'] for arrays, ids -> numbers. */
const toProfilePayload = (f: ProfileForm) => {
  const str = (v: string) => (v.trim() === '' ? null : v.trim())
  const arr = (v: string) => {
    const items = v.split(',').map((s) => s.trim()).filter(Boolean)
    return items.length ? items : null
  }
  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    website: str(f.website), contact_person: str(f.contact_person),
    contact_phone: str(f.contact_phone), contact_email: str(f.contact_email),
    detailed_address: str(f.detailed_address),
    country_id: num(f.country_id), state_id: str(f.state_id), district_id: num(f.district_id),
    established_year: str(f.established_year), registration_number: str(f.registration_number),
    board_affiliation: str(f.board_affiliation), recognition_status: str(f.recognition_status),
    medium_of_instruction: str(f.medium_of_instruction), student_strength: str(f.student_strength),
    streams: arr(f.streams), classes: arr(f.classes),
  }
}

const emptyCourse = (): Course => ({ name: '', subject: null, level: null, batch: null, duration: null, fee_range: null, description: null })
const emptyEdu = (): Education => ({ degree: '', university: null, year: null, specialization: null, description: null })
const emptyPortfolio = (kind: string): Portfolio => ({ kind, label: null, url: null })

/* ------------------------------------------------------------------ */
/*  Portfolio preview helpers (shared logic, duplicated per panel).    */
/*  /storage/... rows are relative — prefix with the API origin so the  */
/*  browser can load them; absolute http(s) links pass through.        */
/* ------------------------------------------------------------------ */

/** Absolute URL for a portfolio row (null when there is no url). */
const resolveUrl = (p: Portfolio): string | null => {
  if (!p.url) return null
  const u = p.url.trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return `${apiOrigin()}${u.startsWith('/') ? '' : '/'}${u}`
}

/** True for image rows or image-looking file links (.jpg/.jpeg/.png/.webp/.gif). */
const isImageLike = (p: Portfolio): boolean =>
  p.kind === 'image' || /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(p.url ?? '')

/** True for pdf rows or .pdf links (uploaded /storage file or external). */
const isPdfLike = (p: Portfolio): boolean =>
  p.kind === 'pdf' || /\.pdf(\?.*)?$/i.test(p.url ?? '')

/** Short host for website rows (e.g. facebook.com). */
const hostOf = (p: Portfolio): string | null => {
  const u = resolveUrl(p)
  if (!u) return null
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function InstituteDetails() {
  const [data, setData] = useState<Details | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')
  const [editing, setEditing] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio[]>([])
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile())
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Portfolio | null>(null)

  // Lock body scroll + close the preview on Escape while the modal is open.
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [preview])

  useEffect(() => {
    let alive = true
    api.get<Details>('/school/details').then((r) => {
      if (!alive) return
      setData(r.data)
      setCourses(r.data.courses)
      setEducation(r.data.education)
      setPortfolio(r.data.portfolio)
      setProfile(toProfileForm(r.data.profile))
    }).catch((e) => { if (alive) setError(errMsg(e, 'Could not load details')) })
    .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setSaved(''); setBusy(true)
    try {
      const r = await api.put<Details>('/school/details', { profile: toProfilePayload(profile), courses, education, portfolio })
      setData(r.data); setCourses(r.data.courses); setEducation(r.data.education); setPortfolio(r.data.portfolio)
      setProfile(toProfileForm(r.data.profile))
      setEditing(false); setSaved('Details saved')
    } catch (e) { setError(errMsg(e, 'Could not save')) }
    finally { setBusy(false) }
  }

  /** Upload a PDF brochure / image file, appends the created portfolio row. */
  const uploadFile = async (file: File) => {
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('label', file.name)
      const r = await api.post<Portfolio>('/school/portfolio/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPortfolio([...portfolio, r.data])
      setSaved('File uploaded')
    } catch (e) { setError(errMsg(e, 'Upload failed (PDF/JPG/PNG/WEBP, max 10MB)')) }
    finally { setUploading(false) }
  }

  if (loading) return <div className="card flex items-center justify-center gap-2 p-10 text-sm text-[var(--text-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>

  return (
    <div className="space-y-5">
      {saved && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {saved}</div>}
      {error && <Alert>{error}</Alert>}

      {!editing ? (
        <>
          {/* Profile summary (institute_profiles row) */}
          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Profile details</h2></div>
              <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary text-xs"><Pencil className="h-3.5 w-3.5" /> Edit details</button>
            </div>
            {!data?.profile ? (
              <p className="text-sm text-[var(--text-muted)]">No profile details yet — click “Edit details” to add website, contact, address, and registration info.</p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ['Website', data.profile.website],
                  ['Contact person', data.profile.contact_person],
                  ['Contact phone', data.profile.contact_phone],
                  ['Contact email', data.profile.contact_email],
                  ['Established year', data.profile.established_year],
                  ['Registration no.', data.profile.registration_number],
                  ['Board affiliation', data.profile.board_affiliation],
                  ['Recognition', data.profile.recognition_status],
                  ['Medium', data.profile.medium_of_instruction],
                  ['Student strength', data.profile.student_strength],
                ] as [string, unknown][]).map(([label, v]) =>
                  v ? (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--text)]">{String(v)}</dd>
                    </div>
                  ) : null,
                )}
                {data.profile.detailed_address ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-subtle)]">Detailed address</dt>
                    <dd className="mt-1 text-sm text-[var(--text)]">{String(data.profile.detailed_address)}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </section>
          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Courses / classes</h2></div>
              <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary text-xs">Edit</button>
            </div>
            {courses.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No courses listed yet.</p> : (
              <div className="space-y-3">
                {courses.map((c, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <h3 className="text-sm font-bold text-[var(--text)]">{c.name}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{[c.subject, c.level, c.batch, c.duration, c.fee_range].filter(Boolean).join(' \u00b7 ')}</p>
                    {c.description && <p className="mt-1 text-xs text-[var(--text-muted)]">{c.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center gap-2"><GraduationCap className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Faculty education</h2></div>
            {education.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No education details yet.</p> : (
              <div className="space-y-3">
                {education.map((e, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <h3 className="text-sm font-bold text-[var(--text)]">{e.degree}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{[e.university, e.year, e.specialization].filter(Boolean).join(' \u00b7 ')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center gap-2"><Globe className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Website &amp; portfolio</h2></div>
            {portfolio.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No portfolio items yet.</p> : (
              <div className="space-y-3">
                {portfolio.map((p, i) => {
                  const abs = resolveUrl(p)
                  const img = isImageLike(p)
                  const pdf = !img && isPdfLike(p)
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      {abs && img ? (
                        <button type="button" onClick={() => setPreview(p)} className="shrink-0" title="View bigger">
                          <img src={abs} alt={p.label || p.kind} loading="lazy"
                            className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover transition hover:opacity-90"
                            onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        </button>
                      ) : abs && pdf ? (
                        <button type="button" onClick={() => setPreview(p)} title="View PDF"
                          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100">
                          <FileText className="h-6 w-6" />
                          <span className="text-[10px] font-bold uppercase">PDF</span>
                        </button>
                      ) : p.kind === 'website' ? (
                        <span className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                          <Globe className="h-6 w-6" />
                          <span className="max-w-16 truncate px-1 text-[10px] font-bold">{hostOf(p) ?? 'Link'}</span>
                        </span>
                      ) : (
                        <ImageIcon className="h-8 w-8 shrink-0 text-emerald-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-[var(--text)]">{p.label || p.kind}</h3>
                        {abs && <a href={abs} target="_blank" rel="noopener" className="block truncate text-xs text-blue-600 hover:underline">{abs}</a>}
                      </div>
                      {abs && (
                        <button type="button" onClick={() => setPreview(p)}
                          className="btn btn-secondary shrink-0 text-xs">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <form onSubmit={save} className="space-y-5">
          {/* Edit profile (institute_profiles row) */}
          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Profile details</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website"><input className="field" placeholder="https://..." value={profile.website} onChange={(ev) => setProfile({ ...profile, website: ev.target.value })} /></Field>
              <Field label="Detailed address"><input className="field" value={profile.detailed_address} onChange={(ev) => setProfile({ ...profile, detailed_address: ev.target.value })} /></Field>
              <Field label="Contact person"><input className="field" value={profile.contact_person} onChange={(ev) => setProfile({ ...profile, contact_person: ev.target.value })} /></Field>
              <Field label="Contact phone"><input className="field" value={profile.contact_phone} onChange={(ev) => setProfile({ ...profile, contact_phone: ev.target.value })} /></Field>
              <Field label="Contact email"><input type="email" className="field" value={profile.contact_email} onChange={(ev) => setProfile({ ...profile, contact_email: ev.target.value })} /></Field>
              <Field label="Established year"><input className="field" placeholder="2015" value={profile.established_year} onChange={(ev) => setProfile({ ...profile, established_year: ev.target.value })} /></Field>
              <Field label="Registration number"><input className="field" value={profile.registration_number} onChange={(ev) => setProfile({ ...profile, registration_number: ev.target.value })} /></Field>
              <Field label="Board affiliation"><input className="field" value={profile.board_affiliation} onChange={(ev) => setProfile({ ...profile, board_affiliation: ev.target.value })} /></Field>
              <Field label="Recognition status"><input className="field" value={profile.recognition_status} onChange={(ev) => setProfile({ ...profile, recognition_status: ev.target.value })} /></Field>
              <Field label="Medium of instruction"><input className="field" placeholder="English / Hindi" value={profile.medium_of_instruction} onChange={(ev) => setProfile({ ...profile, medium_of_instruction: ev.target.value })} /></Field>
              <Field label="Student strength"><input className="field" value={profile.student_strength} onChange={(ev) => setProfile({ ...profile, student_strength: ev.target.value })} /></Field>
            </div>
            {/* Location dropdowns (countries / states / districts tables). */}
            <div className="mt-4">
              <LocationFields
                value={{ countryId: profile.country_id, stateId: profile.state_id, districtId: profile.district_id }}
                onChange={(next) => setProfile({ ...profile, country_id: next.countryId, state_id: next.stateId, district_id: next.districtId })}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Streams (comma separated)"><input className="field" placeholder="Science, Commerce" value={profile.streams} onChange={(ev) => setProfile({ ...profile, streams: ev.target.value })} /></Field>
              <Field label="Classes (comma separated)"><input className="field" placeholder="9, 10" value={profile.classes} onChange={(ev) => setProfile({ ...profile, classes: ev.target.value })} /></Field>
            </div>
          </section>
          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Courses / classes</h2></div>
              <button type="button" onClick={() => setCourses([...courses, emptyCourse()])} className="btn btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            <div className="space-y-3">
              {courses.map((c, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                  <div className="flex justify-end"><button type="button" onClick={() => setCourses(courses.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Course name"><input required className="field" value={c.name} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></Field>
                    <Field label="Subject"><input className="field" value={c.subject ?? ''} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, subject: e.target.value || null } : x))} /></Field>
                    <Field label="Level / Class"><input className="field" value={c.level ?? ''} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, level: e.target.value || null } : x))} /></Field>
                    <Field label="Batch"><input className="field" value={c.batch ?? ''} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, batch: e.target.value || null } : x))} /></Field>
                    <Field label="Duration"><input className="field" value={c.duration ?? ''} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, duration: e.target.value || null } : x))} /></Field>
                    <Field label="Fee range"><input className="field" value={c.fee_range ?? ''} onChange={(e) => setCourses(courses.map((x, j) => j === i ? { ...x, fee_range: e.target.value || null } : x))} /></Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Faculty education</h2></div>
              <button type="button" onClick={() => setEducation([...education, emptyEdu()])} className="btn btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            <div className="space-y-3">
              {education.map((e, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                  <div className="flex justify-end"><button type="button" onClick={() => setEducation(education.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Degree / qualification"><input required className="field" value={e.degree} onChange={(ev) => setEducation(education.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} /></Field>
                    <Field label="University"><input className="field" value={e.university ?? ''} onChange={(ev) => setEducation(education.map((x, j) => j === i ? { ...x, university: ev.target.value || null } : x))} /></Field>
                    <Field label="Year"><input className="field" value={e.year ?? ''} onChange={(ev) => setEducation(education.map((x, j) => j === i ? { ...x, year: ev.target.value || null } : x))} /></Field>
                    <Field label="Specialization"><input className="field" value={e.specialization ?? ''} onChange={(ev) => setEducation(education.map((x, j) => j === i ? { ...x, specialization: ev.target.value || null } : x))} /></Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Globe className="h-4 w-4 accent-text" /><h2 className="text-base font-bold text-[var(--text)]">Website &amp; portfolio</h2></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPortfolio([...portfolio, emptyPortfolio('website')])} className="btn btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Website</button>
                <button type="button" onClick={() => setPortfolio([...portfolio, emptyPortfolio('pdf')])} className="btn btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> PDF</button>
                <button type="button" onClick={() => setPortfolio([...portfolio, emptyPortfolio('image')])} className="btn btn-secondary text-xs"><Plus className="h-3.5 w-3.5" /> Image</button>
                <label className={`btn btn-secondary cursor-pointer text-xs ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading...' : 'Upload PDF / image'}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={uploading}
                    onChange={(ev) => { const f = ev.target.files?.[0]; if (f) uploadFile(f); ev.target.value = '' }} />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {portfolio.map((p, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge">{p.kind}</span>
                    <button type="button" onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Label"><input className="field" value={p.label ?? ''} onChange={(ev) => setPortfolio(portfolio.map((x, j) => j === i ? { ...x, label: ev.target.value || null } : x))} /></Field>
                    <Field label="URL / link"><input className="field" value={p.url ?? ''} onChange={(ev) => setPortfolio(portfolio.map((x, j) => j === i ? { ...x, url: ev.target.value || null } : x))} /></Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <button type="button" onClick={() => { setEditing(false); if(data){setCourses(data.courses);setEducation(data.education);setPortfolio(data.portfolio);setProfile(toProfileForm(data.profile))} }} className="btn btn-secondary"><X className="h-4 w-4" /> Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {busy ? 'Saving...' : 'Save all details'}
            </button>
          </div>
        </form>
      )}

      {/* Bigger-view modal: full image, embedded PDF, or website link. */}
      {preview && (() => {
        const abs = resolveUrl(preview)
        const img = isImageLike(preview)
        const pdf = !img && isPdfLike(preview)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog" aria-modal="true" aria-label={preview.label || 'Portfolio preview'}>
            <button type="button" aria-label="Close preview" onClick={() => setPreview(null)}
              className="absolute inset-0 bg-black/60" />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <h3 className="truncate text-sm font-bold text-[var(--text)]">{preview.label || preview.kind}</h3>
                <button type="button" onClick={() => setPreview(null)} autoFocus
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-3)]" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-auto bg-[var(--surface-2)] p-4">
                {!abs ? (
                  <p className="text-sm text-[var(--text-muted)]">No link saved for this item.</p>
                ) : img ? (
                  <img src={abs} alt={preview.label || preview.kind} className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />
                ) : pdf ? (
                  <iframe src={abs} title={preview.label || 'PDF preview'} className="h-[70vh] w-full rounded-xl border border-[var(--border)] bg-white" />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Globe className="h-10 w-10 text-blue-600" />
                    <p className="text-sm text-[var(--text-muted)]">
                      External websites can't be embedded here — open it in a new tab instead.
                    </p>
                  </div>
                )}
              </div>
              {abs && (
                <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
                  <a href={abs} target="_blank" rel="noopener" className="btn btn-primary text-xs">
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
