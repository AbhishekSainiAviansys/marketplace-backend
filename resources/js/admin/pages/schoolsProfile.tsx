/** Admin -> Schools profile view (part 2b). */
import { Building2, MapPin } from 'lucide-react'
import { fmtDate, type LocNames, type SchoolRow, type SchoolProfile } from './schoolsTypes'

export function SchoolProfileView({ profile, locNames }: { profile: SchoolRow & { school: SchoolProfile }; locNames: LocNames | null }) {
  return (
    <div className="space-y-4">
      <SchoolOnboardingDetails data={profile.school?.onboarding} />
      {(locNames?.country_name || locNames?.state_name || locNames?.district_name) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {[locNames.country_name, locNames.state_name, locNames.district_name].filter(Boolean).join(' · ')}
        </p>
      )}
      {profile.school?.review_notes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="block font-bold">Review notes ({fmtDate(profile.school.reviewed_at)})</span>
          {profile.school.review_notes}
        </div>
      )}
      <section>
        <h3 className="text-sm font-bold text-slate-900">Linked vendors ({profile.school?.vendors?.length ?? 0})</h3>
        {(profile.school?.vendors ?? []).length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">No vendor pickup links yet — assign them from the Vendors screen.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {(profile.school?.vendors ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{s.shop_name}</span>
                <span className="text-xs text-slate-500">{s.pivot?.royalty_percent ?? 0}% royalty</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SchoolOnboardingDetails({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <Building2 className="mr-1 inline h-4 w-4" />
        No application submitted yet — this school only registered and never filled the onboarding wizard.
      </p>
    )
  }
  const sec = (key: string) => (data[key] as Record<string, unknown> | undefined) ?? null
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null)
  const inst = sec('institution')
  const contact = sec('contact')
  const groups: { title: string; fields: [string, string | null][] }[] = [
    { title: 'Institution', fields: [['Name', txt(inst?.name)], ['Type', txt(inst?.type)], ['Board', txt(inst?.board)], ['Registration no.', txt(inst?.registration_number)], ['Address', txt(inst?.address)], ['Pincode', txt(inst?.pincode)]] },
    { title: 'Contact', fields: [['Person', txt(contact?.person_name)], ['Designation', txt(contact?.designation)], ['Phone', txt(contact?.contact_phone)], ['Email', txt(contact?.contact_email)]] },
  ]
  const classes = Array.isArray(data.classes) ? data.classes.filter((c): c is string => typeof c === 'string') : []
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
      {classes.length > 0 && (
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Classes</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {classes.map((c) => (
              <span key={c} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{c}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
