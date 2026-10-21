import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  School,
  UserRound,
} from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Field, Logo } from '@ui'
import { LocationFields, PhoneNumberField, type LocationValue } from '../../ui/RegistrationFields'

type ApplicationData = {
  institution: {
    name: string
    type: string
    board: string
    registration_number: string
    website: string
    address: string
    country_id: string
    state_id: string
    district_id: string
    pincode: string
    established_year: string
    medium_of_instruction: string
    recognition_status: string
  }
  contact: {
    person_name: string
    designation: string
    contact_country_code: string
    contact_phone: string
    contact_email: string
  }
  classes: string[]
  streams: string
  student_strength: string
  agreement: boolean
}

type ApplicationPayload = {
  status?: string
  data?: unknown
  review_notes?: string | null
  institution_name?: string
}

type AppResponse = {
  token: string
  onboarding?: ApplicationPayload
  user?: { name?: string }
}

const STEPS = [
  { title: 'Institution', caption: 'School / coaching centre identity & address', icon: Building2 },
  { title: 'Affiliation', caption: 'Board, recognition and established year', icon: FileCheck2 },
  { title: 'Contact person', caption: 'Who we can reach', icon: UserRound },
  { title: 'Classes & streams', caption: 'Classes offered and strength', icon: PackageCheck },
  { title: 'Review', caption: 'Confirm and submit', icon: ShieldCheck },
]

const INSTITUTION_TYPES = [
  'School',
  'Coaching centre',
  'Educational institute',
  'Tuition centre',
  'Other',
]

const BOARDS = [
  'CBSE',
  'ICSE',
  'State Board',
  'IB',
  'IGCSE',
  'NIOS',
  'Other',
]

const emptyApplication = (): ApplicationData => ({
  institution: {
    name: '',
    type: 'School',
    board: 'CBSE',
    registration_number: '',
    website: '',
    address: '',
    country_id: '105',
    state_id: '',
    district_id: '',
    pincode: '',
    established_year: '',
    medium_of_instruction: 'English',
    recognition_status: 'Recognised',
  },
  contact: {
    person_name: '',
    designation: '',
    contact_country_code: '+91',
    contact_phone: '',
    contact_email: '',
  },
  classes: [],
  streams: '',
  student_strength: '',
  agreement: false,
})

function normalizeApplication(value: unknown): ApplicationData {
  const base = emptyApplication()
  if (!value || typeof value !== 'object') return base
  const raw = value as Partial<ApplicationData>
  return {
    ...base,
    ...raw,
    institution: { ...base.institution, ...raw.institution },
    contact: { ...base.contact, ...raw.contact },
    classes: Array.isArray(raw.classes)
      ? raw.classes.filter((item): item is string => typeof item === 'string')
      : [],
    agreement: raw.agreement === true,
  }
}

function responseError(error: unknown, fallback: string) {
  const response = (error as {
    response?: { data?: { errors?: Record<string, string[]> } }
  })?.response
  const detail = response?.data?.errors
    ? Object.values(response.data.errors).flat().join(' ')
    : ''
  return detail || errMsg(error, fallback)
}

