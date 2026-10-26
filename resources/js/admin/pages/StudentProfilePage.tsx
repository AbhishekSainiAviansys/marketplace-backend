/** Admin -> Student profile/detail page. */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { fromApiUser, fmtDate, fmtMoney } from './studentsTypes'
import type { StudentProfile, StudentOrder, StudentAddress } from './studentsTypes'

export function StudentProfilePage() {
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('id')
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!studentId) {
      setErr('No student ID provided')
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get(`/admin/students/${studentId}`)
      .then((r) => {
        const full = r.data as any
        const merged: StudentProfile = {
          ...fromApiUser(full),
          addresses: Array.isArray(full.addresses) ? full.addresses : [],
          orders: Array.isArray(full.orders) ? full.orders : [],
        }
        setProfile(merged)
      })
      .catch((e) => setErr(errMsg(e, 'Could not load student profile.')))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <p className="text-sm text-slate-500">Loading student profile…</p>
      </div>
    )
  }

  if (err || !profile) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <h2 className="text-lg font-bold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-red-600">{err || 'Student not found'}</p>
        <div className="mt-6">
          <Link to="/students" className="btn btn-secondary !py-2 !px-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to students
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/students" className="btn btn-ghost btn-icon" aria-label="Back to students">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-lg font-bold text-slate-900">Student Profile</h2>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-slate-900">Student Information</h3>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div className="font-medium text-slate-700">Name</div>
          <dd className="truncate font-medium text-slate-800">{profile.name}</dd>
          <div className="font-medium text-slate-700">Email</div>
          <dd className="truncate font-medium text-slate-800">{profile.email ?? '—'}</dd>
          <div className="font-medium text-slate-700">WhatsApp</div>
          <dd className="truncate font-medium text-slate-800">{profile.whatsapp ?? profile.phone_e164 ?? '—'}</dd>
          <div className="font-medium text-slate-700">Status</div>
          <dd className="truncate font-medium text-slate-800">{profile.is_active ? 'Active' : 'Inactive'}</dd>
          <div className="font-medium text-slate-700">Joined</div>
          <dd className="truncate font-medium text-slate-800">{fmtDate(profile.created_at)}</dd>
        </dl>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-slate-900">Addresses</h3>
        {profile.addresses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No addresses saved.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {profile.addresses.map((a: StudentAddress) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {a.label ? <div className="font-medium">{a.label}</div> : null}
                <div>{[a.line1, a.line2].filter(Boolean).join(', ')}</div>
                <div>{[a.city, a.state, a.country, a.pincode].filter(Boolean).join(', ')}</div>
                {a.phone ? <div className="text-xs text-slate-500">{a.phone}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-slate-900">Order History</h3>
        {profile.orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Pay mode</th>
                  <th className="px-3 py-2">Delivery</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.orders.map((o: StudentOrder) => {
                  const items = Array.isArray(o.items) ? o.items : []
                  return (
                    <tr key={o.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{o.order_code}</td>
                      <td className="px-3 py-2 text-slate-600">{fmtDate(o.placed_at ?? o.created_at)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {items.length === 0 ? '—' : items.map((it, i) => (
                          <div key={i}>{it.name ?? it.product_name ?? 'Item'} × {it.qty ?? it.quantity ?? 1}</div>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{o.pay_mode ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{o.delivery ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{o.status}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{fmtMoney(o.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

