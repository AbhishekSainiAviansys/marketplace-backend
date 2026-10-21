import { useEffect, useState } from 'react'
import { api, errMsg, rowsOf } from '@lib/api'

export type LocationFilter = { countryId: string; stateId: string; districtId: string }

export const EMPTY_LOCATION_FILTER: LocationFilter = { countryId: '', stateId: '', districtId: '' }

type Country = { id: number; name: string }
type State = { id: string; name: string }
type District = { id: number; name: string }

export const hasLocationFilter = (f: LocationFilter) =>
  f.countryId !== '' || f.stateId !== '' || f.districtId !== ''

/** Cascading country → state → district dropdowns for the admin list
 *  screens. Same public endpoints + India-first default as the
 *  registration wizards' LocationFields; compact one-line layout. */
export function LocationFilters({ value, onChange }: {
  value: LocationFilter; onChange: (v: LocationFilter) => void
}) {
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.get('/locations/countries', { params: { limit: 250 } })
      .then((r) => { if (alive) setCountries(rowsOf<Country>(r.data)) })
      .catch((e: unknown) => { if (alive) setError(errMsg(e, 'Could not load countries')) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!value.countryId) { setStates([]); return }
    let alive = true
    setLoadingStates(true)
    api.get('/locations/states', { params: { country_id: value.countryId } })
      .then((r) => { if (alive) setStates(rowsOf<State>(r.data)) })
      .catch((e: unknown) => { if (alive) setError(errMsg(e, 'Could not load states')) })
      .finally(() => { if (alive) setLoadingStates(false) })
    return () => { alive = false }
  }, [value.countryId])

  useEffect(() => {
    if (!value.stateId) { setDistricts([]); return }
    let alive = true
    setLoadingDistricts(true)
    api.get('/locations/districts', { params: { state_id: value.stateId } })
      .then((r) => { if (alive) setDistricts(rowsOf<District>(r.data)) })
      .catch((e: unknown) => { if (alive) setError(errMsg(e, 'Could not load districts')) })
      .finally(() => { if (alive) setLoadingDistricts(false) })
    return () => { alive = false }
  }, [value.stateId])

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="Filter by country" className="field !py-2 !text-sm"
          value={value.countryId}
          onChange={(e) => onChange({ countryId: e.target.value, stateId: '', districtId: '' })}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select aria-label="Filter by state" className="field !py-2 !text-sm"
          disabled={!value.countryId || loadingStates} value={value.stateId}
          onChange={(e) => onChange({ ...value, stateId: e.target.value, districtId: '' })}>
          <option value="">{loadingStates ? 'Loading states…' : 'All states'}</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select aria-label="Filter by district" className="field !py-2 !text-sm"
          disabled={!value.stateId || loadingDistricts} value={value.districtId}
          onChange={(e) => onChange({ ...value, districtId: e.target.value })}>
          <option value="">{loadingDistricts ? 'Loading districts…' : 'All districts'}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      {error && <p className="field-hint text-[var(--color-danger-600)]">{error}</p>}
    </div>
  )
}
