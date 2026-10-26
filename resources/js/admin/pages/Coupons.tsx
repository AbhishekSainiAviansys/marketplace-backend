/** Admin -> Coupons management. */
import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Button, EmptyState, PageHeader, Panel, Skeleton, useToast, Modal, Field } from '@ui'

type Coupon = {
  id: number
  code: string
  title: string | null
  description: string | null
  type: 'applied_once' | 'first_user' | 'festival' | 'promotional'
  discount_type: 'percent' | 'flat'
  discount_value: number | string
  max_discount: number | string | null
  min_order_amount: number | string | null
  usage_limit: number | null
  used_count: number
  per_user_limit: number
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
}

const emptyForm = {
  code: '',
  title: '',
  description: '',
  type: 'promotional' as Coupon['type'],
  discount_type: 'percent' as Coupon['discount_type'],
  discount_value: '',
  max_discount: '',
  min_order_amount: '',
  usage_limit: '',
  per_user_limit: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
}

export function Coupons() {
  const toast = useToast()
  const [rows, setRows] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/coupons')
      setRows(rowsOf<Coupon>(data))
    } catch (e) {
      toast('err', errMsg(e, 'Could not load coupons'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (c: Coupon) => {
    setEditId(c.id)
    setForm({
      code: c.code,
      title: c.title ?? '',
      description: c.description ?? '',
      type: c.type,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value ?? ''),
      max_discount: c.max_discount == null ? '' : String(c.max_discount),
      min_order_amount: c.min_order_amount == null ? '' : String(c.min_order_amount),
      usage_limit: c.usage_limit == null ? '' : String(c.usage_limit),
      per_user_limit: String(c.per_user_limit ?? 1),
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: c.is_active,
    })
    setShowForm(true)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      type: form.type,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      per_user_limit: form.per_user_limit === '' ? 1 : Number(form.per_user_limit),
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    }
    try {
      if (editId) {
        await api.put(`/admin/coupons/${editId}`, payload)
        toast('ok', 'Coupon updated')
      } else {
        await api.post('/admin/coupons', payload)
        toast('ok', 'Coupon created')
      }
      setShowForm(false)
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Save failed'))
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setBusyId(id)
    try {
      await api.delete(`/admin/coupons/${id}`)
      toast('ok', 'Coupon deleted')
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Delete failed'))
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (c: Coupon) => {
    setBusyId(c.id)
    try {
      await api.put(`/admin/coupons/${c.id}`, { is_active: !c.is_active })
      toast('ok', `Coupon ${c.is_active ? 'deactivated' : 'activated'}`)
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Update failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupons"
        subtitle="Manage discount coupons for student cart totals."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New coupon</Button>}
      />

      <Panel title="All coupons" subtitle={`${rows.length} coupon(s)`}>
        {loading ? (
          <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No coupons yet" hint="Create your first coupon to offer discounts." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Discount</th>
                  <th className="px-3 py-2 text-left">Usage</th>
                  <th className="px-3 py-2 text-left">Expiry</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{c.code}</td>
                    <td className="px-3 py-2 text-slate-700">{c.type}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${Number(c.discount_value).toFixed(2)}`}
                      {c.max_discount ? ` (max ₹${Number(c.max_discount).toFixed(2)})` : ''}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''} · per user {c.per_user_limit}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void toggleActive(c)}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="!px-2.5 !py-1 !text-xs" onClick={() => openEdit(c)} disabled={busyId === c.id}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" className="!px-2.5 !py-1 !text-xs text-rose-600" onClick={() => void remove(c.id)} disabled={busyId === c.id}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showForm && (
        <Modal title={editId ? 'Edit coupon' : 'New coupon'} onClose={() => setShowForm(false)}>
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <Field label="Code">
              <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </Field>
            <Field label="Title">
              <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Coupon['type'] })}>
                  <option value="promotional">Promotional</option>
                  <option value="applied_once">Apply once</option>
                  <option value="first_user">First user</option>
                  <option value="festival">Festival</option>
                </select>
              </Field>
              <Field label="Discount type">
                <select className="field" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as Coupon['discount_type'] })}>
                  <option value="percent">Percent</option>
                  <option value="flat">Flat</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount value">
                <input className="field" type="number" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required />
              </Field>
              <Field label="Max discount">
                <input className="field" type="number" step="0.01" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min order amount">
                <input className="field" type="number" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              </Field>
              <Field label="Usage limit">
                <input className="field" type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Per user limit">
                <input className="field" type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
              </Field>
              <Field label="Active">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts at">
                <input className="field" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </Field>
              <Field label="Expires at">
                <input className="field" type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

