/**
 * Vendor profile page.
 * GET /auth/me returns the user with the vendor relationship loaded:
 *   user.name, user.email, user.whatsapp, user.phone_country_code
 *   vendor.shop_name, vendor.gst, vendor.address, vendor.onboarding_status
 *   vendor.onboarding (JSON: business / tax / bank / kyc / categories / agreement)
 */
import { useEffect, useState } from 'react'
import { api, errMsg } from '@lib/api'
import { Alert, EmptyState, PageHeader, Panel } from '@ui'

type Onboarding = {
  business?: { legal_name?: string; business_type?: string; address?: string; gstin?: string }
  tax?: { pan?: string; gstin?: string }
  bank?: { account_number?: string; ifsc?: string; holder_name?: string }
  kyc?: { signatory_name?: string; contact_phone?: string }
  categories?: string[]
  agreement?: string | boolean
}

type VendorProfile = {
  id: number
  user_id: number
  shop_name?: string | null
  gst?: string | null
  address?: string | null
  onboarding_status?: string | null
  onboarding?: Onboarding | null
  submitted_at?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
}

type MeResponse = {
  id: number
  name: string
  email?: string | null
  whatsapp?: string | null
  phone_country_code?: string | null
  role: string
  vendor?: VendorProfile | null
}

export function Profile() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    void (async () => {
      try {
        const { data } = await api.get<MeResponse>('/auth/me')
        if (!alive) return
        setMe(data)
      } catch (e) {
        if (!alive) return
        setErr(errMsg(e, 'Could not load profile'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const v = me?.vendor
  const onboarding = v?.onboarding ?? ({} as Onboarding)
  const status = v?.onboarding_status ?? 'not_started'

  const complete =
    !!onboarding.business?.legal_name &&
    !!onboarding.business?.business_type &&
    !!onboarding.business?.address &&
    !!onboarding.tax?.pan &&
    !!onboarding.bank?.account_number &&
    !!onboarding.bank?.ifsc &&
    !!onboarding.bank?.holder_name &&
    !!onboarding.kyc?.signatory_name &&
    !!onboarding.kyc?.contact_phone &&
    Array.isArray(onboarding.categories) && onboarding.categories.length > 0 &&
    onboarding.agreement === 'accepted' || onboarding.agreement === true

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="My profile" subtitle="Your shop and onboarding details" />
        <div className="space-y-3 p-5">
          <div className="h-10 w-48 bg-[var(--surface-3)] rounded" />
          <div className="h-10 w-64 bg-[var(--surface-3)] rounded" />
        </div>
      </div>
    )
  }

  if (err) return <Alert>{err}</Alert>

  const contact = me?.whatsapp ? `${me.phone_country_code ?? '+91'} ${me.whatsapp}` : '—'

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="My profile" subtitle="Shop and verification details" />
      {err && <Alert>{err}</Alert>}
      <Panel title="Shop & contact">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Shop name</p>
            <p className="text-lg font-semibold text-[var(--text)]">{v?.shop_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Contact (WhatsApp)</p>
            <p className="text-lg font-semibold text-[var(--text)]">{contact}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">GST number</p>
            <p className="text-lg font-semibold text-[var(--text)]">{v?.gst ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Onboarding status</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              {status.replace(/_/g, ' ')}
            </span>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Submitted at</p>
            <p className="text-lg font-semibold text-[var(--text)]">{v?.submitted_at ?? '—'}</p>
          </div>
        </div>
      </Panel>

      {/* Onboarding details */}
      <Panel title="Onboarding details">
        {v?.onboarding_status === 'approved' ? (
          <div className="flex items-center gap-3 p-4 bg-[var(--color-success-50)] rounded-lg border border-[var(--color-success-200)]">
            <span className="text-[var(--color-success-700)] font-semibold">✔ Approved</span>
            <span className="text-sm text-[var(--text-muted)]">
              Your shop is approved and you can add products.
            </span>
          </div>
        ) : v?.onboarding_status === 'rejected' ? (
          <div className="p-4 bg-[var(--color-danger-50)] rounded-lg border border-[var(--color-danger-200)]">
            <p className="text-sm text-[var(--color-danger-700)] font-semibold">
              Application needs changes
            </p>
            {v?.review_notes && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{v.review_notes}</p>
            )}
          </div>
        ) : v?.onboarding_status === 'submitted' ? (
          <div className="p-4 bg-[var(--color-warning-50)] rounded-lg border border-[var(--color-warning-200)]">
            <p className="text-sm text-[var(--color-warning-700)] font-semibold">
              Application under review
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              We will notify you once an admin approves your shop.
            </p>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No onboarding data yet. Complete your profile to start selling.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldRow label="Business legal name" value={onboarding.business?.legal_name ?? '—'} />
          <FieldRow label="Business type" value={onboarding.business?.business_type ?? '—'} />
          <FieldRow label="Business address" value={onboarding.business?.address ?? '—'} />
          <FieldRow label="PAN" value={onboarding.tax?.pan ?? '—'} />
          <FieldRow label="GSTIN" value={onboarding.tax?.gstin ?? v?.gst ?? '—'} />
          <FieldRow label="Bank account" value={onboarding.bank?.account_number ?? '—'} />
          <FieldRow label="IFSC" value={onboarding.bank?.ifsc ?? '—'} />
          <FieldRow label="Account holder" value={onboarding.bank?.holder_name ?? '—'} />
          <FieldRow label="KYC signatory" value={onboarding.kyc?.signatory_name ?? '—'} />
          <FieldRow label="KYC contact phone" value={onboarding.kyc?.contact_phone ?? '—'} />
          <FieldRow
            label="Categories"
            value={
              Array.isArray(onboarding.categories) && onboarding.categories.length
                ? onboarding.categories.join(', ')
                : '—'
            }
          />
          <FieldRow
            label="Agreement"
            value={onboarding.agreement === 'accepted' || onboarding.agreement === true ? 'Accepted' : '—'}
          />
        </div>

        {!complete && !v?.onboarding_status && (
          <div className="mt-6 p-4 bg-[var(--color-warning-50)] rounded-lg border border-[var(--color-warning-200)]">
            <p className="text-sm text-[var(--color-warning-700)] font-semibold">
              Profile incomplete
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Fill in all onboarding details (business, tax, bank, KYC, categories, agreement)
              before you can add products.
            </p>
          </div>
        )}
      </Panel>

      {complete && v?.onboarding_status !== 'approved' && (
        <EmptyState
          title="Pending approval"
          hint="Your profile is complete but awaiting admin approval. You will be able to add products once approved."
        />
      )}
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[var(--text)] truncate">{value}</p>
    </div>
  )
}