/** Admin -> Schools profile view (part 2b). */
import { Building2, MapPin, Lock } from 'lucide-react'
import { STATUS_BADGE, STATUS_LABEL, type LocNames, type SchoolProfile, type SchoolRow } from './schoolsTypes'

export function SchoolProfileView({ profile, locNames }: { profile: (SchoolRow & SchoolProfile); locNames: LocNames | null }) {
  const statusClass = STATUS_BADGE[profile.school_status] ?? STATUS_BADGE['Deleted']
  const statusLabel = STATUS_LABEL[profile.school_status] ?? profile.school_status ?? 'Unknown'
  const principal = [profile.principal_titile, profile.school_principal_name].filter(Boolean).join(' ').trim() || '—'
  const coordinator = [profile.coordinator_titile, profile.school_coordinator_name].filter(Boolean).join(' ').trim() || '—'
  const boardMedium = [profile.school_board, profile.school_medium].filter(Boolean).join(' / ').trim() || '—'
  const email = profile.school_email ?? profile.email ?? null
  const phone = profile.school_mobile ?? profile.school_phone ?? profile.whatsapp ?? null
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-900">School Information</h3>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div className="font-medium text-slate-700">School Name</div>
          <dd className="truncate font-medium text-slate-800" title={profile.school_name ?? undefined}>{profile.school_name}</dd>
          <div className="font-medium text-slate-700">School Code</div>
          <dd className="truncate font-medium text-slate-800" title={profile.school_code ?? undefined}>{profile.school_code}</dd>
          <div className="font-medium text-slate-700">Status</div>
          <dd className={`text-sm font-medium ${statusClass}`}>{statusLabel}</dd>
          <div className="font-medium text-slate-700">Principal</div>
          <dd className="truncate font-medium text-slate-800" title={principal}>{principal}</dd>
          <div className="font-medium text-slate-700">Coordinator</div>
          <dd className="truncate font-medium text-slate-800" title={coordinator}>{coordinator}</dd>
          <div className="font-medium text-slate-700">Board / Medium</div>
          <dd className="truncate font-medium text-slate-800" title={boardMedium}>{boardMedium}</dd>
          <div className="font-medium text-slate-700">City</div>
          <dd className="truncate font-medium text-slate-800" title={profile.city ?? ''}>{profile.city ?? '—'}</dd>
          <div className="font-medium text-slate-700">District</div>
          <dd className="truncate font-medium text-slate-800" title={profile.district ?? ''}>{profile.district ?? '—'}</dd>
          <div className="font-medium text-slate-700">State</div>
          <dd className="truncate font-medium text-slate-800" title={profile.state ?? ''}>{profile.state ?? '—'}</dd>
          <div className="font-medium text-slate-700">Country</div>
          <dd className="truncate font-medium text-slate-800" title={profile.country_name ?? profile.country ?? ''}>{profile.country_name ?? profile.country ?? '—'}</dd>
          <div className="font-medium text-slate-700">Address</div>
          <dd className="truncate font-medium text-slate-800" title={profile.school_address ?? ''}>{profile.school_address ?? '—'}</dd>
        </dl>
      </div>
      {(locNames?.country_name || locNames?.state_name || locNames?.district_name) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> {[locNames.country_name, locNames.state_name, locNames.district_name].filter(Boolean).join(' · ')}
        </p>
      )}
      {email && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5" /> {email}
        </p>
      )}
      {phone && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> {phone}
        </p>
      )}
      <section>
        {(profile.vendors ?? []).length === 0 && (
          <p className="mt-1 text-xs text-amber-600">Not onboarded yet — no onboarding record or vendors linked for this directory entry.</p>
        )}
        <h3 className="text-sm font-bold text-slate-900">Linked vendors ({profile.vendors?.length ?? 0})</h3>
        {(profile.vendors ?? []).length === 0 && (
          <p className="mt-1 text-xs text-slate-400">No vendor pickup links yet — assign them from the Vendors screen.</p>
        )}
        {(profile.vendors ?? []).length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {(profile.vendors ?? []).map((s) => (
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