import { useEffect, useState } from 'react'
import { api } from '@lib/api'
import { PhoneNumberField } from '../../ui/RegistrationFields'

export function AddressForm({ initial = null, onSaved, onCancel }: { initial?: any; onSaved?: (id?: number) => void; onCancel?: () => void }) {
  const [countries, setCountries] = useState<any[]>([])
  const [states, setStates] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [f, setF] = useState<any>(() => ({
    id: initial?.id,
    label: initial?.label ?? 'home',
    line1: initial?.line1 ?? '',
    line2: initial?.line2 ?? '',
    pincode: initial?.pincode ?? '',
    phone: initial?.phone ?? '',
    phone_code: initial?.phone_code ?? '+91',
    country_id: initial?.country_id ?? 105,
    state_id: initial?.state_id ?? '',
    district_id: initial?.district_id ?? '',
  }))
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setF({
      id: initial?.id,
      label: initial?.label ?? 'home',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? '',
      pincode: initial?.pincode ?? '',
      phone: initial?.phone ?? '',
      phone_code: initial?.phone_code ?? '+91',
      country_id: initial?.country_id ?? 105,
      state_id: initial?.state_id ?? '',
      district_id: initial?.district_id ?? '',
    })
    setMsg('')
  }, [initial?.id])

  useEffect(() => {
    api.get('/locations/countries?limit=250').then((r) => setCountries(r.data)).catch(() => setCountries([{ id: 105, name: 'India' }]))
  }, [])
  useEffect(() => { if (f.country_id) api.get(`/locations/states?country_id=${f.country_id}`).then((r) => setStates(r.data)).catch(() => setStates([])) }, [f.country_id])
  useEffect(() => { if (f.state_id) api.get(`/locations/districts?state_id=${f.state_id}`).then((r) => setDistricts(r.data)).catch(() => setDistricts([])) }, [f.state_id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...f }
      if (payload.state_id) payload.state_id = String(payload.state_id)
      if (payload.district_id) payload.district_id = Number(payload.district_id)
      if (payload.country_id) payload.country_id = Number(payload.country_id)
      const { data } = await api.post('/student/addresses', payload)
      setMsg('Saved')
      onSaved?.(data?.id)
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Could not save address.')
    } finally {
      setSaving(false)
    }
  }

  const sel = { padding: 8, width: '100%' }
  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 8, fontFamily: 'sans-serif', maxWidth: 480 }}>
      <h4 style={{ margin: 0 }}>{initial?.id ? 'Edit Address' : 'Add Address'}</h4>
      <input placeholder="Address line 1" value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} style={sel} required />
      <input placeholder="Locality / Area" value={f.line2 || ''} onChange={(e) => setF({ ...f, line2: e.target.value })} style={sel} />
      <select value={f.country_id || ''} onChange={(e) => setF({ ...f, country_id: Number(e.target.value), state_id: '', district_id: '' })} style={sel}>
        <option value="">Country</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.state_id || ''} onChange={(e) => setF({ ...f, state_id: e.target.value, district_id: '' })} style={sel}>
        <option value="">State</option>{states.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.district_id || ''} onChange={(e) => setF({ ...f, district_id: Number(e.target.value) })} style={sel}>
        <option value="">District</option>{districts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <PhoneNumberField
        label="Phone"
        countryCode={f.phone_code || '+91'}
        phone={f.phone || ''}
        required={false}
        onChange={(phone_code, phone) => setF({ ...f, phone_code, phone })}
      />
      <input placeholder="Pincode" value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} style={sel} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ padding: 10 }} disabled={saving}>{saving ? 'Saving...' : 'Save Address'}</button>
        {onCancel && <button type="button" style={{ padding: 10 }} onClick={onCancel}>Cancel</button>}
      </div>
      {msg && <div>{msg}</div>}
    </form>
  )
}
