import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Users } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { useAuth } from '@lib/auth'
import { Alert, Field, Logo } from '@ui'
import { LocationFields, PhoneNumberField, type LocationValue } from '../../ui/RegistrationFields'

type RegisterResponse = {
  token: string
  user: { id: number; name: string; role: string }
}

const INSTITUTE_TYPES = [
  {
    value: 'private_coaching',
    title: 'Private coaching centre',
    sub: 'Tuition and coaching classes run from your own centre.',
  },
  {
    value: 'private_institute',
    title: 'Private tutor institute',
    sub: 'An institute operated by a team of private tutors.',
  },
  {
    value: 'private_tutor',
    title: 'Private tutor',
    sub: 'Individual tutor — home tuition or personal batches.',
  },
] as const

/**
 * /coaching/register - one-page signup for coaching centres and private tutor
 * institutes. Creates the account via POST /auth/register (role=coaching) and
 * lands on the panel profile: instant activation, no review queue.
 */
export function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [type, setType] = useState<string>('private_coaching')
  const [institute, setInstitute] = useState('')
  const [address, setAddress] = useState('')
  const [homeTuition, setHomeTuition] = useState(false)
  // Private coaching centre extras.
  const [batchSize, setBatchSize] = useState('')
  const [classrooms, setClassrooms] = useState('')
  const [coursesOffered, setCoursesOffered] = useState('')
  // Private institute extras (team of tutors, registered body).
  const [establishedYear, setEstablishedYear] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [facultyCount, setFacultyCount] = useState('')
  // Private tutor extras (individual).
  const [tutorSubjects, setTutorSubjects] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [qualification, setQualification] = useState('')
  const [feePerHour, setFeePerHour] = useState('')
  const [location, setLocation] = useState<LocationValue>({ countryId: '105', stateId: '', districtId: '' })
  const [contact, setContact] = useState({
    name: '',
    email: '',
    countryCode: '+91',
    phone: '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!location.stateId || !location.districtId) {
      setError('Choose your state and district so students can find you in the directory.')
      return
    }
    // Per-type front-end guard mirrors the API: tutor needs subjects,
    // institute needs its registration number, coaching needs an address.
    if (type === 'private_tutor' && !tutorSubjects.trim()) {
      setError('Tell students which subjects you teach (e.g. Maths, Science).')
      return
    }
    if (type === 'private_institute' && !registrationNumber.trim()) {
      setError('Registration number is required for a private institute.')
      return
    }
    if (type === 'private_coaching' && !address.trim()) {
      setError('Centre address is required for a private coaching centre.')
      return
    }
    setBusy(true)
    try {
      const response = await api.post<RegisterResponse>('/auth/register', {
        name: contact.name.trim(),
        email: contact.email.trim() || undefined,
        phone_country_code: contact.countryCode,
        whatsapp: contact.phone.replace(/\D/g, ''),
        password: contact.password,
        role: 'coaching',
        institute_name: institute.trim(),
        institute_type: type,
        address: address.trim() || undefined,
        home_tuition: type === 'private_tutor' ? homeTuition : undefined,
        country_id: Number(location.countryId),
        state_id: location.stateId,
        district_id: Number(location.districtId),
        // Only the active type's extras are sent; the API stores them in
        // onboarding.institute.details for the directory/detail pages.
        ...(type === 'private_coaching'
          ? {
              batch_size: batchSize.trim() || undefined,
              classrooms: classrooms.trim() || undefined,
              courses_offered: coursesOffered.trim() || undefined,
            }
          : {}),
        ...(type === 'private_institute'
          ? {
              established_year: establishedYear.trim() || undefined,
              registration_number: registrationNumber.trim() || undefined,
              director_name: directorName.trim() || undefined,
              faculty_count: facultyCount.trim() || undefined,
            }
          : {}),
        ...(type === 'private_tutor'
          ? {
              tutor_subjects: tutorSubjects.trim() || undefined,
              experience_years: experienceYears.trim() || undefined,
              qualification: qualification.trim() || undefined,
              fee_per_hour: feePerHour.trim() || undefined,
            }
          : {}),
      })
      login(response.data.user, response.data.token)
      navigate('/', { replace: true })
    } catch (cause: unknown) {
      setError(errMsg(cause, 'Could not create the coaching institute account'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
            Coaching sign in
          </Link>
        </div>
        <div className="card p-5 sm:p-8">
          <span className="accent-bg badge">coaching account</span>
          <h1 className="mt-3 text-2xl font-bold text-[var(--text)] sm:text-3xl">
            Register your coaching institute
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            Tell us about your coaching centre or private tutor institute. Your account activates
            immediately and your listing appears in the student directory.
          </p>
          {error && <div className="mt-5"><Alert>{error}</Alert></div>}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <section className="space-y-4 rounded-2xl bg-[var(--surface-2)] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-[var(--text)]">Institute type</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Students filter the directory by this type.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INSTITUTE_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      type === option.value
                        ? 'accent-bg text-white'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                    }`}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-subtle)]">
                {INSTITUTE_TYPES.find((option) => option.value === type)?.sub}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[var(--text)]">
                {type === 'private_tutor' ? 'Tutor details' : 'Institute details'}
              </h2>
              <div className="grid gap-4">
                <Field label={type === 'private_tutor' ? 'Your full name (as students will see it)' : 'Institute name'}>
                  <input
                    required
                    autoComplete="organization"
                    className="field"
                    value={institute}
                    onChange={(event) => setInstitute(event.target.value)}
                    placeholder={type === 'private_tutor' ? 'e.g. Rahul Sharma' : 'Sunrise Coaching Classes'}
                  />
                </Field>
                <Field
                  label="Address"
                  hint={
                    type === 'private_tutor'
                      ? 'Optional for tutors — tick home tuition below instead'
                      : 'Street address shown on your directory listing'
                  }
                >
                  <textarea
                    required={type !== 'private_tutor'}
                    rows={2}
                    className="field"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Building, street, area"
                  />
                </Field>
                {type === 'private_tutor' && (
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={homeTuition}
                      onChange={(event) => setHomeTuition(event.target.checked)}
                    />
                    I offer home tuition
                  </label>
                )}
                {type === 'private_coaching' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Batch size" hint="Optional">
                      <input className="field" value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)} placeholder="e.g. 30 students" />
                    </Field>
                    <Field label="Classrooms" hint="Optional">
                      <input className="field" value={classrooms}
                        onChange={(e) => setClassrooms(e.target.value)} placeholder="e.g. 4 rooms" />
                    </Field>
                    <Field label="Courses offered" hint="Optional">
                      <input className="field" value={coursesOffered}
                        onChange={(e) => setCoursesOffered(e.target.value)} placeholder="e.g. Class 9-12 Maths" />
                    </Field>
                  </div>
                )}
                {type === 'private_institute' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Registration number" hint="Required for institutes">
                      <input required className="field" value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. REG/2020/1234" />
                    </Field>
                    <Field label="Established year" hint="Optional">
                      <input className="field" value={establishedYear}
                        onChange={(e) => setEstablishedYear(e.target.value)} placeholder="e.g. 2015" />
                    </Field>
                    <Field label="Director name" hint="Optional">
                      <input className="field" value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)} placeholder="e.g. Priya Nair" />
                    </Field>
                    <Field label="Faculty count" hint="Optional">
                      <input className="field" value={facultyCount}
                        onChange={(e) => setFacultyCount(e.target.value)} placeholder="e.g. 12 tutors" />
                    </Field>
                  </div>
                )}
                {type === 'private_tutor' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Subjects you teach" hint="Required — comma separated">
                      <input required className="field" value={tutorSubjects}
                        onChange={(e) => setTutorSubjects(e.target.value)} placeholder="e.g. Maths, Physics" />
                    </Field>
                    <Field label="Experience" hint="Optional">
                      <input className="field" value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)} placeholder="e.g. 6 years" />
                    </Field>
                    <Field label="Qualification" hint="Optional">
                      <input className="field" value={qualification}
                        onChange={(e) => setQualification(e.target.value)} placeholder="e.g. M.Sc, B.Ed" />
                    </Field>
                    <Field label="Fee per hour" hint="Optional">
                      <input className="field" value={feePerHour}
                        onChange={(e) => setFeePerHour(e.target.value)} placeholder="e.g. Rs 500/hour" />
                    </Field>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Location</h3>
                <p className="mb-3 mt-1 text-xs text-[var(--text-muted)]">
                  Country, state and district power the directory filters.
                </p>
                <LocationFields value={location} onChange={setLocation} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[var(--text)]">Account contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact person">
                  <input
                    required
                    autoComplete="name"
                    className="field"
                    value={contact.name}
                    onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Email" hint="Optional">
                  <input
                    type="email"
                    autoComplete="email"
                    className="field"
                    value={contact.email}
                    onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                    placeholder="name@institute.edu"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PhoneNumberField
                  label="Mobile / WhatsApp"
                  countryCode={contact.countryCode}
                  phone={contact.phone}
                  onChange={(countryCode, phone) => setContact((current) => ({ ...current, countryCode, phone }))}
                />
                <Field label="Password">
                  <input
                    required
                    minLength={6}
                    type="password"
                    autoComplete="new-password"
                    className="field"
                    value={contact.password}
                    onChange={(event) => setContact((current) => ({ ...current, password: event.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
              <Link to="/login" className="btn btn-secondary">Back to sign in</Link>
              <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {busy ? 'Creating account...' : 'Create coaching account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}