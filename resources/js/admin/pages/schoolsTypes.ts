/** Shared types + constants for the admin Schools screen. */
export type Status = 'draft' | 'submitted' | 'approved' | 'rejected'
export type SchoolProfile = {
  id: number; school_code: string; name: string
  onboarding: Record<string, unknown> | null; onboarding_status: Status
  submitted_at: string | null; reviewed_at: string | null; review_notes: string | null
  vendors?: { id: number; shop_name: string; pivot?: { royalty_percent?: number | string } }[]
}
export type SchoolRow = { id: number; name: string; email: string | null; whatsapp: string | null; created_at: string; school: SchoolProfile | null }
export type Stats = { total: number; draft: number; submitted: number; approved: number; rejected: number }
export type LocNames = { country_name: string | null; state_name: string | null; district_name: string | null }
export const TABS: { key: '' | Status; label: string }[] = [
  { key: '', label: 'All' }, { key: 'submitted', label: 'Needs review' },
  { key: 'draft', label: 'Drafts' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' },
]
export const STATUS_BADGE: Record<Status, string> = {
  draft: 'bg-slate-100 text-slate-600', submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600',
}
export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft', submitted: 'Needs review', approved: 'Approved', rejected: 'Rejected',
}
export const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const locOf = (data: Record<string, unknown> | null) => {
  const inst = (data?.institution ?? {}) as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v) : ''
  return { country: s(inst.country_id), state: s(inst.state_id), district: s(inst.district_id) }
}
