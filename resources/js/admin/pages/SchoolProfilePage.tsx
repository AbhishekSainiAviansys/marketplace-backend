/** Admin -> School profile page (standalone page with back navigation). */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { SchoolProfileView } from './schoolsProfile'
import type { LocNames, SchoolProfile, SchoolRow } from './schoolsTypes'
import { locOf } from './schoolsTypes'

export function SchoolProfilePage() {
  const [searchParams] = useSearchParams()
  const schoolId = searchParams.get('id')
  const [profile, setProfile] = useState<SchoolRow & SchoolProfile | null>(null)
  const [locNames, setLocNames] = useState<LocNames | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!schoolId) {
      setErr('No school ID provided')
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get(`/admin/schools/${schoolId}`)
      .then((r) => {
        const full = r.data as (SchoolRow & SchoolProfile & { school?: SchoolProfile | null })
        const merged = { ...full, ...(full.school ?? {}), onboarding: full.onboarding ?? full.school?.onboarding ?? null }
        setProfile(merged as SchoolRow & SchoolProfile)
        const ids = locOf(merged.onboarding ?? merged)
        setLocNames({ country_name: ids.country, state_name: ids.state, district_name: ids.district })
      })
      .catch((e) => setErr(errMsg(e, 'Could not load school profile.')))
      .finally(() => setLoading(false))
  }, [schoolId])

  if (loading) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <p className="text-sm text-slate-500">Loading school profile…</p>
      </div>
    )
  }

  if (err || !profile) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <h2 className="text-lg font-bold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-red-600">{err || 'School not found'}</p>
        <div className="mt-6">
          <Link to="/schools" className="btn btn-secondary !py-2 !px-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to schools
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/schools" className="btn btn-ghost btn-icon" aria-label="Back to schools">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-lg font-bold text-slate-900">School Profile</h2>
      </div>
      <SchoolProfileView profile={profile} locNames={locNames} />
    </div>
  )
}