export function RegisterOnboarding() {
  const [mode, setMode] = useState<'start' | 'resume' | 'application'>('start')
  const [startTab, setStartTab] = useState<'register' | 'resume'>('register')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [account, setAccount] = useState({
    name: '',
    institute: '',
    countryCode: '+91',
    phone: '',
    email: '',
    password: '',
  })
  const [resume, setResume] = useState({ login: '', password: '' })
  const [application, setApplication] = useState<ApplicationData>(emptyApplication)
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('draft')
  const [reviewNotes, setReviewNotes] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [savedAt, setSavedAt] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    let alive = true
    setLoading(true)
    api.get('/school/onboarding')
      .then((response) => {
        if (!alive) return
        const payload = response.data as ApplicationPayload
        setApplication(normalizeApplication(payload.data))
        setStatus(payload.status || 'draft')
        setReviewNotes(payload.review_notes || '')
        setInstitutionName(payload.institution_name || '')
        setMode('application')
      })
      .catch((cause: unknown) => {
        if (alive) setError(errMsg(cause, 'Could not resume the saved application'))
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const acceptApplication = (payload?: ApplicationPayload) => {
    setApplication(normalizeApplication(payload?.data))
    setStatus(payload?.status || 'draft')
    setReviewNotes(payload?.review_notes || '')
    setInstitutionName(payload?.institution_name || account.institute.trim())
    setMode('application')
    setStep(0)
  }

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await api.post<AppResponse>('/auth/register', {
        name: account.name.trim(),
        phone_country_code: account.countryCode,
        whatsapp: account.phone.replace(/\D/g, ''),
        email: account.email.trim() || undefined,
        password: account.password,
        role: 'school',
        school_name: account.institute.trim(),
      })
      localStorage.setItem('token', response.data.token)
      acceptApplication(response.data.onboarding)
    } catch (cause: unknown) {
      setError(responseError(cause, 'Could not create your school account'))
    } finally {
      setBusy(false)
    }
  }

  const continueApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (step === 0) {
      const { institution } = application
      if (!institution.name.trim() || !institution.address.trim() || !institution.country_id || !institution.state_id || !institution.district_id) {
        setError('Complete the institution name and full address, including country, state and district.')
        return
      }
    } else if (step === 1 && !application.institution.registration_number.trim()) {
      setError('Enter the registration / affiliation number for this institution.')
      return
    } else if (step === 2 && (!application.contact.person_name.trim() || !application.contact.contact_phone.trim())) {
      setError('Enter the authorised contact name and phone number.')
      return
    } else if (step === 3 && application.classes.length === 0) {
      setError('Choose at least one class offered.')
      return
    }

    if (await saveDraft()) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const saveDraft = async () => {
    setError('')
    setBusy(true)
    try {
      const response = await api.put('/school/onboarding', { data: application })
      setStatus(response.data.status || status)
      setReviewNotes(response.data.review_notes || '')
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      return true
    } catch (cause: unknown) {
      setError(responseError(cause, 'Could not save your application. Please try again.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!application.agreement) {
      setError('Confirm the institute terms before submitting.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const response = await api.post('/school/onboarding/submit', { data: application })
      setStatus(response.data.status || 'submitted')
      setReviewNotes(response.data.review_notes || '')
      setSavedAt('')
    } catch (cause: unknown) {
      setError(responseError(cause, 'Could not submit your application. Please review the required details.'))
    } finally {
      setBusy(false)
    }
  }

  const resumeApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await api.post<AppResponse>('/onboarding/resume', resume)
      localStorage.setItem('token', response.data.token)
      acceptApplication(response.data.onboarding)
    } catch (cause: unknown) {
      setError(responseError(cause, 'Could not find an application for those sign-in details'))
    } finally {
      setBusy(false)
    }
  }

function IntroCard({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-[var(--text)]">{children}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        We save your progress as you go. You can come back to finish later.
      </p>
    </div>
  )
}

  const setInstitution = (key: keyof ApplicationData['institution'], value: string) => {
    setApplication((current) => ({
      ...current,
      institution: { ...current.institution, [key]: value },
    }))
  }
  const setContact = (key: keyof ApplicationData['contact'], value: string) => {
    setApplication((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }))
  }
  const institutionLocation: LocationValue = {
    countryId: application.institution.country_id,
    stateId: application.institution.state_id,
    districtId: application.institution.district_id,
  }
  const setInstitutionLocation = (location: LocationValue) => {
    setApplication((current) => ({
      ...current,
      institution: {
        ...current.institution,
        country_id: location.countryId,
        state_id: location.stateId,
        district_id: location.districtId,
      },
    }))
  }
  const classToggle = (className: string) => {
    setApplication((current) => ({
      ...current,
      classes: current.classes.includes(className)
        ? current.classes.filter((item) => item !== className)
        : [...current.classes, className],
    }))
  }

  const isLocked = status === 'submitted' || status === 'approved'
  const activeStep = STEPS[step]
  const StepIcon = activeStep.icon

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Logo />
        <Link to="/school/login" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
          School sign in
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-[var(--shadow-raised)] sm:px-9 sm:py-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
            <School className="h-3.5 w-3.5" /> SCHOOL PARTNER APPLICATION
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Set up your school panel
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Share the details we need to verify your school, coaching centre or educational institute.
            Your application is saved as a draft until you submit it.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/75">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Save and return later</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-sky-300" /> Reviewed before access</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-300" /> Designed for schools & institutes</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="card mt-6 flex items-center gap-3 p-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your saved application…
        </div>
      ) : mode === 'application' ? (
        <div className="mt-6">
          {isLocked ? (
            <div className="card mx-auto max-w-3xl p-6 sm:p-8">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                {status === 'approved' ? <CheckCircle2 className="h-6 w-6" /> : <FileCheck2 className="h-6 w-6" />}
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--text)]">
                {status === 'approved' ? 'Your school application is approved' : 'Your application is under review'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {status === 'approved'
                  ? 'You can sign in to the school panel and start managing your catalogue.'
                  : 'We have received your details. We will notify you when the review is complete.'}
              </p>
              {institutionName && <p className="mt-3 text-sm font-semibold text-[var(--text)]">{institutionName}</p>}
              {reviewNotes && <div className="mt-4"><Alert kind="info">{reviewNotes}</Alert></div>}
              <a href="/school/login" className="btn btn-primary mt-6">
                Go to school sign in <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="card h-fit p-4 sm:p-5">
                <div className="mb-4 border-b border-[var(--border)] pb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Application progress</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">{institutionName || 'School application'}</p>
                  <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">Status: {status}</p>
                </div>
                <ol className="space-y-1">
                  {STEPS.map((item, index) => {
                    const Icon = item.icon
                    const current = index === step
                    const complete = index < step
                    return (
                      <li key={item.title}>
                        <button
                          type="button"
                          onClick={() => index < step && setStep(index)}
                          disabled={index > step}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            current ? 'accent-soft text-[var(--text)]' : complete ? 'text-[var(--text)] hover:bg-[var(--surface-2)]' : 'text-[var(--text-subtle)]'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            current ? 'accent-bg text-white' : complete ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--surface-2)]'
                          }`}>
                            {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.title}</span>
                            <span className="block truncate text-[11px] text-[var(--text-muted)]">{item.caption}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
                {savedAt && <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-subtle)]">Saved at {savedAt}</p>}
              </aside>

              <section className="card p-5 sm:p-7">
                {status === 'rejected' && reviewNotes && (
                  <div className="mb-5"><Alert kind="info">Please update your application: {reviewNotes}</Alert></div>
                )}
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                      Step {step + 1} of {STEPS.length}
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[var(--text)]">
                      <StepIcon className="h-5 w-5 accent-text" /> {activeStep.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{activeStep.caption}</p>
                  </div>
                  <span className="hidden rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] sm:inline-flex">
                    Draft saved between steps
                  </span>
                </div>

                {error && <div className="mb-4"><Alert>{error}</Alert></div>}

                <form onSubmit={step === STEPS.length - 1 ? submitApplication : continueApplication}>
                  {step === 0 && (
                    <div className="space-y-4">
                      <IntroCard>Tell us about your institution</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Institution name">
                          <input required autoComplete="organization" className="field" value={application.institution.name} onChange={(event) => setInstitution('name', event.target.value)} placeholder="Name as shown on affiliation documents" />
                        </Field>
                        <Field label="Institution type">
                          <select className="field" value={application.institution.type} onChange={(event) => setInstitution('type', event.target.value)}>
                            {INSTITUTION_TYPES.map((type) => <option key={type}>{type}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Board / affiliation">
                          <select className="field" value={application.institution.board} onChange={(event) => setInstitution('board', event.target.value)}>
                            {BOARDS.map((board) => <option key={board}>{board}</option>)}
                          </select>
                        </Field>
                        <Field label="Registration / affiliation number">
                          <input required autoCapitalize="characters" className="field uppercase" value={application.institution.registration_number} onChange={(event) => setInstitution('registration_number', event.target.value.toUpperCase())} placeholder="Board registration number" />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Institution website" hint="Optional">
                          <input type="url" className="field" value={application.institution.website} onChange={(event) => setInstitution('website', event.target.value)} placeholder="https://" />
                        </Field>
                        <Field label="Established year">
                          <input type="number" className="field" value={application.institution.established_year} onChange={(event) => setInstitution('established_year', event.target.value)} placeholder="e.g. 2005" />
                        </Field>
                      </div>
                      <Field label="Registered institution address">
                        <textarea required rows={3} className="field min-h-24 resize-y" value={application.institution.address} onChange={(event) => setInstitution('address', event.target.value)} placeholder="Building, street and locality" />
                      </Field>
                      <LocationFields value={institutionLocation} onChange={setInstitutionLocation} />
                      <Field label="Postal / ZIP code">
                        <input required className="field" value={application.institution.pincode} onChange={(event) => setInstitution('pincode', event.target.value)} placeholder="Postal code" />
                      </Field>
                    </div>
                  )}
                  {step === 1 && (
                    <div className="space-y-4">
                      <IntroCard>Add the affiliation details used to verify your institution.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Medium of instruction">
                          <select className="field" value={application.institution.medium_of_instruction} onChange={(event) => setInstitution('medium_of_instruction', event.target.value)}>
                            <option>English</option>
                            <option>Hindi</option>
                            <option>Regional language</option>
                            <option>Other</option>
                          </select>
                        </Field>
                        <Field label="Recognition status">
                          <select className="field" value={application.institution.recognition_status} onChange={(event) => setInstitution('recognition_status', event.target.value)}>
                            <option>Recognised</option>
                            <option>Affiliated</option>
                            <option>Pending</option>
                            <option>Other</option>
                          </select>
                        </Field>
                      </div>
                      <p className="rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--text-muted)]">
                        These details help the marketplace verify your institution and place it in the right directory.
                      </p>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-4">
                      <IntroCard>Add the authorised contact person for the school panel.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Contact person">
                          <input required autoComplete="name" className="field" value={application.contact.person_name} onChange={(event) => setContact('person_name', event.target.value)} placeholder="Full name" />
                        </Field>
                        <Field label="Designation">
                          <input required autoComplete="organization" className="field" value={application.contact.designation} onChange={(event) => setContact('designation', event.target.value)} placeholder="Principal / Director / Owner" />
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <PhoneNumberField
                          label="Contact mobile / WhatsApp"
                          countryCode={application.contact.contact_country_code}
                          phone={application.contact.contact_phone}
                          onChange={(countryCode, phone) => { setContact('contact_country_code', countryCode); setContact('contact_phone', phone) }}
                        />
                        <Field label="Contact email" hint="Optional, but useful for application updates">
                          <input type="email" autoComplete="email" className="field" value={application.contact.contact_email} onChange={(event) => setContact('contact_email', event.target.value)} placeholder="name@school.edu" />
                        </Field>
                      </div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-4">
                      <IntroCard>Classes offered and student strength.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {['1','2','3','4','5','6','7','8','9','10','11','12'].map((className) => (
                          <Field key={className} label={className}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={application.classes.includes(className)}
                                onChange={() => classToggle(className)}
                                className="h-4 w-4 shrink-0"
                              />
                              {className}
                            </label>
                          </Field>
                        ))}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Streams offered" hint="Optional (e.g. Science, Commerce, Humanities)">
                          <input className="field" value={application.streams} onChange={(event) => setApplication((current) => ({ ...current, streams: event.target.value }))} placeholder="Science, Commerce, Arts" />
                        </Field>
                        <Field label="Approximate student strength">
                          <input type="number" className="field" value={application.student_strength} onChange={(event) => setApplication((current) => ({ ...current, student_strength: event.target.value }))} placeholder="Number of students" />
                        </Field>
                      </div>
                    </div>
                  )}
                  {step === 4 && (
                    <div className="space-y-5">
                      <IntroCard>Check the key details before sending your application for review.</IntroCard>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Summary label="Institution" value={institutionName} />
                        <Summary label="Institution type" value={application.institution.type} />
                        <Summary label="Board" value={application.institution.board} />
                        <Summary label="Registration number" value={application.institution.registration_number} />
                        <Summary label="Address" value={`${application.institution.address}, ${application.institution.pincode}`} />
                        <Summary label="Classes" value={application.classes.join(', ')} />
                        <Summary label="Streams" value={application.streams || 'Not provided'} />
                        <Summary label="Student strength" value={application.student_strength || 'Not provided'} />
                        <Summary label="Authorised contact" value={application.contact.person_name} />
                        <Summary label="Contact phone" value={application.contact.contact_phone} />
                      </div>
                      <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
                        <input
                          required
                          type="checkbox"
                          checked={application.agreement}
                          onChange={(event) => setApplication((current) => ({ ...current, agreement: event.target.checked }))}
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span>
                          I confirm that the details provided are accurate, that I am authorised to act for this institution, and that I agree to the verification review.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
                    <button
                      type="button"
                      onClick={() => setStep((current) => Math.max(0, current - 1))}
                      disabled={step === 0 || busy}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void saveDraft()} disabled={busy} className="btn btn-secondary">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save draft
                      </button>
                      <button type="submit" disabled={busy} className="btn btn-primary">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {step === STEPS.length - 1 ? 'Submit for review' : 'Save & continue'}
                        {!busy && (step === STEPS.length - 1 ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto mt-6 grid max-w-5xl gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="card p-5 sm:p-7">
            <div className="mb-5 flex gap-2 border-b border-[var(--border)] pb-4">
              <button
                type="button"
                onClick={() => { setStartTab('register'); setError('') }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${startTab === 'register' ? 'accent-bg text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
              >
                New application
              </button>
              <button
                type="button"
                onClick={() => { setStartTab('resume'); setError('') }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${startTab === 'resume' ? 'accent-bg text-white' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}
              >
                Continue application
              </button>
            </div>
            {error && <div className="mb-4"><Alert>{error}</Alert></div>}
            {startTab === 'register' ? (
              <>
                <IntroCard>Create your school account</IntroCard>
                <form onSubmit={register} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name">
                      <input required autoComplete="name" className="field" value={account.name} onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
                    </Field>
                    <Field label="Institution name">
                      <input required autoComplete="organization" className="field" value={account.institute} onChange={(event) => setAccount((current) => ({ ...current, institute: event.target.value }))} placeholder="School / coaching centre name" />
                    </Field>
                  </div>
                  <PhoneNumberField
                    label="WhatsApp / mobile"
                    countryCode={account.countryCode}
                    phone={account.phone}
                    onChange={(countryCode, phone) => setAccount((current) => ({ ...current, countryCode, phone }))}
                  />
                  <Field label="Email" hint="Optional, but useful for application updates">
                    <input type="email" autoComplete="email" className="field" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} placeholder="you@school.edu" />
                  </Field>
                  <Field label="Password">
                    <input required minLength={6} type="password" autoComplete="new-password" className="field" value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" />
                  </Field>
                  <button disabled={busy} className="btn btn-primary w-full !py-3">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <School className="h-4 w-4" />}
                    {busy ? 'Creating account…' : 'Create account & start application'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <IntroCard>Pick up where you left off</IntroCard>
                <form onSubmit={resumeApplication} className="space-y-4">
                  <Field label="Email or mobile number">
                    <input required autoComplete="username" className="field" value={resume.login} onChange={(event) => setResume((current) => ({ ...current, login: event.target.value }))} placeholder="Email or mobile number" />
                  </Field>
                  <Field label="Password">
                    <input required type="password" autoComplete="current-password" className="field" value={resume.password} onChange={(event) => setResume((current) => ({ ...current, password: event.target.value }))} placeholder="Your account password" />
                  </Field>
                  <button disabled={busy} className="btn btn-primary w-full !py-3">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {busy ? 'Finding application…' : 'Continue application'}
                  </button>
                </form>
              </>
            )}
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              Shopping for supplies? <Link to="/register" className="accent-text font-semibold hover:underline">Register as a student</Link>
            </p>
            </section>

            <aside className="card flex flex-col justify-between bg-[var(--surface-2)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">A clear, guided process</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">Get your school panel ready.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  Complete the essentials once. We keep your application as a draft until you are ready to send it for review.
                </p>
                <ul className="mt-6 space-y-4">
                  {[
                    ['Institution details', 'Your name, board, registration and address.'],
                    ['Affiliation & contact', 'Recognition status and the authorised contact person.'],
                    ['Classes & streams', 'Classes offered, streams and student strength.'],
                  ].map(([title, description], index) => (
                    <li key={title} className="flex gap-3">
                      <span className="accent-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">{index + 1}</span>
                      <span>
                        <span className="block text-sm font-semibold text-[var(--text)]">{title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">{description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
                Keep your registration and affiliation details nearby. You can save the form and return later with your email or mobile number and password.
              </p>
            </aside>
        </div>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[var(--text)]">{value || 'Not provided'}</p>
    </div>
  )
}