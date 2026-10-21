import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, PackagePlus } from 'lucide-react'
import { api, errMsg } from '@lib/api'

type Cat = { id: number; name: string }
type CatField = { id: number; field_label: string; is_required?: number | boolean }

// Step1: pick ONE category -> Step2: dynamic fields (diagram requirement)
export function ProductForm({ prefix }: { prefix: string }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [catId, setCatId] = useState('')
  const [fields, setFields] = useState<CatField[]>([])
  const [form, setForm] = useState({ name: '', price: '', stock: 0, delivery_mode: 'self' })
  const [vals, setVals] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get('/categories')
      .then((r) => setCats(r.data))
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
      setFields(data)
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
      setMsg({ kind: 'ok', text: 'Product saved successfully' })
      setForm({ name: '', price: '', stock: 0, delivery_mode: 'self' })
      setVals({})
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Save failed') })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card mx-auto max-w-2xl p-6">
      <div className="flex items-center gap-3">
        <span className="accent-bg flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <PackagePlus className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Add product</h2>
          <p className="text-sm text-slate-500">Step 1 — choose one category. Step 2 — fill its fields.</p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Category</span>
        <select value={catId} onChange={(e) => pick(e.target.value)} className="field focus:field-focus outline-none">
          <option value="">-- choose a category --</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {catId && (
        <form onSubmit={save} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Product name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Class 5 Math Workbook"
              className="field focus:field-focus outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Price</span>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Stock</span>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="field focus:field-focus outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Delivery mode</span>
            <select
              value={form.delivery_mode}
              onChange={(e) => setForm({ ...form, delivery_mode: e.target.value })}
              className="field focus:field-focus outline-none"
            >
              <option value="self">Self delivery</option>
              <option value="thirdparty">Third party</option>
              <option value="school_pickup">School pickup</option>
            </select>
          </label>

          {fields.map((f) => (
            <label key={String(f.id)} className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {String(f.field_label)}
                {f.is_required ? <span className="text-red-500"> *</span> : null}
              </span>
              <input
                required={Boolean(f.is_required)}
                value={vals[String(f.id)] ?? ''}
                onChange={(e) => setVals({ ...vals, [String(f.id)]: e.target.value })}
                className="field focus:field-focus outline-none"
              />
            </label>
          ))}

          {msg && (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm ${
                msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {msg.kind === 'ok' && <CheckCircle2 className="h-4 w-4" />}
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="accent-bg flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save product'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
