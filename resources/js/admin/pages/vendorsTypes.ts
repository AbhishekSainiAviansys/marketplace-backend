/** Shared types + constants for the admin Vendors screen. */
export type Status = 'draft' | 'submitted' | 'approved' | 'rejected'

/**
 * Flat row used by the list + profile views.
 *
 * The API returns the *User* owning the seller with a nested `vendor`
 * relation (AdminController::index / ::show), so `fromApiUser` flattens it
 * into this shape once — the table and profile components never deal with
 * the nested payload.
 */
export type VendorRow = {
  id: number
  shop_name: string
  owner_name: string
  email: string | null
  whatsapp: string | null
  onboarding_status: Status
  review_notes: string | null
  products_count: number
  created_at: string
  submitted_at: string | null
}

/** A linked school (vendor -> school pivot carries the royalty). */
export type VendorSchool = {
  id: number
  name: string
  school_code: string | null
  pivot?: { royalty_percent?: number | string; is_active?: number | boolean } | null
}

/** A product the seller has listed. */
export type VendorProduct = {
  id: number
  name: string
  sku: string | null
  price: number | string | null
  stock: number | string | null
  is_active?: boolean
  category?: { id: number; name: string } | null
}

/** Full profile payload shown in the "View profile" modal. */
export type VendorProfile = VendorRow & {
  onboarding: Record<string, unknown> | null
  submitted_at: string | null
  reviewed_at: string | null
  gst: string | null
  address: string | null
  products: VendorProduct[]
  schools: VendorSchool[]
}

export type VendorStats = {
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

/* ---------------------------------------------------------------------------
 * API -> view normalisation.
 *
 * AdminController::index / ::show return the User row with a nested `vendor`
 * relation. These helpers flatten that once so the table and the profile
 * modal can work with a single, predictable shape.
 * ----------------------------------------------------------------------- */

/** Raw vendor record as embedded in the API payload (User -> vendor). */
export type ApiVendor = {
  id?: number
  shop_name?: string | null
  gst?: string | null
  address?: string | null
  onboarding?: Record<string, unknown> | null
  onboarding_status?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  products_count?: number | null
  products?: VendorProduct[] | null
  schools?: VendorSchool[] | null
}

/** Raw user record as returned by /admin/vendors (the vendor sits inside). */
export type ApiUser = {
  id?: number
  name?: string | null
  email?: string | null
  whatsapp?: string | null
  phone_e164?: string | null
  created_at?: string | null
  is_active?: boolean | number | null
  products_count?: number | null
  vendor?: ApiVendor | null
}

/** Coerce an unknown status string into the known set (defaults to draft). */
const toStatus = (v: unknown): Status =>
  (['draft', 'submitted', 'approved', 'rejected'] as const).includes(v as Status) ? (v as Status) : 'draft'

const str = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() ? v : null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

/** Flatten one API user (with its nested vendor) into a VendorRow. */
export const fromApiUser = (u: ApiUser): VendorRow => {
  const v = u.vendor ?? {}
  return {
    id: u.id ?? v.id ?? 0,
    shop_name: v.shop_name ?? u.name ?? '—',
    owner_name: u.name ?? '—',
    email: str(u.email),
    whatsapp: str(u.whatsapp) ?? str(u.phone_e164),
    onboarding_status: toStatus(v.onboarding_status),
    review_notes: str(v.review_notes),
    products_count: Number(v.products_count ?? u.products_count ?? 0) || 0,
    created_at: u.created_at ?? '',
    submitted_at: str(v.submitted_at),
  }
}

/** Flatten the detailed payload (AdminController::show) into a VendorProfile. */
export const fromApiProfile = (u: ApiUser): VendorProfile => {
  const v = u.vendor ?? {}
  const row = fromApiUser(u)
  return {
    ...row,
    onboarding: (v.onboarding as Record<string, unknown> | null | undefined) ?? null,
    submitted_at: str(v.submitted_at),
    reviewed_at: str(v.reviewed_at),
    gst: str(v.gst),
    address: str(v.address),
    products: Array.isArray(v.products) ? v.products : [],
    schools: Array.isArray(v.schools) ? v.schools : [],
  }
}

/** Extract country/state/district from a vendor's onboarding JSON.
 *  Keys mirror the backend `onboarding->business` payload.
 */
export const locOf = (data: Record<string, unknown> | null) => {
  const inst = (data?.business ?? {}) as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v) : ''
  return { country: s(inst.country_id), state: s(inst.state_id), district: s(inst.district_id) }
}
