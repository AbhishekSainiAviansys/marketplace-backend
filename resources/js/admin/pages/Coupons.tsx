/** Admin -> Coupons management. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Button, EmptyState, PageHeader, Panel, Skeleton, useToast, Field } from '@ui'

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

type FormState = typeof emptyForm

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

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const

/** Convert an ISO date string from the API to the `YYYY-MM-DDTHH:mm` value a
 *  `datetime-local` input expects (in the user's local timezone). */
const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Top-anchored, scrollable modal.
 *
 * Notes on the two bugs this fixes vs. the previous version:
 *
 *  1. **White footer bleeding through from the admin shell** — the admin layout
 *     has its own fixed footer/header element with `z-index: 50` or higher, so
 *     a `z-50` modal was being painted underneath it. We now use `z-[9999]`.
 *
 *  2. **A second "white bar" overlapping the form content** — that was the
 *     `sticky bottom-0` action row inside the scrollable form, which collided
 *     with the last row of fields. We now render the action buttons in a
 *     *separate, non-scrolling footer* of the modal card, outside the scroll
 *     area, so they no longer overlap any field.
 */
function CouponModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative my-4 w-full max-w-lg rounded-xl bg-white shadow-2xl sm:my-8">
        {/* Sticky header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body — only this part scrolls. */}
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-5 py-4">{children}</div>

        {/* Fixed (non-sticky) footer inside the modal card. Lives outside the
            scroll area so it can never overlap the last field. */}
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  )
}

