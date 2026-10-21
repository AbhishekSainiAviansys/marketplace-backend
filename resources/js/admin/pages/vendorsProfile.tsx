/** Admin -> Vendors profile view (part 2b). */
import { Building2, MapPin } from 'lucide-react'
import { fmtDate, type LocNames, type VendorProfile } from './vendorsTypes'

export function VendorProfileView({ profile, locNames }: { profile: VendorProfile; locNames: LocNames | null }) {
  return (
    <div className="space-y-4">
      <VendorOnboardingDetails data={profile.onboarding} />
      {(locNames?.country_name || locNames?.state_name || locNames?.district_name) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {[locNames.country_name, locNames.state_name, locNames.district_name].filter(Boolean).join(' · ')}
        </p>
      )}
      {profile.review_notes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="block font-bold">Review notes{profile.reviewed_at ? ` (${fmtDate(profile.reviewed_at)})` : ''}</span>
          {profile.review_notes}
        </div>
      )}
      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-900">Linked products ({profile.products.length})</h3>
        {profile.products.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">No products listed yet — approved sellers can list from the vendor panel.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {profile.products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">{p.name}</span>
                  <span className="block text-xs text-slate-500">
                    {p.category?.name ? `${p.category.name} · ` : ''}{p.sku ?? 'No SKU'}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-600">
                  {p.price != null ? `₹${p.price}` : '—'} · {p.stock ?? 0} in stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-900">Linked schools ({profile.schools.length})</h3>
        {profile.schools.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">No school pickup links yet — assign them from the Schools screen.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {profile.schools.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">{s.name}</span>
                  {s.school_code && <span className="block text-xs text-slate-500">{s.school_code}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-600">{s.pivot?.royalty_percent ?? 0}% royalty</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function VendorOnboardingDetails({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <Building2 className="mr-1 inline h-4 w-4" />
        No application submitted yet — this seller registered but never filled the onboarding wizard.
      </p>
    )
  }
  const sec = (key: string) => (data[key] as Record<string, unknown> | undefined) ?? null
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null)
  const business = sec('business')
  const tax = sec('tax')
  const bank = sec('bank')
  const kyc = sec('kyc')
  const fulfillment = sec('fulfillment')
  const groups: { title: string; fields: [string, string | null][] }[] = [
    { title: 'Business', fields: [
      ['Legal name', txt(business?.legal_name)],
      ['Business type', txt(business?.business_type)],
      ['Registration no.', txt(business?.registration_number)],
      ['Website', txt(business?.website)],
      ['Address', txt(business?.address)],
      ['Pincode', txt(business?.pincode)],
    ] },
    { title: 'Tax details', fields: [
      ['PAN', txt(tax?.pan)],
      ['GSTIN', txt(tax?.gstin)],
      ['TAN', txt(tax?.tan)],
      ['CIN', txt(tax?.cin)],
    ] },
    { title: 'Bank account', fields: [
      ['Account holder', txt(bank?.holder_name)],
      ['Bank name', txt(bank?.bank_name)],
      ['Account no.', txt(bank?.account_number)],
      ['IFSC', txt(bank?.ifsc)],
      ['Branch', txt(bank?.branch)],
    ] },
    { title: 'Contact person', fields: [
      ['Signatory', txt(kyc?.signatory_name)],
      ['Designation', txt(kyc?.designation)],
      ['Phone', txt(kyc?.contact_phone)],
      ['Email', txt(kyc?.contact_email)],
    ] },
    { title: 'Fulfilment', fields: [
      ['Mode', txt(fulfillment?.mode)],
      ['Service regions', txt(fulfillment?.service_regions)],
      ['Return policy', txt(fulfillment?.return_policy)],
    ] },
  ]
  const categories = Array.isArray(data.categories) ? data.categories.filter((c): c is string => typeof c === 'string') : []
  const brands = txt(data.brands)
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const shown = g.fields.filter(([, v]) => v)
        if (shown.length === 0) return null
        return (
          <section key={g.title} className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">{g.title}</h3>
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {shown.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="truncate font-medium text-slate-800" title={value ?? ''}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
      {(categories.length > 0 || brands) && (
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Products &amp; brands</h3>
          {brands && <p className="mt-1 text-sm text-slate-600">Brands: {brands}</p>}
          {categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span key={c} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{c}</span>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
