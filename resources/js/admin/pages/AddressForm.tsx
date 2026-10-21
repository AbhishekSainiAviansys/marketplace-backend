import { useEffect, useState } from 'react'
import { api } from '@lib/api'

// Chain: Country(105 India default) > State(varchar id) > District > Area(Active, replaces cities)
// + country-code phone selector.
export function AddressForm({ onSaved }: { onSaved?: (id: number) => void }) {
  const [countries, setCountries] = useState<any[]>([])
  const [states, setStates] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [codes, setCodes] = useState<any[]>([])
  const [f, setF] = useState<any>({ label: 'home', line1: '', pincode: '', phone: '', phone_code: '+91', country_id: 105 })
  const [msg, setMsg] = useState('')
  useEffect(() => {
    api.get('/locations/countries?limit=250').then((r) => setCountries(r.data)).catch(() => setCountries([{ id: 105, name: 'India' }]))
    api.get('/locations/phonecodes').then((r) => setCodes(r.data)).catch(() => setCodes([{ country_id: 105, country_name: 'India', dial_code: '+91' }]))
  }, [])
  useEffect(() => { if (f.country_id) api.get(`/locations/states?country_id=${f.country_id}`).then((r) => setStates(r.data)).catch(() => setStates([])) }, [f.country_id])
  useEffect(() => { if (f.state_id) api.get(`/locations/districts?state_id=${f.state_id}`).then((r) => setDistricts(r.data)).catch(() => setDistricts([])) }, [f.state_id])
  useEffect(() => { if (f.district_id) api.get(`/locations/areas?district_id=${f.district_id}`).then((r) => setAreas(r.data)).catch(() => setAreas([])) }, [f.district_id])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data } = await api.post('/addresses', f)
    setMsg('Saved id ' + data.id); onSaved?.(data.id)
  }
  const sel = { padding: 8, width: '100%' }
  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 8, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <h4>Address – Country / State / District / Area</h4>
      <input placeholder="Line1" value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} style={sel} />
      <select value={f.country_id || ''} onChange={(e) => setF({ ...f, country_id: Number(e.target.value), state_id: '', district_id: '', area_id: '' })} style={sel}>
        <option value="">Country</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.state_id || ''} onChange={(e) => setF({ ...f, state_id: e.target.value, district_id: '', area_id: '' })} style={sel}>
        <option value="">State</option>{states.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.district_id || ''} onChange={(e) => setF({ ...f, district_id: Number(e.target.value), area_id: '' })} style={sel}>
        <option value="">District</option>{districts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.area_id || ''} onChange={(e) => setF({ ...f, area_id: Number(e.target.value) })} style={sel}>
        <option value="">Area (city_name + code)</option>{areas.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={f.phone_code} onChange={(e) => setF({ ...f, phone_code: e.target.value })} style={{ padding: 8 }}>
          {codes.map((c) => <option key={c.country_id} value={c.dial_code}>{c.country_name} {c.dial_code}</option>)}
        </select>
        <input placeholder="Mobile number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ padding: 8, flex: 1 }} />
      </div>
      <input placeholder="Pincode" value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} style={sel} />
      <button style={{ padding: 10 }}>Save Address</button>
      {msg && <div>{msg}</div>}
    </form>
  )
}