export function Coupons() {
  const toast = useToast()
  const [rows, setRows] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  // --- pagination state ----------------------------------------------------
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(PER_PAGE_OPTIONS[0])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/coupons')
      setRows(rowsOf<Coupon>(data))
      setPage(1)
    } catch (e) {
      toast('err', errMsg(e, 'Could not load coupons'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  // Reset to page 1 if per-page changes or rows shrink.
  useEffect(() => {
    setPage(1)
  }, [perPage])

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const safePage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * perPage
    return rows.slice(start, start + perPage)
  }, [rows, safePage, perPage])

  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const rangeEnd = Math.min(safePage * perPage, rows.length)

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages))
  }

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
      starts_at: toLocalInput(c.starts_at),
      expires_at: toLocalInput(c.expires_at),
      is_active: c.is_active,
    })
    setShowForm(true)
  }

  // Small helper so each `onChange` doesn't have to spread `form` manually.
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    // --- client-side validation -------------------------------------------
    const code = form.code.trim().toUpperCase()
    if (!code) {
      toast('err', 'Coupon code is required')
      return
    }
    if (!/^[A-Z0-9]{3,32}$/.test(code)) {
      toast('err', 'Code must be 3–32 chars: A–Z and 0–9 only')
      return
    }
    const dv = Number(form.discount_value || 0)
    if (Number.isNaN(dv) || dv < 0) {
      toast('err', 'Discount value must be a positive number')
      return
    }
    if (form.discount_type === 'percent' && dv > 100) {
      toast('err', 'Percent discount cannot exceed 100')
      return
    }
    if (form.starts_at && form.expires_at && form.starts_at >= form.expires_at) {
      toast('err', 'Expiry date must be after the start date')
      return
    }

    const payload: Record<string, unknown> = {
      code,
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      type: form.type,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      per_user_limit: form.per_user_limit === '' ? 1 : Number(form.per_user_limit),
      // Convert the local datetime-local string back to an ISO timestamp.
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    }

    setSaving(true)
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
    } finally {
      setSaving(false)
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

  // IMPORTANT: the old version sent `PUT { is_active }` only. On a full-replace
  // backend that wipes every other field (code, discount, etc.). We now send the
  // full coupon payload with just `is_active` flipped.
  const toggleActive = async (c: Coupon) => {
    setBusyId(c.id)
    try {
      await api.put(`/admin/coupons/${c.id}`, {
        code: c.code,
        title: c.title,
        description: c.description,
        type: c.type,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_discount: c.max_discount == null ? null : Number(c.max_discount),
        min_order_amount: c.min_order_amount == null ? null : Number(c.min_order_amount),
        usage_limit: c.usage_limit,
        per_user_limit: c.per_user_limit,
        starts_at: c.starts_at,
        expires_at: c.expires_at,
        is_active: !c.is_active,
      })
      toast('ok', `Coupon ${c.is_active ? 'deactivated' : 'activated'}`)
      await load()
    } catch (e) {
      toast('err', errMsg(e, 'Update failed'))
    } finally {
      setBusyId(null)
    }
  }

  const typeLabels: Record<Coupon['type'], string> = {
    promotional: 'Promotional',
    applied_once: 'Apply once',
    first_user: 'First user',
    festival: 'Festival',
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupons"
        subtitle="Manage discount coupons for student cart totals."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        }
      />

      <Panel title="All coupons" subtitle={`${rows.length} coupon(s)`}>
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No coupons yet" hint="Create your first coupon to offer discounts." />
        ) : (
          <>
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
                  {pagedRows.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-mono font-semibold text-slate-900">{c.code}</div>
                        {c.title && <div className="text-xs text-slate-500">{c.title}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {typeLabels[c.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {c.discount_type === 'percent'
                          ? `${c.discount_value}%`
                          : `₹${Number(c.discount_value).toFixed(2)}`}
                        {c.max_discount ? (
                          <div className="text-xs text-slate-500">
                            max ₹{Number(c.max_discount).toFixed(2)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div>
                          {c.used_count}
                          {c.usage_limit ? `/${c.usage_limit}` : ''}
                        </div>
                        <div className="text-xs text-slate-500">per user {c.per_user_limit}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void toggleActive(c)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {c.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            className="!px-2.5 !py-1 !text-xs"
                            onClick={() => openEdit(c)}
                            disabled={busyId === c.id}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="!px-2.5 !py-1 !text-xs text-rose-600"
                            onClick={() => void remove(c.id)}
                            disabled={busyId === c.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer: per-page selector + page nav. */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Rows per page</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="ml-2 hidden sm:inline">
                  Showing {rangeStart}–{rangeEnd} of {rows.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  // Show first, last, current, and 1 neighbour each side; hide the rest as "…".
                  .filter((p) => {
                    if (totalPages <= 7) return true
                    if (p === 1 || p === totalPages) return true
                    if (Math.abs(p - safePage) <= 1) return true
                    return false
                  })
                  .map((p, i, arr) => {
                    const prev = arr[i - 1]
                    const showEllipsis = prev && p - prev > 1
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-xs text-slate-400">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => goToPage(p)}
                          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition ${
                            p === safePage
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    )
                  })}

                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      {showForm && (
        <CouponModal
          title={editId ? 'Edit coupon' : 'New coupon'}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" form="coupon-form" disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
              </Button>
            </>
          }
        >
          <form id="coupon-form" onSubmit={(e) => void submit(e)} className="space-y-3.5">
            <Field label="Code" hint="3–32 chars, A–Z & 0–9">
              <input
                className="field font-mono uppercase tracking-wider"
                value={form.code}
                onChange={(e) =>
                  set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32))
                }
                placeholder="FIRSTORDER"
                required
                maxLength={32}
                autoFocus
              />
            </Field>

            <Field label="Title">
              <input
                className="field"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="First order discount"
              />
            </Field>

            <Field label="Description">
              <textarea
                className="field"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  className="field"
                  value={form.type}
                  onChange={(e) => set('type', e.target.value as Coupon['type'])}
                >
                  <option value="promotional">Promotional</option>
                  <option value="applied_once">Apply once</option>
                  <option value="first_user">First user</option>
                  <option value="festival">Festival</option>
                </select>
              </Field>
              <Field label="Discount type">
                <select
                  className="field"
                  value={form.discount_type}
                  onChange={(e) => set('discount_type', e.target.value as Coupon['discount_type'])}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={form.discount_type === 'percent' ? 'Discount (%)' : 'Discount (₹)'}
                hint={form.discount_type === 'percent' ? '0–100' : undefined}
              >
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => set('discount_value', e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Max discount (₹)"
                hint={form.discount_type === 'percent' ? 'Caps percent discounts' : 'Not used for flat'}
              >
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.max_discount}
                  onChange={(e) => set('max_discount', e.target.value)}
                  disabled={form.discount_type === 'flat'}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min order (₹)">
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.min_order_amount}
                  onChange={(e) => set('min_order_amount', e.target.value)}
                />
              </Field>
              <Field label="Usage limit" hint="Blank = unlimited">
                <input
                  className="field"
                  type="number"
                  min="1"
                  value={form.usage_limit}
                  onChange={(e) => set('usage_limit', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Per user limit">
                <input
                  className="field"
                  type="number"
                  min="1"
                  value={form.per_user_limit}
                  onChange={(e) => set('per_user_limit', e.target.value)}
                />
              </Field>
              <Field label="Status">
                <label className="flex h-[38px] cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 px-3 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => set('is_active', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="text-sm text-slate-700">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts at">
                <input
                  className="field"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => set('starts_at', e.target.value)}
                />
              </Field>
              <Field label="Expires at">
                <input
                  className="field"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => set('expires_at', e.target.value)}
                />
              </Field>
            </div>
          </form>
        </CouponModal>
      )}
    </div>
  )
}
