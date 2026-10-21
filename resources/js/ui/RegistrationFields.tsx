import { useEffect, useState } from 'react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Field } from './ui'

type PhoneCode = { country_id: number; country_name: string; dial_code: string }
type Country = { id: number; name: string }
type State = { id: string; name: string }
type District = { id: number; name: string }

export type SchoolDirectoryEntry = {
  id: number
  name: string
  school_code: string
  city?: string | null
  district?: string | null
}

export type LocationValue = {
  countryId: string
  stateId: string
  districtId: string
}

export function PhoneNumberField({
  label,
  countryCode,
  phone,
  onChange,
  required = true,
}: {
  label: string
  countryCode: string
  phone: string
  onChange: (countryCode: string, phone: string) => void
  required?: boolean
}) {
  const [codes, setCodes] = useState<PhoneCode[]>([
    { country_id: 105, country_name: 'India', dial_code: '+91' },
  ])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let alive = true
    api.get('/locations/phonecodes')
      .then((response) => {
        if (!alive) return
        const rows = rowsOf<PhoneCode>(response.data)
        if (rows.length > 0) setCodes(rows)
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(errMsg(error, 'Could not load country calling codes'))
      })
    return () => { alive = false }
  }, [])

  return (
    <Field label={label} hint={loadError || undefined}>
      <div className="grid grid-cols-[minmax(7.5rem,0.42fr)_1fr] gap-2">
        <select
          aria-label={`${label} country calling code`}
          autoComplete="tel-country-code"
          className="field min-w-0"
          value={countryCode}
          onChange={(event) => onChange(event.target.value, phone)}
        >
          {codes.map((item) => (
            <option key={item.country_id} value={item.dial_code}>
              {item.country_name} {item.dial_code}
            </option>
          ))}
        </select>
        <input
          aria-label={label}
          autoComplete="tel-national"
          className="field min-w-0 outline-none"
          inputMode="tel"
          maxLength={20}
          pattern="[0-9()+. -]{7,20}"
          placeholder="Mobile number"
          required={required}
          type="tel"
          value={phone}
          onChange={(event) => onChange(countryCode, event.target.value)}
        />
      </div>
    </Field>
  )
}

export function SchoolDirectoryPicker({
  location,
  search,
  onSearch,
  selectedCode,
  onSelect,
}: {
  location: LocationValue
  search: string
  onSearch: (value: string) => void
  selectedCode: string
  onSelect: (school: SchoolDirectoryEntry | null) => void
}) {
  const [schools, setSchools] = useState<SchoolDirectoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = search.trim()
    if (term.length < 2 && !location.districtId) {
      setSchools([])
      setError('')
      return
    }
    let alive = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      api.get('/locations/schools', {
        params: {
          q: term || undefined,
          country_id: location.countryId || undefined,
          state_id: location.stateId || undefined,
          district_id: location.districtId || undefined,
          limit: 100,
        },
      })
        .then((response) => {
          if (alive) setSchools(rowsOf<SchoolDirectoryEntry>(response.data))
        })
        .catch((cause: unknown) => {
          if (alive) setError(errMsg(cause, 'Could not load the school directory'))
        })
        .finally(() => alive && setLoading(false))
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [location.countryId, location.districtId, location.stateId, search])

  return (
    <div className="space-y-3">
      <Field label="Search by school name or code">
        <input
          className="field outline-none"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Type at least 2 characters, or choose a district"
        />
      </Field>
      {loading && <p className="text-xs text-[var(--text-muted)]">Searching school directory…</p>}
      {error && <p role="alert" className="text-xs text-[var(--color-danger-600)]">{error}</p>}
      {schools.length > 0 && (
        <Field label="Matching schools">
          <select
            className="field outline-none"
            value={selectedCode}
            onChange={(event) => {
              onSelect(schools.find((school) => school.school_code === event.target.value) || null)
            }}
          >
            <option value="">Select your school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.school_code}>
                {school.name}{school.city || school.district ? ` — ${[school.city, school.district].filter(Boolean).join(', ')}` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  )
}
export function LocationFields({
  value,
  onChange,
}: {
  value: LocationValue
  onChange: (value: LocationValue) => void
}) {
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [error, setError] = useState('')
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/locations/countries', { params: { limit: 250 } })
      .then((response) => {
        if (alive) setCountries(rowsOf<Country>(response.data))
      })
      .catch((cause: unknown) => {
        if (alive) setError(errMsg(cause, 'Could not load countries'))
      })
      .finally(() => alive && setLoadingCountries(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!value.countryId) {
      setStates([])
      return
    }
    let alive = true
    setLoadingStates(true)
    api.get('/locations/states', { params: { country_id: value.countryId } })
      .then((response) => {
        if (alive) setStates(rowsOf<State>(response.data))
      })
      .catch((cause: unknown) => {
        if (alive) setError(errMsg(cause, 'Could not load states'))
      })
      .finally(() => alive && setLoadingStates(false))
    return () => { alive = false }
  }, [value.countryId])

  useEffect(() => {
    if (!value.stateId) {
      setDistricts([])
      return
    }
    let alive = true
    setLoadingDistricts(true)
    api.get('/locations/districts', { params: { state_id: value.stateId } })
      .then((response) => {
        if (alive) setDistricts(rowsOf<District>(response.data))
      })
      .catch((cause: unknown) => {
        if (alive) setError(errMsg(cause, 'Could not load districts'))
      })
      .finally(() => alive && setLoadingDistricts(false))
    return () => { alive = false }
  }, [value.stateId])

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Country">
          <select
            className="field"
            disabled={loadingCountries}
            value={value.countryId}
            onChange={(event) => onChange({
              countryId: event.target.value,
              stateId: '',
              districtId: '',
            })}
          >
            <option value="">{loadingCountries ? 'Loading countries…' : 'Select country'}</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
        </Field>
        <Field label="State / province">
          <select
            className="field"
            disabled={!value.countryId || loadingStates}
            value={value.stateId}
            onChange={(event) => onChange({
              ...value,
              stateId: event.target.value,
              districtId: '',
            })}
          >
            <option value="">{loadingStates ? 'Loading states…' : 'Select state'}</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>{state.name}</option>
            ))}
          </select>
        </Field>
        <Field label="District">
          <select
            className="field"
            disabled={!value.stateId || loadingDistricts}
            value={value.districtId}
            onChange={(event) => onChange({ ...value, districtId: event.target.value })}
          >
            <option value="">{loadingDistricts ? 'Loading districts…' : 'Select district'}</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>{district.name}</option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p className="field-hint text-[var(--color-danger-600)]">{error}</p>}
    </div>
  )
}
