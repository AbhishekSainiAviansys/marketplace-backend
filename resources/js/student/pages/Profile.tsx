/** Student -> My Profile page. Shows profile details, addresses and recent orders. */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User2, Mail, Phone, MapPin, Package, ArrowLeft, Camera, Pencil, X } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { assetUrl, initials } from '@lib/brand'
import { rupee } from '../store/shop'
import { AddressForm } from '../components/AddressForm'
import { Modal } from '@ui'

type Address = {
  id: number
  label?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  pincode?: string | null
  phone?: string | null
  phone_code?: string | null
  country_name?: string | null
  state_name?: string | null
  district_name?: string | null
  area_label?: string | null
}

type Order = {
  id: number | string
  order_code?: string | null
  items: any[]
  total: number | string
  pay_mode?: string | null
  delivery?: string | null
  address?: string | null
  status: string
  placed_at?: string | null
  coupon_code?: string | null
  coupon_discount?: number | null
}

export function Profile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const openAddAddress = () => { setEditingAddress(null); setAddressModalOpen(true) }
  const openEditAddress = (a: Address) => { setEditingAddress(a); setAddressModalOpen(true) }
  const closeAddressModal = () => { setAddressModalOpen(false); setEditingAddress(null) }

  // "More details" edit state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editErr, setEditErr] = useState('')
  const [form, setForm] = useState<any>({})

  const startEdit = () => {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      whatsapp: user?.whatsapp ?? user?.phone_e164 ?? '',
      phone_country_code: user?.phone_country_code ?? '+91',
      phone: user?.phone ?? '',
    })
    setEditErr('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditErr('')
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setEditErr('')
    try {
      const { data } = await api.put('/student/profile', form)
      setUser(data)
      setEditing(false)
    } catch (e) {
      setEditErr(errMsg(e, 'Could not update profile.'))
    } finally {
      setSaving(false)
    }
  }

  const onPhotoSelected = async (file: File | null) => {
    if (!file) return
    setPhotoBusy(true)
    setPhotoErr('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/student/profile/photo', fd)
      setUser((prev: any) => ({ ...(prev ?? {}), ...(data?.user ?? data ?? {}), avatar: data?.avatar ?? data?.url ?? data?.user?.avatar ?? data?.user?.photo ?? data?.user?.profile_photo ?? data?.user?.avatar_url ?? null }))
    } catch (e) {
      setPhotoErr(errMsg(e, 'Could not upload photo.'))
    } finally {
      setPhotoBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = async () => {
    setPhotoBusy(true)
    setPhotoErr('')
    try {
      const { data } = await api.delete('/student/profile/photo')
      setUser((prev: any) => ({ ...(prev ?? {}), ...(data?.user ?? data ?? {}), avatar: data?.avatar ?? data?.user?.avatar ?? null }))
    } catch (e) {
      setPhotoErr(errMsg(e, 'Could not remove photo.'))
    } finally {
      setPhotoBusy(false)
    }
  }


  // Profile photo state
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadAddresses = () => {
    api.get('/student/addresses')
      .then((r) => setAddresses(r.data ?? []))
      .catch(() => setAddresses(user?.addresses ?? []))
  }

  useEffect(() => {
    setLoading(true)
    api.get('/student/profile')
      .then((r) => { setUser(r.data) })
      .catch((e) => setErr(errMsg(e, 'Could not load profile.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && !err) loadAddresses()
  }, [loading, err])

  const orders: Order[] = user?.orders ?? []

  const whatsapp = user?.whatsapp ?? user?.phone_e164 ?? null
  const altPhone = user?.phone_country_code ? `${user.phone_country_code} ${user?.phone ?? ''}` : null

  if (loading) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <p className="text-sm text-slate-500">Loading profileâ€¦</p>
      </div>
    )
  }

  if (err || !user) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <h2 className="text-lg font-bold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-red-600">{err}</p>
        <div className="mt-6"><Link to="/" className="btn btn-secondary !py-2 !px-4">Back to shop</Link></div>
      </div>
    )
  }

  const avatarSrc = user?.avatar ? assetUrl(user.avatar) : null
  const name = user?.name ?? 'Customer'
  const email = user?.email ?? 'â€”'
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'â€”'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to shop">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
      </div>

      <div className="card p-5 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl accent-bg text-white text-2xl font-bold overflow-hidden">
            {avatarSrc ? <img src={avatarSrc} alt="avatar" className="h-16 w-16 rounded-2xl object-cover" /> : initials(name)}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoBusy}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-50"
            aria-label="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-slate-900">{name}</h1>
            <button
              type="button"
              onClick={editing ? cancelEdit : startEdit}
              className="btn btn-secondary !py-1 !px-3 text-xs flex items-center gap-1"
            >
              {editing ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Pencil className="h-3.5 w-3.5" /> Edit details</>}
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{email}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Member since {memberSince}</p>
          {photoErr && <p className="mt-1 text-xs text-red-600">{photoErr}</p>}
          {user?.avatar && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={photoBusy}
              className="mt-1 text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Edit details</h3>
          <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              WhatsApp / Mobile
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.whatsapp ?? ''}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Country code
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.phone_country_code ?? ''}
                onChange={(e) => setForm({ ...form, phone_country_code: e.target.value })}
              />
            </label>
            {editErr && <p className="sm:col-span-2 text-xs text-red-600">{editErr}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary !py-2 !px-4 text-sm">
                {saving ? 'Savingâ€¦' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn btn-secondary !py-2 !px-4 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-4">
        <h3 className="text-sm font-bold text-slate-900">Contact</h3>
        <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-500" /><div className="font-medium text-slate-700">Mobile</div></div>
          <dd className="col-span-2 sm:col-span-1 truncate text-slate-800">{whatsapp ?? 'â€”'}</dd>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-500" /><div className="font-medium text-slate-700">Alternate mobile</div></div>
          <dd className="col-span-2 sm:col-span-1 truncate text-slate-800">{altPhone ?? 'â€”'}</dd>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-500" /><div className="font-medium text-slate-700">Email</div></div>
          <dd className="col-span-2 sm:col-span-1 truncate text-slate-800">{email}</dd>
          <div className="flex items-center gap-2"><User2 className="h-4 w-4 shrink-0 text-slate-500" /><div className="font-medium text-slate-700">Role</div></div>
          <dd className="col-span-2 sm:col-span-1 capitalize text-slate-800">{user?.role ?? 'student'}</dd>
        </dl>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> My Addresses</h3>
          <button type="button" className="btn btn-secondary !py-1 !px-3 text-xs" onClick={openAddAddress}>
            Add address
          </button>
        </div>
        {addressModalOpen && (
          <Modal title={editingAddress ? 'Edit address' : 'Add address'} onClose={closeAddressModal}>
            <AddressForm initial={editingAddress} onSaved={() => { closeAddressModal(); loadAddresses() }} onCancel={closeAddressModal} />
          </Modal>
        )}
        {addresses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No addresses saved.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {a.label && <div className="font-medium">{a.label}</div>}
                    <div className="text-slate-800">{[a.line1, a.line2].filter(Boolean).join(', ')}</div>
                    <div className="text-slate-600">{[a.area_label, a.district_name, a.state_name, a.country_name, a.pincode].filter(Boolean).join(', ')}</div>
                    {a.phone && <div className="mt-1 text-xs text-slate-500">{a.phone_code ? a.phone_code + ' ' : ''}{a.phone}</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" className="text-xs text-slate-600 hover:underline" onClick={() => openEditAddress(a)}>Edit</button>
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={async () => { await api.delete(`/student/addresses/${a.id}`); loadAddresses() }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Package className="h-4 w-4 shrink-0" /> Recent Orders</h3>
          <Link to="/orders" className="text-xs text-accent hover:underline">View all orders</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((o) => {
                  const items = Array.isArray(o.items) ? o.items : []
                  return (
                    <tr key={o.id}>
                      <td className="px-3 py-2 font-medium text-slate-900"><Link to={`/orders/${encodeURIComponent(String(o.id))}`} className="accent-text hover:underline">{o.order_code ?? o.id}</Link></td>
                      <td className="px-3 py-2 text-slate-600">{o.placed_at ? new Date(o.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'â€”'}</td>
                       <td className="px-3 py-2 text-slate-600">{items.length === 0 ? '—' : items.map((it) => { const name = it.name ?? it.product_name ?? 'Item'; const qty = it.qty ?? it.quantity ?? 1; const tracking = it.tracking_number ?? it.trackingNumber ?? it.tracking_url ?? it.trackingUrl ?? it.courier; return tracking ? `${name} x ${qty} (Tracking: ${tracking})` : `${name} x ${qty}` }).join(', ')}</td>
                      <td className="px-3 py-2 text-slate-600">{o.status}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{rupee(Number(o.total ?? 0))}</td>
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

