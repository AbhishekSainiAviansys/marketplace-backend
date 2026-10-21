/** Shared types + constants for the admin Schools directory screen (school_new). */
export type Status = 'Active' | 'Inactive' | 'Deleted'
export type SchoolProfile = {
  id: number; school_code: string; school_name: string
  school_status: Status
  school_email: string | null; school_phone: string | null
  city: string | null; district: string | null; state: string | null
  country: string | null; country_name: string | null
  principal: string | null; coordinator: string | null
  board_medium: string | null; onboarding: Record<string, unknown> | null
  reviewed_at: string | null; review_notes: string | null
  vendors?: { id: number; shop_name: string; pivot?: { royalty_percent?: number | string } }[]
}
export type SchoolRow = {
  id: number; name: string; school_code: string | null
  email: string | null; whatsapp: string | null
  city: string | null; district: string | null; state: string | null
  country: string | null; country_name: string | null
  school_status: Status
  created_at: string
  // school_new directory fields (present on every directory row)
  school_name?: string | null
  school_email?: string | null
  school_mobile?: string | null
  school_phone?: string | null
  school_address?: string | null
  school_principal_name?: string | null
  principal_titile?: string | null
  school_coordinator_name?: string | null
  coordinator_titile?: string | null
  school_coordinator_email?: string | null
  coordinator_phone?: string | null
  school_board?: string | null
  school_medium?: string | null
  status_new?: string | null
  franchise_id?: number | null
  zoomstatus?: string | null
}
export type Stats = { total: number; active: number; inactive: number; deleted: number }
export type LocNames = { country_name: string | null; state_name: string | null; district_name: string | null }
export const TABS: { key: Status; label: string }[] = [
  { key: 'Active', label: 'Active' }, { key: 'Inactive', label: 'Inactive' }, { key: 'Deleted', label: 'Deleted' }
]
export const STATUS_BADGE: Record<Status, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-amber-100 text-amber-700',
  Deleted: 'bg-red-100 text-red-700',
}
export const STATUS_LABEL: Record<Status, string> = {
  Active: 'Active', Inactive: 'Inactive', Deleted: 'Deleted',
}
export const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const locOf = (data: Record<string, unknown> | null) => {
  const s = (v: unknown) => (typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v) : ''
  return { country: s(data?.country), state: s(data?.state), district: s(data?.district) }
}