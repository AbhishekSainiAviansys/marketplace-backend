import { useCallback, useEffect, useState } from 'react'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'
import { AddressForm } from './AddressForm'

type Address = {
  id: number
  label?: string | null
  line1?: string | null
  line2?: string | null
  pincode?: string | null
  phone?: string | null
  phone_code?: string | null
  is_default?: boolean | number
  country_name?: string | null
  state_name?: string | null
  district_name?: string | null
  area_label?: string | null
  area_code?: string | null
}

export function Addresses() {
  const [rows, setRows] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const { data } = await api.get('/addresses')
      setRows(rowsOf<Address>(data))
    } catch (e) {
      setErr(errMsg(e, 'Could not load addresses'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (id: number) => {
    if (!confirm('Delete this address?')) return
    setBusyId(id)
    setErr('')
    try {
      await api.delete(`/addresses/${id}`)
      await load()
    } catch (e) {
      setErr(errMsg(e, 'Delete failed'))
    } finally {
      setBusyId(null)
    }
  }

  const onSaved = () => {
    setAdding(false)
    void load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My addresses"
        subtitle="Saved delivery and billing addresses"
        actions={
          rows.length === 0 ? (
            <Button
              icon={<PlusCircle className="h-4 w-4" />}
              onClick={() => setAdding(true)}
            >
              Add address
            </Button>
          ) : (
            <Button
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => setAdding(true)}
            >
              Edit address
            </Button>
          )
        }
      />

      {err && <Alert>{err}</Alert>}

      {adding && (
        <Panel title={rows.length > 0 ? "Edit address" : "New address"} subtitle="Fill in the delivery details">
          <AddressForm initial={rows.length > 0 ? rows[0] : undefined} onSaved={onSaved} />
          <Button variant="secondary" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </Panel>
      )}

      <Panel bodyClass="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No addresses yet"
            hint="Add an address so orders can be delivered to the right place."
            action={
              <Button
                icon={<PlusCircle className="h-4 w-4" />}
                onClick={() => setAdding(true)}
              >
                Add your first address
              </Button>
            }
          />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="th">Label</th>
                    <th className="th">Address</th>
                    <th className="th">Area / Pincode</th>
                    <th className="th">Phone</th>
                    <th className="th text-center">Default</th>
                    <th className="th text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="tr">
                      <td className="td font-medium">{a.label ?? 'home'}</td>
                      <td className="td">
                        {a.line1}{a.line2 ? ', ' + a.line2 : ''}
                      </td>
                      <td className="td text-[var(--text-muted)] text-sm">
                        {a.area_label ?? ''}
                        {a.area_code ? ` (${a.area_code})` : ''} {a.pincode ?? ''}
                      </td>
                      <td className="td text-[var(--text-muted)] text-sm">
                        {(a.phone_code ?? '+91')} {a.phone ?? ''}
                      </td>
                      <td className="td text-center">
                        {a.is_default ? (
                          <span className="badge badge-ok">Default</span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="td text-right">
                        <Button
                          variant="ghost"
                          aria-label={`Delete ${a.label ?? 'address'}`}
                          disabled={busyId === a.id}
                          onClick={() => remove(a.id)}
                          className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--border)] md:hidden">
              {rows.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {a.label ?? 'home'}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {a.line1}{a.line2 ? ', ' + a.line2 : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {a.area_label ?? ''}
                        {a.area_code ? ` (${a.area_code})` : ''}
                        {a.pincode ?? ''}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {(a.phone_code ?? '+91')} {a.phone ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.is_default && (
                        <span className="badge badge-ok text-xs">
                          Default
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${a.label ?? 'address'}`}
                        disabled={busyId === a.id}
                        onClick={() => remove(a.id)}
                        className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] p-1.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  )
}