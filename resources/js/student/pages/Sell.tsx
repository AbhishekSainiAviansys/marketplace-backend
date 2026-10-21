import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Landmark,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Field, Logo } from '@ui'
import { LocationFields, PhoneNumberField, type LocationValue } from '../../ui/RegistrationFields'

type ApplicationData = {
  business: {
    legal_name: string
    business_type: string
    registration_number: string
    website: string
    address: string
    country_id: string
    state_id: string
    district_id: string
    pincode: string
  }
  tax: { pan: string; gstin: string; tan: string; cin: string }
  bank: { holder_name: string; bank_name: string; account_number: string; ifsc: string; branch: string }
  kyc: {
    signatory_name: string
    designation: string
    contact_country_code: string
    contact_phone: string
    contact_email: string
  }
  categories: string[]
  brands: string
  fulfillment: { mode: string; service_regions: string; return_policy: string }
  agreement: boolean
}

type ApplicationPayload = {
  status?: string
  data?: unknown
  review_notes?: string | null
  shop_name?: string
}

type AppResponse = {
  token: string
  onboarding?: ApplicationPayload
  user?: { name?: string }
}

const STEPS = [
  { title: 'Business', caption: 'Business identity and address', icon: Building2 },
  { title: 'Tax details', caption: 'Tax registration information', icon: FileCheck2 },
  { title: 'Bank account', caption: 'Where payouts should go', icon: Landmark },
  { title: 'Contact person', caption: 'Who we can reach', icon: UserRound },
  { title: 'Products & delivery', caption: 'What you sell and how', icon: PackageCheck },
  { title: 'Review', caption: 'Confirm and submit', icon: ShieldCheck },
]

const PRODUCT_CATEGORIES = [
  'Books & textbooks',
  'School stationery',
  'Bags & lunch boxes',
  'Water bottles',
  'Uniforms & accessories',
  'Learning supplies',
  'Other school essentials',
]

const emptyApplication = (): ApplicationData => ({
  business: {
    legal_name: '',
    business_type: 'Sole proprietor',
    registration_number: '',
    website: '',
    address: '',
    country_id: '105',
    state_id: '',
    district_id: '',
    pincode: '',
  },
  tax: { pan: '', gstin: '', tan: '', cin: '' },
  bank: { holder_name: '', bank_name: '', account_number: '', ifsc: '', branch: '' },
  kyc: {
    signatory_name: '',
    designation: '',
    contact_country_code: '+91',
    contact_phone: '',
    contact_email: '',
  },
  categories: [],
  brands: '',
  fulfillment: { mode: 'school_pickup', service_regions: '', return_policy: '' },
  agreement: false,
})

