/** Shared types for the admin Students screen. */
export type StudentRow = {
  id: number
  name: string
  email: string | null
  whatsapp: string | null
  phone_country_code: string | null
  phone_e164: string | null
  is_active: boolean
  created_at: string
  orders_count?: number
}

export type StudentAddress = {
  id: number
  label?: string | null
  name?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  pincode?: string | null
  phone?: string | null
}

export type StudentOrderItem = {
  name?: string
  product_name?: string
  qty?: number
  quantity?: number
  price?: number
  unit_price?: number
}

export type StudentOrder = {
  id: number
  order_code: string
  items: StudentOrderItem[] | string
  total: number | string
  pay_mode: string | null
  delivery: string | null
  address: string | null
  status: string
  placed_at: string | null
  created_at: string
}

export type StudentProfile = StudentRow & {
  addresses: StudentAddress[]
  orders: StudentOrder[]
}

export const fromApiUser = (u: any): StudentRow => ({
  id: Number(u.id),
  name: u.name ?? '',
  email: u.email ?? null,
  whatsapp: u.whatsapp ?? null,
  phone_country_code: u.phone_country_code ?? null,
  phone_e164: u.phone_e164 ?? null,
  is_active: Boolean(u.is_active),
  created_at: u.created_at ?? '',
  orders_count: u.orders_count ?? (Array.isArray(u.orders) ? u.orders.length : 0),
})

export const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtMoney = (v: number | string) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }) : String(v)
}
