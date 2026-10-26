import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Truck } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { EmptyState, Modal, PageHeader, Panel, Skeleton } from '@ui'

type OrderItem = {
  id?: number | string
  product_id?: number | string
  name?: string
  qty?: number
  quantity?: number
  price?: number | string
  courier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
}

type OrderRow = {
  id: number
  order_code: string
  total: string | number
  status: string
  payment_status: string
  placed_at?: string | null
  user?: { name?: string; email?: string } | null
  items?: OrderItem[]
  courier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  admin_note?: string | null
}

export function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [formCourier, setFormCourier] = useState('')
  const [formTracking, setFormTracking] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionErr, setActionErr] = useState('')

  const load = useCallback(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErr('')
    let alive = true
    api
      .get(`/admin/orders/${id}`)
      .then((r) => {
        if (!alive) return
        setOrder(r.data as OrderRow)
        setErr('')
      })
      .catch((e) => {
        if (!alive) return
        console.error('Order detail load failed', e)
        setErr(errMsg(e, 'Could not load order.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  const openTracking = (idx: number) => {
    if (!order?.items?.[idx]) return
    const item = order.items[idx]
    setSelectedIdx(idx)
    setFormCourier(item.courier ?? '')
    setFormTracking(item.tracking_number ?? '')
    setFormUrl(item.tracking_url ?? '')
    setModalOpen(true)
  }

  const saveTracking = async () => {
    if (!order || selectedIdx === null) return
    const item = order.items?.[selectedIdx]
    if (!item) return
    setSaving(true)
    setActionErr('')
    try {
      await api.patch(`/admin/orders/${order.id}`, {
        items: [
          {
            id: item.id ?? item.product_id ?? selectedIdx,
            courier: formCourier || null,
            tracking_number: formTracking || null,
            tracking_url: formUrl || null,
          },
        ],
      })
      setModalOpen(false)
      await load()
    } catch (e) {
      setActionErr(errMsg(e, 'Could not update tracking.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Order details" subtitle="" />
        <Panel>
          <Skeleton className="h-6 w-full" />
        </Panel>
      </div>
    )
  }

  if (err || !order) {
    return (
      <div className="space-y-4">
        <PageHeader title="Order details" subtitle="" />
        <Panel>
          <EmptyState title="Order not found" hint={err || 'This order could not be loaded.'} />
          <div className="mt-3">
            <Link to="/order-ledger" className="text-sm text-[var(--brand)] hover:underline">Back to ledger</Link>
          </div>
        </Panel>
      </div>
    )
  }

  const items = order.items ?? []
  return (
    <div className="space-y-4">
      <PageHeader
        title={`Order ${order.order_code}`}
        subtitle={`Customer: ${order.user?.name ?? '—'} · ${order.user?.email ?? ''}`}
      />

      <div className="flex items-center gap-2">
        <Link to="/order-ledger" className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to ledger
        </Link>
      </div>

      <Panel>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div><strong>Status:</strong> {order.status}</div>
          <div><strong>Payment:</strong> {order.payment_status}</div>
          <div><strong>Total:</strong> {order.total}</div>
          <div><strong>Placed:</strong> {order.placed_at ? new Date(order.placed_at).toLocaleString() : '—'}</div>
          <div><strong>Shipped:</strong> {order.shipped_at ? new Date(order.shipped_at).toLocaleString() : '—'}</div>
          <div><strong>Delivered:</strong> {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '—'}</div>
        </div>
        {order.tracking_number && (
          <div className="mt-2 text-sm">
            <strong>Order tracking:</strong> {order.tracking_number} {order.courier ? `(${order.courier})` : ''}
          </div>
        )}
        {order.admin_note && (
          <div className="mt-2 text-sm"><strong>Admin note:</strong> {order.admin_note}</div>
        )}
      </Panel>

      <Panel>
        <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Ordered items</h3>
        {items.length === 0 ? (
          <EmptyState title="No items" hint="This order has no item details." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-subtle)]">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Tracking number</th>
                  <th className="px-4 py-3">Tracking URL</th>
                  <th className="px-4 py-3">Shipped / Delivered</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.id ?? idx}-${idx}`} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{it.name ?? `Item ${idx + 1}`}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{it.qty ?? it.quantity ?? 1}</td>
                    <td className="px-4 py-3 text-[var(--text)]">{it.price ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{it.courier || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{it.tracking_number || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {it.tracking_url ? (
                        <a href={it.tracking_url} target="_blank" rel="noreferrer" className="text-[var(--brand)] hover:underline">
                          {it.tracking_url}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      <div>{it.shipped_at ? new Date(it.shipped_at).toLocaleString() : '—'}</div>
                      <div>{it.delivered_at ? new Date(it.delivered_at).toLocaleString() : '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="Add tracking details"
                        onClick={() => openTracking(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]"
                      >
                        <Truck className="h-3.5 w-3.5" /> Add tracking
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {modalOpen && selectedIdx !== null && (
        <Modal title="Add item tracking" sub={items[selectedIdx]?.name ?? `Item ${selectedIdx + 1}`} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            {actionErr && <div className="text-sm text-red-600">{actionErr}</div>}
            <label className="block text-sm font-medium text-[var(--text)]">Courier</label>
            <input value={formCourier} onChange={(e) => setFormCourier(e.target.value)} className="input w-full" placeholder="Courier name" />

            <label className="block text-sm font-medium text-[var(--text)]">Tracking number</label>
            <input value={formTracking} onChange={(e) => setFormTracking(e.target.value)} className="input w-full" placeholder="Tracking number" />

            <label className="block text-sm font-medium text-[var(--text)]">Tracking URL</label>
            <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="input w-full" placeholder="https://..." />

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveTracking()}
                disabled={saving}
                className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}