function normalizeApplication(value: unknown): ApplicationData {
  const base = emptyApplication()
  if (!value || typeof value !== 'object') return base
  const raw = value as Partial<ApplicationData>
  return {
    ...base,
    ...raw,
    business: { ...base.business, ...raw.business },
    tax: { ...base.tax, ...raw.tax },
    bank: { ...base.bank, ...raw.bank },
    kyc: { ...base.kyc, ...raw.kyc },
    categories: Array.isArray(raw.categories)
      ? raw.categories.filter((item): item is string => typeof item === 'string')
      : [],
    fulfillment: { ...base.fulfillment, ...raw.fulfillment },
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

export function Sell() {
  const [mode, setMode] = useState<'start' | 'resume' | 'application'>('start')
  const [startTab, setStartTab] = useState<'register' | 'resume'>('register')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [account, setAccount] = useState({
    name: '',
    shop: '',
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
  const [shopName, setShopName] = useState('')
  const [savedAt, setSavedAt] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    let alive = true
    setLoading(true)
    api.get('/vendor/onboarding')
      .then((response) => {
        if (!alive) return
        const payload = response.data as ApplicationPayload
        setApplication(normalizeApplication(payload.data))
        setStatus(payload.status || 'draft')
        setReviewNotes(payload.review_notes || '')
        setShopName(payload.shop_name || '')
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
    setShopName(payload?.shop_name || account.shop.trim())
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
        shop_name: account.shop.trim(),
        phone_country_code: account.countryCode,
        whatsapp: account.phone.replace(/\D/g, ''),
        email: account.email.trim() || undefined,
        password: account.password,
        role: 'vendor',
      })
      localStorage.setItem('token', response.data.token)
      acceptApplication(response.data.onboarding)
    } catch (cause: unknown) {
      setError(responseError(cause, 'Could not create your seller account'))
    } finally {
      setBusy(false)
    }
  }

  const continueApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (step === 0) {
      const { business } = application
      if (!business.legal_name.trim() || !business.address.trim() || !business.country_id || !business.state_id || !business.district_id) {
        setError('Complete the business name and full address, including country, state and district.')
        return
      }
    } else if (step === 1 && !application.tax.pan.trim()) {
      setError('Enter the PAN or tax identification number for this business.')
      return
    } else if (step === 2) {
      const { holder_name, account_number, ifsc } = application.bank
      if (!holder_name.trim() || !account_number.trim() || !ifsc.trim()) {
        setError('Enter the account holder name, account number and IFSC / routing code.')
        return
      }
    } else if (step === 3) {
      const { signatory_name, contact_phone } = application.kyc
      if (!signatory_name.trim() || !contact_phone.trim()) {
        setError('Enter the authorised contact name and phone number.')
        return
      }
    } else if (step === 4 && application.categories.length === 0) {
      setError('Choose at least one product category.')
      return
    }

    if (await saveDraft()) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const saveDraft = async () => {
    setError('')
    setBusy(true)
    try {
      const response = await api.put('/vendor/onboarding', { data: application })
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
      setError('Confirm the seller agreement before submitting.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const response = await api.post('/vendor/onboarding/submit', { data: application })
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

  const setBusiness = (key: keyof ApplicationData['business'], value: string) => {
    setApplication((current) => ({
      ...current,
      business: { ...current.business, [key]: value },
    }))
  }
  const setTax = (key: keyof ApplicationData['tax'], value: string) => {
    setApplication((current) => ({ ...current, tax: { ...current.tax, [key]: value } }))
  }
  const setBank = (key: keyof ApplicationData['bank'], value: string) => {
    setApplication((current) => ({ ...current, bank: { ...current.bank, [key]: value } }))
  }
  const setKyc = (key: keyof ApplicationData['kyc'], value: string) => {
    setApplication((current) => ({ ...current, kyc: { ...current.kyc, [key]: value } }))
  }
  const businessLocation: LocationValue = {
    countryId: application.business.country_id,
    stateId: application.business.state_id,
    districtId: application.business.district_id,
  }
  const setBusinessLocation = (location: LocationValue) => {
    setApplication((current) => ({
      ...current,
      business: {
        ...current.business,
        country_id: location.countryId,
        state_id: location.stateId,
        district_id: location.districtId,
      },
    }))
  }
  const categoryToggle = (category: string) => {
    setApplication((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }))
  }

  const isLocked = status === 'submitted' || status === 'approved'
  const activeStep = STEPS[step]
  const StepIcon = activeStep.icon

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Logo />
        <Link to="/vendor/login" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
          Seller sign in
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-[var(--shadow-raised)] sm:px-9 sm:py-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
            <Store className="h-3.5 w-3.5" /> SELLER PARTNER APPLICATION
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Set up your school-supply business
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Share the details we need to verify your shop, prepare payouts and connect you with schools.
            Your application is saved as a draft until you submit it.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/75">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Save and return later</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-sky-300" /> Reviewed before selling</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-300" /> Designed for school suppliers</span>
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
                {status === 'approved' ? 'Your seller application is approved' : 'Your application is under review'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {status === 'approved'
                  ? 'You can sign in to the seller panel and start managing your catalogue.'
                  : 'We have received your details. We will notify you when the review is complete.'}
              </p>
              {shopName && <p className="mt-3 text-sm font-semibold text-[var(--text)]">{shopName}</p>}
              {reviewNotes && <div className="mt-4"><Alert kind="info">{reviewNotes}</Alert></div>}
              <a href="/vendor/login" className="btn btn-primary mt-6">
                Go to seller sign in <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="card h-fit p-4 sm:p-5">
                <div className="mb-4 border-b border-[var(--border)] pb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Application progress</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">{shopName || 'Seller application'}</p>
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
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${current ? 'accent-bg text-white' : complete ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--surface-2)]'}`}>
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
                      <IntroCard>Tell us about your business</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Legal business name">
                          <input required autoComplete="organization" className="field" value={application.business.legal_name} onChange={(event) => setBusiness('legal_name', event.target.value)} placeholder="Name as shown on tax documents" />
                        </Field>
                        <Field label="Business type">
                          <select className="field" value={application.business.business_type} onChange={(event) => setBusiness('business_type', event.target.value)}>
                            {['Sole proprietor', 'Partnership', 'Limited liability partnership', 'Private limited company', 'Public limited company', 'Other'].map((type) => <option key={type}>{type}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Business registration number" hint="Optional if you operate as an individual or sole proprietor">
                          <input className="field" value={application.business.registration_number} onChange={(event) => setBusiness('registration_number', event.target.value)} placeholder="Registration / incorporation number" />
                        </Field>
                        <Field label="Business website" hint="Optional">
                          <input type="url" className="field" value={application.business.website} onChange={(event) => setBusiness('website', event.target.value)} placeholder="https://" />
                        </Field>
                      </div>
                      <Field label="Registered business address">
                        <textarea required rows={3} className="field min-h-24 resize-y" value={application.business.address} onChange={(event) => setBusiness('address', event.target.value)} placeholder="Building, street and locality" />
                      </Field>
                      <LocationFields value={businessLocation} onChange={setBusinessLocation} />
                      <Field label="Postal / ZIP code">
                        <input required className="field" value={application.business.pincode} onChange={(event) => setBusiness('pincode', event.target.value)} placeholder="Postal code" />
                      </Field>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      <IntroCard>Add the tax details used to verify your business.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="PAN / tax identification number">
                          <input required autoCapitalize="characters" className="field uppercase" value={application.tax.pan} onChange={(event) => setTax('pan', event.target.value.toUpperCase())} placeholder="PAN or local tax ID" />
                        </Field>
                        <Field label="GSTIN" hint="Optional if not applicable">
                          <input autoCapitalize="characters" className="field uppercase" value={application.tax.gstin} onChange={(event) => setTax('gstin', event.target.value.toUpperCase())} placeholder="GST registration number" />
                        </Field>
                        <Field label="TAN" hint="Optional">
                          <input autoCapitalize="characters" className="field uppercase" value={application.tax.tan} onChange={(event) => setTax('tan', event.target.value.toUpperCase())} placeholder="Tax deduction account number" />
                        </Field>
                        <Field label="CIN / company number" hint="For registered companies">
                          <input autoCapitalize="characters" className="field uppercase" value={application.tax.cin} onChange={(event) => setTax('cin', event.target.value.toUpperCase())} placeholder="Corporate identification number" />
                        </Field>
                      </div>
                      <p className="rounded-xl bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
                        Enter only information required for your business type. Our review team may request supporting documents separately.
                      </p>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <IntroCard>Set the account where seller payouts should be sent.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Account holder name">
                          <input required autoComplete="name" className="field" value={application.bank.holder_name} onChange={(event) => setBank('holder_name', event.target.value)} placeholder="Name exactly as it appears at the bank" />
                        </Field>
                        <Field label="Bank name">
                          <input className="field" value={application.bank.bank_name} onChange={(event) => setBank('bank_name', event.target.value)} placeholder="Bank name" />
                        </Field>
                        <Field label="Account number">
                          <input required autoComplete="off" inputMode="numeric" className="field" value={application.bank.account_number} onChange={(event) => setBank('account_number', event.target.value)} placeholder="Bank account number" />
                        </Field>
                        <Field label="IFSC / routing code">
                          <input required autoCapitalize="characters" autoComplete="off" className="field uppercase" value={application.bank.ifsc} onChange={(event) => setBank('ifsc', event.target.value.toUpperCase())} placeholder="Bank branch code" />
                        </Field>
                        <Field label="Branch" hint="Optional">
                          <input className="field" value={application.bank.branch} onChange={(event) => setBank('branch', event.target.value)} placeholder="Branch name" />
                        </Field>
                      </div>
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                        Make sure the account holder matches the legal business name or authorised proprietor.
                      </p>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <IntroCard>Provide a person we can contact about this application.</IntroCard>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Authorised signatory">
                          <input required autoComplete="name" className="field" value={application.kyc.signatory_name} onChange={(event) => setKyc('signatory_name', event.target.value)} placeholder="Full legal name" />
                        </Field>
                        <Field label="Role / designation">
                          <input className="field" value={application.kyc.designation} onChange={(event) => setKyc('designation', event.target.value)} placeholder="Owner, director, partner…" />
                        </Field>
                        <PhoneNumberField
                          label="Contact phone"
                          countryCode={application.kyc.contact_country_code}
                          phone={application.kyc.contact_phone}
                          onChange={(countryCode, phone) => {
                            setKyc('contact_country_code', countryCode)
                            setKyc('contact_phone', phone)
                          }}
                        />
                        <Field label="Contact email" hint="Optional">
                          <input type="email" autoComplete="email" className="field" value={application.kyc.contact_email} onChange={(event) => setKyc('contact_email', event.target.value)} placeholder="name@business.com" />
                        </Field>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-5">
                      <IntroCard>Help us understand your catalogue and delivery setup.</IntroCard>
                      <fieldset>
                        <legend className="label">Product categories <span className="text-[var(--color-danger-600)]">*</span></legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {PRODUCT_CATEGORIES.map((category) => (
                            <label key={category} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]">
                              <input type="checkbox" checked={application.categories.includes(category)} onChange={() => categoryToggle(category)} className="h-4 w-4 accent-[var(--color-brand-600)]" />
                              {category}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <Field label="Brands you own or are authorised to sell" hint="Separate multiple names with commas. Optional">
                        <input className="field" value={application.brands} onChange={(event) => setApplication((current) => ({ ...current, brands: event.target.value }))} placeholder="Brand names" />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Fulfilment preference">
                          <select className="field" value={application.fulfillment.mode} onChange={(event) => setApplication((current) => ({ ...current, fulfillment: { ...current.fulfillment, mode: event.target.value } }))}>
                            <option value="school_pickup">School pickup</option>
                            <option value="self">Vendor delivery</option>
                            <option value="thirdparty">Third-party courier</option>
                          </select>
                        </Field>
                        <Field label="Areas you can serve" hint="Optional">
                          <input className="field" value={application.fulfillment.service_regions} onChange={(event) => setApplication((current) => ({ ...current, fulfillment: { ...current.fulfillment, service_regions: event.target.value } }))} placeholder="Cities, districts or regions" />
                        </Field>
                      </div>
                      <Field label="Returns and customer support" hint="Optional">
                        <textarea rows={3} className="field resize-y" value={application.fulfillment.return_policy} onChange={(event) => setApplication((current) => ({ ...current, fulfillment: { ...current.fulfillment, return_policy: event.target.value } }))} placeholder="Briefly describe how you handle returns and customer questions" />
                      </Field>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-5">
                      <IntroCard>Check the key details before sending your application for review.</IntroCard>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Summary label="Shop" value={shopName} />
                        <Summary label="Legal name" value={application.business.legal_name} />
                        <Summary label="Business type" value={application.business.business_type} />
                        <Summary label="Address" value={`${application.business.address}, ${application.business.pincode}`} />
                        <Summary label="PAN / tax ID" value={application.tax.pan} />
                        <Summary label="GSTIN" value={application.tax.gstin || 'Not provided'} />
                        <Summary label="Bank account" value={application.bank.account_number ? `•••• ${application.bank.account_number.slice(-4)}` : ''} />
                        <Summary label="Authorised contact" value={application.kyc.signatory_name} />
                        <Summary label="Categories" value={application.categories.join(', ')} />
                        <Summary label="Fulfilment" value={application.fulfillment.mode.replace('_', ' ')} />
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
                          I confirm that the details provided are accurate, that I am authorised to act for this business, and that I agree to the seller terms and verification review.
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
                <IntroCard>Create your seller account</IntroCard>
                <form onSubmit={register} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name">
                      <input required autoComplete="name" className="field" value={account.name} onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
                    </Field>
                    <Field label="Shop name">
                      <input required autoComplete="organization" className="field" value={account.shop} onChange={(event) => setAccount((current) => ({ ...current, shop: event.target.value }))} placeholder="Your store name" />
                    </Field>
                  </div>
                  <PhoneNumberField
                    label="WhatsApp / mobile"
                    countryCode={account.countryCode}
                    phone={account.phone}
                    onChange={(countryCode, phone) => setAccount((current) => ({ ...current, countryCode, phone }))}
                  />
                  <Field label="Email" hint="Optional, but useful for application updates">
                    <input type="email" autoComplete="email" className="field" value={account.email} onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))} placeholder="you@business.com" />
                  </Field>
                  <Field label="Password">
                    <input required minLength={6} type="password" autoComplete="new-password" className="field" value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" />
                  </Field>
                  <button disabled={busy} className="btn btn-primary w-full !py-3">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
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
              Shopping for your family? <Link to="/register" className="accent-text font-semibold hover:underline">Register as a student</Link>
            </p>
          </section>

          <aside className="card flex flex-col justify-between bg-[var(--surface-2)] p-5 sm:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">A clear, guided process</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">A better way to get your shop ready.</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                Complete the essentials once. We keep your application as a draft until you are ready to send it for review.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  ['Business details', 'Your legal name, business type and address.'],
                  ['Tax & payouts', 'Tax identification and the bank account for settlements.'],
                  ['Products & delivery', 'Categories, brands and how you serve schools.'],
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
              Keep your tax and bank details nearby. You can save the form and return later with your email or mobile number and password.
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
