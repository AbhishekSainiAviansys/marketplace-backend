import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, PackagePlus } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, Button, Field, PageHeader, Panel } from '@ui'

type Cat = { id: number; name: string }
type CatField = { id: number; field_label: string; is_required?: number | boolean }

// Step 1: pick ONE category -> Step 2: dynamic fields (per the project diagram).
export function ProductForm({ prefix }: { prefix: string }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [catId, setCatId] = useState('')
  const [fields, setFields] = useState<CatField[]>([])
  const [form, setForm] = useState({ name: '', price: '', stock: 0, delivery_mode: 'self' })
  const [vals, setVals] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    api
      .get('/categories')
      .then((r) => setCats(rowsOf<Cat>(r.data)))
      .catch(() =>
        setCats([
          { id: 1, name: 'Book' },
          { id: 2, name: 'Book Bundle' },
          { id: 3, name: 'Water Bottle' },
        ]),
      )
  }, [])

  const pick = async (id: string) => {
    setCatId(id)
    setVals({})
    setMsg(null)
    if (!id) {
      setFields([])
      return
    }
    try {
      const { data } = await api.get(`/categories/${id}/fields`)
      setFields(rowsOf<CatField>(data))
    } catch {
      setFields([])
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      await api.post(`/${prefix}/products`, { ...form, category_id: Number(catId), fields: vals })
      setForm({ name: '', price: '', stock: 0, delivery_mode: 'self' })
      setVals({})
      setCatId('')
      setFields([])
      setMsg({ kind: 'ok', text: 'Product saved successfully' })
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Save failed') })
    } finally {
      setBusy(false)
    }
  }

  const chosen = cats.find((c) => String(c.id) === catId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Add product" subtitle="Two steps: choose a category, then fill its fields." />

      {/* Step indicator */}
      <ol className="flex items-center gap-3">
        {['Choose category', 'Product details'].map((label, i) => {
          const active = i === 0 ? !catId : !!catId
          const done = i === 0 ? !!catId : false
          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? 'accent-bg text-white'
                    : active
                      ? 'accent-soft accent-soft-text'
                      : 'bg-[var(--surface-3)] text-[var(--text-subtle)]'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`truncate text-sm font-semibold ${
                  active ? 'text-[var(--text)]' : 'text-[var(--text-subtle)]'
                }`}
              >
                {label}
              </span>
              {i === 0 && <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />}
            </li>
          )
        })}
      </ol>

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <span className="icon-tile accent-soft accent-soft-text">
            <PackagePlus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--text)]">
              {catId ? (chosen?.name ?? 'Details') : 'Select a category'}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {catId ? 'Now fill in the product details below.' : 'Each category has its own fields.'}
            </p>
          </div>
        </div>

        <Field label="Category">
          <select
            value={catId}
            onChange={(e) => pick(e.target.value)}
            className="field focus:field-focus outline-none"
          >
            <option value="">-- choose a category --</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </Panel>

      {catId && (
        <form onSubmit={save}>
          <Panel title="Product details">
            <div className="space-y-5">
              <Field label="Product name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Class 5 Math Workbook"
                  className="field focus:field-focus outline-none"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Price (₹)">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className="field focus:field-focus tnum outline-none"
                  />
                </Field>
                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="field focus:field-focus tnum outline-none"
                  />
                </Field>
              </div>

              <Field label="Delivery mode">
                <select
                  value={form.delivery_mode}
                  onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })}
                  className="field focus:field-focus outline-none"
                >
                  <option value="self">Self delivery</option>
                  <option value="thirdparty">Third party</option>
                  <option value="school_pickup">School pickup</option>
                </select>
              </Field>

              {fields.length > 0 && (
                <div className="border-t border-[var(--border)] pt-5">
                  <p className="mb-4 text-sm font-semibold text-[var(--text)]">
                    {chosen?.name} fields
                  </p>
                  <div className="space-y-5">
                    {fields.map((f) => (
                      <Field key={String(f.id)} label={String(f.field_label)}>
                        <input
                          required={Boolean(f.is_required)}
                          value={vals[String(f.id)] ?? ''}
                          onChange={(e) => setVals({ ...vals, [String(f.id)]: e.target.value })}
                          className="field focus:field-focus outline-none"
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}

              {msg && <Alert kind={msg.kind === 'ok' ? 'ok' : 'err'}>{msg.text}</Alert>}

              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="submit" busy={busy} icon={<PackagePlus className="h-4 w-4" />}>
                  {busy ? 'Saving…' : 'Save product'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => pick('')}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Change category
                </Button>
              </div>
            </div>
          </Panel>
        </form>
      )}

      {!catId && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => nav('/products')}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            View my products
          </Button>
        </div>
      )}
    </div>
  )
}
