export type Status = 'draft' | 'submitted' | 'approved' | 'rejected'

export type CoachingRow = {
  id: number
  name: string
  institute_type: string
  owner_name: string
  email: string | null
  whatsapp: string | null
  onboarding_status: Status
  review_notes: string | null
  created_at: string
  submitted_at: string | null
}

export type CoachingStats = {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
}

export type LocNames = { country_name: string | null; state_name: string | null; district_name: string | null }

export const TABS: { key: '' | Status; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'submitted', label: 'Pending review' },
  { key: 'draft', label: 'Drafts' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export const STATUS_BADGE: Record<Status, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
}

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft', submitted: 'Pending review', approved: 'Approved', rejected: 'Rejected',
}

export const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export type ApiCoaching = {
  id?: number
  name?: string | null
  institute_type?: string | null
  onboarding?: Record<string, unknown> | null
  onboarding_status?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  created_at?: string | null
  email?: string | null
  whatsapp?: string | null
  user?: { id?: number; name?: string | null; email?: string | null; whatsapp?: string | null; created_at?: string | null } | null
  coaching?: ApiCoaching | null
  coaching_institute?: ApiCoaching | null
  institute?: ApiCoaching | null
}

const toStatus = (v: unknown): Status =>
  (['draft', 'submitted', 'approved', 'rejected'] as const).includes(v as Status) ? (v as Status) : 'draft'

const str = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() ? v : null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

export const fromApiRow = (r: ApiCoaching): CoachingRow => {
  const nested = (r.coaching ?? r.coaching_institute ?? r.institute ?? r) as ApiCoaching
  const u = r.user ?? {}
  return {
    id: r.id ?? nested.id ?? u.id ?? 0,
    name: nested.name ?? r.name ?? u.name ?? '—',
    institute_type: nested.institute_type ?? r.institute_type ?? 'private_coaching',
    owner_name: u.name ?? r.name ?? '—',
    email: str(u.email ?? r.email),
    whatsapp: str(u.whatsapp ?? r.whatsapp),
    onboarding_status: toStatus(nested.onboarding_status ?? r.onboarding_status),
    review_notes: str(nested.review_notes ?? r.review_notes),
    created_at: (r.created_at ?? u.created_at ?? '') as string,
    submitted_at: str(nested.submitted_at ?? r.submitted_at),
  }
}