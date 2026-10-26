/** Admin -> Admin Order Ledger (orders containing admin-owned products). */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, DollarSign, Download, Pencil, Search, Truck, XCircle } from 'lucide-react'
import { api, errMsg, metaOf, rowsOf } from '@lib/api'
import { EmptyState, Modal, PageHeader, Panel, Skeleton } from '@ui'

type OrderRow = {
  id: number
  order_code: string
  total: string | number
  status: string
  payment_status: string
  payment_provider?: string | null
  provider_order_id?: string | null
  payment_ref?: string | null
  placed_at?: string | null
  paid_at?: string | null
  courier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  refunded_at?: string | null
  admin_note?: string | null
  user?: { name?: string; email?: string } | null
  items?: Array<{ id?: number | string; qty?: number; price?: number; name?: string; courier?: string | null; tracking_number?: string | null; tracking_url?: string | null; shipped_at?: string | null; delivered_at?: string | null }>
}

export function OrderLedger() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage] = useState(20)
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [actionErr, setActionErr] = useState('')


  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const [formStatus, setFormStatus] = useState('')
  const [formCourier, setFormCourier] = useState('')
  const [formTracking, setFormTracking] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formItems, setFormItems] = useState<Array<{ id?: number | string; courier: string; tracking: string; url: string }>>([])
  const [formNote, setFormNote] = useState('')
  const [formNotify, setFormNotify] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setErr('')
    let alive = true
    api
      .get('/admin/orders', {
        params: {
          search: dq || undefined,
          status: status || undefined,
          payment_status: paymentStatus || undefined,
          page,
          per_page: perPage,
          sort_by: 'placed_at',
          sort_dir: 'desc',
        },
      })
      .then((r) => {
        if (!alive) return
        const data = r.data
        setRows(rowsOf<OrderRow>(data))
        const m = metaOf(data)
        setPage(m.page ?? 1)
        setLastPage(m.lastPage ?? 1)
        setTotal(m.total ?? 0)
      })
      .catch((e) => {
        if (!alive) return
        console.error('Order ledger load failed', e)
        setErr(errMsg(e, 'Could not load admin order ledger.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [dq, status, paymentStatus, page, perPage])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  useEffect(() => {
    const t = window.setTimeout(() => { setPage(1); setDq(q.trim()) }, 250)
    return () => window.clearTimeout(t)
  }, [q])

  const itemSummary = (items?: OrderRow['items']) => {
    if (!items || !items.length) return '—'
    return items.map((it) => `${it.name ?? `#${it.id ?? '?'}`} x${it.qty ?? 1}`).join(', ')
  }

  const openUpdate = (r: OrderRow) => {
    setSelected(r)
    setFormStatus(r.status || 'Placed')
    setFormCourier(r.courier || '')
    setFormTracking(r.tracking_number || '')
    setFormUrl(r.tracking_url || '')
    setFormItems((r.items ?? []).map((it) => ({ id: it.id, courier: it.courier || '', tracking: it.tracking_number || '', url: it.tracking_url || '' })))
    setFormNote(r.admin_note || '')
    setFormNotify(true)
    setModalOpen(true)
  }

  const saveUpdate = async () => {
    if (!selected) return
    setSaving(true)
    setActionErr('')
    try {
      await api.patch(`/admin/orders/${selected.id}`, {
        status: formStatus,
        courier: formCourier || null,
        tracking_number: formTracking || null,
        tracking_url: formUrl || null,
        items: formItems.map((it) => ({
          id: it.id,
          courier: it.courier || null,
          tracking_number: it.tracking || null,
          tracking_url: it.url || null,
        })),
        admin_note: formNote || null,
        notify: formNotify,
      })
      setModalOpen(false)
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not update order.'))
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = async (r: OrderRow, next: string) => {
    setActionErr('')
    try {
      await api.patch(`/admin/orders/${r.id}/status`, { status: next, notify: true })
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not update status.'))
    }
  }

  const cancelOrder = async (r: OrderRow) => {
    const reason = window.prompt('Cancellation reason (optional):', '')
    if (reason === null) return
    setActionErr('')
    try {
      await api.post(`/admin/orders/${r.id}/cancel`, { reason: reason || undefined, notify: true })
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not cancel order.'))
    }
  }

  const refundOrder = async (r: OrderRow) => {
    if (!window.confirm(`Refund payment for ${r.order_code}?`)) return
    setActionErr('')
    try {
      await api.post(`/admin/orders/${r.id}/refund`, { notify: true })
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not refund order.'))
    }
  }

  const notifyStudent = async (r: OrderRow) => {
    setActionErr('')
    try {
      await api.post(`/admin/orders/${r.id}/notify`, {})
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not send notification.'))
    }
  }

  const markPaid = async (r: OrderRow) => {
    setActionErr('')
    try {
      await api.post(`/admin/orders/${r.id}/mark-paid`, { notify: true })
      load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not mark paid.'))
    }
  }

  const downloadInvoice = async (r: OrderRow) => {
    try {
      const res = await api.get(`/admin/orders/${r.id}/invoice`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${r.order_code}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setActionErr(errMsg(e, 'Could not download invoice.'))
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Order Ledger" subtitle="Manage orders containing admin-owned products." />

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order code, customer..."
              className="input w-full pl-9"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input">
            <option value="">All statuses</option>
            <option value="Placed">Placed</option>
            <option value="Processing">Processing</option>
            <option value="Packed">Packed</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for delivery">Out for delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Refunded">Refunded</option>
            <option value="Returned">Returned</option>
          </select>
          <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }} className="input">
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button type="button" onClick={load} className="btn btn-secondary !py-2 !text-sm" disabled={loading}>
            <Search className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </Panel>

      {err && <div className="alert alert-err">{err}</div>}
      {actionErr && <div className="alert alert-err">{actionErr}</div>}

      <Panel bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-subtle)]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={9}><EmptyState title="No orders" hint="Admin-owned product orders will appear here." /></td></tr>
              ) : (
                rows.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 font-medium text-[var(--text)]">
                        <Link to={`/order-ledger/${r.id}`} className="text-[var(--brand)] hover:underline">{r.order_code}</Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        <div>{r.user?.name ?? '—'}</div>
                        <div className="text-xs text-[var(--text-subtle)]">{r.user?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{itemSummary(r.items)}</td>
                      <td className="px-4 py-3 text-[var(--text)]">{r.total}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : r.payment_status === 'refunded' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{r.status}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {r.tracking_number ? (
                          <div>
                            <div>{r.tracking_number}</div>
                            {r.courier && <div className="text-xs text-[var(--text-subtle)]">{r.courier}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{r.placed_at ? new Date(r.placed_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" title="Update status & tracking" onClick={() => openUpdate(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" title="Mark shipped" onClick={() => quickStatus(r, 'Shipped')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <Truck className="h-4 w-4" />
                          </button>
                          <button type="button" title="Mark delivered" onClick={() => quickStatus(r, 'Delivered')} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          {r.payment_status === 'unpaid' && (
                            <button type="button" title="Mark paid" onClick={() => markPaid(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                          <button type="button" title="Cancel order" onClick={() => cancelOrder(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button type="button" title="Refund payment" disabled={r.payment_status !== 'paid'} onClick={() => refundOrder(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)] disabled:opacity-40">
                            <DollarSign className="h-4 w-4" />
                          </button>
                          <button type="button" title="Notify student" onClick={() => notifyStudent(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <Bell className="h-4 w-4" />
                          </button>
                          <button type="button" title="Download invoice" onClick={() => downloadInvoice(r)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 hover:bg-[var(--surface-2)]">
                            <Download className="h-4 w-4" />
                          </button>

                        </div>
                      </td>
                    </tr>

                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
          <div>{total} total</div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 disabled:opacity-50">Prev</button>
            <span>Page {page} of {lastPage}</span>
            <button type="button" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </Panel>

      {modalOpen && selected && (
        <Modal title="Update order" sub={selected.order_code} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text)]">Status</label>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="input w-full">
              <option value="Placed">Placed</option>
              <option value="Processing">Processing</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for delivery">Out for delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
              <option value="Returned">Returned</option>
            </select>

            <label className="block text-sm font-medium text-[var(--text)]">Courier</label>
            <input value={formCourier} onChange={(e) => setFormCourier(e.target.value)} className="input w-full" placeholder="Courier name" />

            <label className="block text-sm font-medium text-[var(--text)]">Tracking number</label>
            <input value={formTracking} onChange={(e) => setFormTracking(e.target.value)} className="input w-full" placeholder="Tracking number" />

            <label className="block text-sm font-medium text-[var(--text)]">Tracking URL</label>
            <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="input w-full" placeholder="https://..." />

            <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
              <p className="text-sm font-semibold text-[var(--text)]">Per-item tracking</p>
              {(selected.items ?? []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No item details available.</p>
              ) : (
                (selected.items ?? []).map((item, idx) => (
                  <div key={`${item.id ?? idx}-${idx}`} className="space-y-1 border-b border-[var(--border)] pb-2 last:border-b-0">
                    <p className="text-xs font-semibold text-[var(--text)]">{item.name ?? `Item ${idx + 1}`}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        value={formItems[idx]?.courier ?? ''}
                        onChange={(e) => setFormItems((prev) => prev.map((x, i) => (i === idx ? { ...x, courier: e.target.value } : x)))}
                        className="input w-full"
                        placeholder="Courier"
                      />
                      <input
                        value={formItems[idx]?.tracking ?? ''}
                        onChange={(e) => setFormItems((prev) => prev.map((x, i) => (i === idx ? { ...x, tracking: e.target.value } : x)))}
                        className="input w-full"
                        placeholder="Tracking number"
                      />
                      <input
                        value={formItems[idx]?.url ?? ''}
                        onChange={(e) => setFormItems((prev) => prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)))}
                        className="input w-full"
                        placeholder="Tracking URL"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <label className="block text-sm font-medium text-[var(--text)]">Admin note</label>
            <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} className="input w-full" rows={3} />

            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={formNotify} onChange={(e) => setFormNotify(e.target.checked)} />
              Notify student about this update
            </label>

            {actionErr && <div className="alert alert-err">{actionErr}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
              <button type="button" onClick={saveUpdate} disabled={saving} className="btn btn-primary !py-2 !text-sm">
                {saving ? 'Saving...' : 'Save update'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}