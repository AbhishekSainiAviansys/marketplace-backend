import { useEffect, useState } from 'react'
import { api } from '@lib/api'

// Reusable mobile input with country-code dropdown (uses /locations/phonecodes)
export function PhoneInput({ code, phone, onChange }: { code: string; phone: string; onChange: (code: string, phone: string) => void }) {
  const [codes, setCodes] = useState<any[]>([{ country_id: 105, country_name: 'India', dial_code: '+91' }])
  useEffect(() => { api.get('/locations/phonecodes').then((r) => setCodes(r.data)).catch(() => {}) }, [])
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select value={code} onChange={(e) => onChange(e.target.value, phone)} style={{ padding: 8 }}>
        {codes.map((c) => <option key={c.country_id} value={c.dial_code}>{c.country_name} {c.dial_code}</option>)}
      </select>
      <input placeholder="Mobile number" value={phone} onChange={(e) => onChange(code, e.target.value)} style={{ padding: 8, flex: 1 }} />
    </div>
  )
}
