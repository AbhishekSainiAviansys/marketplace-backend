/** Student register per diagram: name, class, school_code/new-school,
 * whatsapp, password + email OTP (real API, demo fallback).
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Field, Logo } from '@ui'
import { LocationFields, PhoneNumberField, SchoolDirectoryPicker, type LocationValue } from '../../ui/RegistrationFields'
import { useShop } from '../store/shop'

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function Register() {
  const nav = useNavigate()
  const { login: save } = useShop()
  const [form, setForm] = useState({ name: '', className: '5', schoolCode: '', newSchool: false, schoolName: '', phoneCountryCode: '+91', whatsapp: '', email: '', password: '' })
  const [location, setLocation] = useState<LocationValue>({ countryId: '105', stateId: '', districtId: '' })
  const [schoolSearch, setSchoolSearch] = useState('')
  const [otpId, setOtpId] = useState<number | null>(null)
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const sendOtp = async () => {
    setErr(''); setOtpInfo(''); setBusy(true)
    try {
      const identifier = form.email.trim() || `${form.phoneCountryCode}${form.whatsapp.replace(/\D/g, '')}`
      const { data } = await api.post('/auth/otp/send', { identifier })
      setOtpId(data.otp_id ?? 0)
      setOtpInfo(data.otp_debug ? `Demo OTP: ${data.otp_debug} (Mailpit :8025)` : 'OTP sent — check Mailpit :8025')
    } catch (cause: unknown) {
      setErr(errMsg(cause, 'Could not send the verification code'))
    } finally { setBusy(false) }
  }

  const verify = async () => {
    setErr(''); setBusy(true)
    try {
      await api.post('/auth/otp/verify', { otp_id: otpId, otp: otp.trim() })
      setVerified(true)
    } catch (e) { setErr(errMsg(e, 'OTP verification failed')) } finally { setBusy(false) }
  }
  const finish = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verified) { setErr('Verify the email OTP first'); return }
    if (form.newSchool && !form.schoolName.trim()) { setErr('Enter your school name'); return }
    if (!form.newSchool && !form.schoolCode.trim()) { setErr('Choose your school or enter its school code'); return }
    save({
      name: form.name.trim(),
      className: form.className,
      schoolCode: form.newSchool ? 'NEW' : form.schoolCode.trim(),
      schoolName: form.schoolName.trim() || undefined,
      whatsapp: form.whatsapp.trim(),
      phoneCountryCode: form.phoneCountryCode,
      email: form.email.trim() || undefined,
    })
    nav('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="card p-6 sm:p-8">
        <span className="accent-bg badge">student register</span>
        <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Join your school store</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">A few details connect your account with the right school store.</p>
        {err && <div className="mt-4"><Alert>{err}</Alert></div>}
        <form onSubmit={finish} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Aarav Patel" className="field outline-none" /></Field>
            <Field label="Class">
              <select value={form.className} onChange={(e) => set('className', e.target.value)} className="field outline-none">
                {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={form.newSchool}
              onChange={(e) => {
                set('newSchool', e.target.checked)
                set('schoolCode', '')
                set('schoolName', '')
                setSchoolSearch('')
              }}
              className="h-4 w-4"
            />
            I can’t find my school in the directory
          </label>
          {form.newSchool && (
            <>
              <Field label="School name">
                <input required value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} placeholder="Sunrise Public School" className="field outline-none" />
              </Field>
              <p className="text-xs text-[var(--text-muted)]">
                We’ll keep this school name with your student profile so the school team can help link it.
              </p>
            </>
          )}
          {!form.newSchool && (
            <div className="space-y-4 rounded-xl bg-[var(--surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">Find your school</p>
              <LocationFields value={location} onChange={setLocation} />
              <SchoolDirectoryPicker
                location={location}
                search={schoolSearch}
                onSearch={setSchoolSearch}
                selectedCode={form.schoolCode}
                onSelect={(school) => setForm((current) => ({
                  ...current,
                  schoolCode: school?.school_code || '',
                  schoolName: school?.name || '',
                }))}
              />
              <Field label="School code" hint="If your school shared a code, you can enter it here.">
                <input value={form.schoolCode} onChange={(e) => set('schoolCode', e.target.value)} placeholder="e.g. SCH001" className="field outline-none" />
              </Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <PhoneNumberField
              label="WhatsApp"
              countryCode={form.phoneCountryCode}
              phone={form.whatsapp}
              onChange={(phoneCountryCode, whatsapp) => setForm((current) => ({ ...current, phoneCountryCode, whatsapp }))}
            />
            <Field label="Password"><input required minLength={6} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" className="field outline-none" /></Field>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-4">
            <Field label="Email for OTP">
              <div className="flex gap-2">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" className="field outline-none" />
                <button type="button" onClick={sendOtp} disabled={busy || (!form.email.trim() && !form.whatsapp.trim())} className="btn btn-secondary shrink-0">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send OTP
                </button>
              </div>
            </Field>
            {otpId !== null && (
              <div className="mt-3 flex gap-2">
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} className="field outline-none" />
                <button type="button" onClick={verify} disabled={busy || verified} className="btn btn-primary shrink-0">
                  {verified ? <><CheckCircle2 className="h-4 w-4" /> Verified</> : 'Verify'}
                </button>
              </div>
            )}
            {otpInfo && <p className="mt-2 text-xs text-[var(--text-muted)]">{otpInfo}</p>}
          </div>
          <button className="btn btn-primary w-full !py-3">Create account{verified ? ' ✓' : ''}</button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">Already registered? <Link to="/login" className="accent-text font-semibold hover:underline">Sign in</Link></p>
      </div>
    </div>
  )
}

