import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, PackagePlus, UploadCloud, X } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { useToast } from '@ui'

type Cat = { id: number; name: string }
type CatField = {
  id: number
  field_name: string
  field_label: string
  field_type: string
  options: string[] | null
  is_required: number | boolean
  sort_order?: number
}

// Step1: pick ONE category -> Step2: dynamic fields (diagram requirement)
export function ProductForm({ prefix, id: idProp }: { prefix: string; id?: string }) {
  const params = useParams<{ id?: string }>()
  const id = idProp ?? params.id
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [cats, setCats] = useState<Cat[]>([])
  const [catId, setCatId] = useState('')
  const [fields, setFields] = useState<CatField[]>([])
  const [form, setForm] = useState({ name: '', price: '', mrp: '', delivery_charge: '', portal_charge: '', server_charge: '', stock: 0, delivery_mode: 'self', is_boost: false, boost_until: '' })
  const [vals, setVals] = useState<Record<string, string>>({})
  const [images, setImages] = useState<string[]>([])
  const mrpNum = Number(form.mrp || 0)
  const priceNum = Number(form.price || 0)
  const discountAmount = mrpNum > priceNum && mrpNum > 0 ? mrpNum - priceNum : 0
  const discountPercent = mrpNum > 0 ? Math.round((discountAmount / mrpNum) * 100) : 0
  const estimatedDeliveryCharge = form.delivery_mode === 'school_pickup' ? 0 : form.delivery_mode === 'thirdparty' ? 99 : (priceNum >= 999 ? 0 : 49)
  const deliveryChargeInput = form.delivery_charge === '' ? null : Number(form.delivery_charge)
  const deliveryCharge = deliveryChargeInput === null || Number.isNaN(deliveryChargeInput) ? estimatedDeliveryCharge : deliveryChargeInput
  const payableAmount = priceNum + deliveryCharge
  const [uploading, setUploading] = useState(false)
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

  useEffect(() => {
    if (!id) return
    api
      .get(`/${prefix}/products/${id}`)
      .then(async (r) => {
        const p = r.data
        setCatId(p.category_id ? String(p.category_id) : '')
        if (p.category_id) {
          try {
            const { data } = await api.get(`/categories/${p.category_id}/fields`)
            setFields(data)
          } catch {
            setFields([])
          }
        }
        setForm({
          name: p.name ?? '',
          price: p.price ?? '',
          mrp: p.mrp ?? '',
          delivery_charge: p.delivery_charge ?? '',
          portal_charge: p.portal_charge ?? '',
          server_charge: p.server_charge ?? '',
          stock: p.stock ?? 0,
          delivery_mode: p.delivery_mode ?? 'self',
          is_boost: !!p.is_boost,
          boost_until: p.boost_until ? String(p.boost_until).slice(0, 10) : '',
        })
        const vmap: Record<string, string> = {}
        for (const v of p.values ?? []) vmap[String(v.field_id)] = v.value_text ?? ''
        setVals(vmap)
        setImages((p.images ?? []).map((img: { url?: string }) => img.url).filter(Boolean))
      })
      .catch((e) => toast('err', errMsg(e, 'Could not load product')))
  }, [id, prefix])

  const pick = async (id: string) => {
    setCatId(id)
    setVals({})
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

  const uploadImages = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of list) {
        const fd = new FormData()
        fd.append('image', file)
        fd.append('folder', 'products')
        const { data } = await api.post('/upload/image', fd)
        if (data?.url) uploaded.push(data.url)
      }
      setImages((prev) => [...prev, ...uploaded])
      if (uploaded.length) toast('ok', `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded`)
    } catch (e) {
      toast('err', errMsg(e, 'Image upload failed'))
    } finally {
      setUploading(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length === 0) {
      toast('err', 'At least one product image with no background is required.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        ...form,
        category_id: Number(catId),
        fields: vals,
        images,
        is_boost: form.is_boost,
        boost_until: form.boost_until || null,
        delivery_charge: form.delivery_charge === '' ? null : Number(form.delivery_charge),
        portal_charge: form.portal_charge === '' ? null : Number(form.portal_charge),
        server_charge: form.server_charge === '' ? null : Number(form.server_charge),
      }
      if (isEdit && id) {
        await api.put(`/${prefix}/products/${id}`, payload)
        toast('ok', 'Product updated successfully')
      } else {
        await api.post(`/${prefix}/products`, payload)
        toast('ok', 'Product saved successfully')
      }
      navigate('/products')
    } catch (e) {
      toast('err', errMsg(e, 'Save failed'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="accent-bg flex h-9 w-9 items-center justify-center rounded-xl text-white">
            <PackagePlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit product' : 'Add product'}</h2>
            <p className="text-xs text-slate-500">{isEdit ? 'Update product details.' : 'Step 1 - choose one category. Step 2 - fill its fields.'}</p>
          </div>
        </div>
        <button
          type="submit"
          form="product-form"
          disabled={busy || catId === ''}
          className="accent-bg flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            'Save product'
          )}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
        <select value={catId} onChange={(e) => pick(e.target.value)} disabled={isEdit} className="field focus:field-focus outline-none">
          <option value="">-- choose a category --</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {catId && (
        <form id="product-form" onSubmit={save} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
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

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">MRP</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                placeholder="0.00"
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Discounted price per piece</span>
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

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Delivery charge (optional override)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.delivery_charge}
              onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })}
              placeholder="Leave blank to estimate"
              className="field focus:field-focus outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Portal charge (optional, included in price, internal)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.portal_charge}
              onChange={(e) => setForm({ ...form, portal_charge: e.target.value })}
              placeholder="Leave blank if none"
              className="field focus:field-focus outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Server charge (optional, included in price, internal)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.server_charge}
              onChange={(e) => setForm({ ...form, server_charge: e.target.value })}
              placeholder="Leave blank if none"
              className="field focus:field-focus outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 pt-7">
              <input
                type="checkbox"
                checked={form.is_boost}
                onChange={(e) => setForm({ ...form, is_boost: e.target.checked })}
                className="rounded border-slate-300 text-accent"
              />
              <span className="text-sm font-medium text-slate-700">Boost this product</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Boost until (optional)</span>
              <input
                type="date"
                value={form.boost_until}
                onChange={(e) => setForm({ ...form, boost_until: e.target.value })}
                className="field focus:field-focus outline-none"
              />
            </label>
          </div>

           {fields.map((f) => {
             const key = String(f.id)
             const required = Boolean(f.is_required)
             const value = vals[key] ?? ''
             const onChange = (v: string) => setVals({ ...vals, [key]: v })
             let input: React.ReactNode
             switch (f.field_type) {
               case 'textarea':
                 input = <textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="field focus:field-focus outline-none" />
                 break
               case 'number':
                 input = <input required={required} type="number" value={value} onChange={(e) => onChange(e.target.value)} className="field focus:field-focus outline-none" />
                 break
               case 'date':
                 input = <input required={required} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="field focus:field-focus outline-none" />
                 break
               case 'select':
                 input = (
                   <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="field focus:field-focus outline-none">
                     <option value="">-- select --</option>
                     {(f.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                 )
                 break
               case 'checkbox':
                 input = (
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={value === '1' || value === 'true'} onChange={(e) => onChange(e.target.checked ? '1' : '0')} className="rounded border-slate-300 text-accent" />
                     <span className="text-sm text-slate-700">{f.field_label}</span>
                   </label>
                 )
                 break
               case 'file':
                 input = <input required={required} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="File URL or path" className="field focus:field-focus outline-none" />
                 break
               default:
                 input = <input required={required} type="text" value={value} onChange={(e) => onChange(e.target.value)} className="field focus:field-focus outline-none" />
             }
             return (
               <label key={key} className="block">
                 {f.field_type !== 'checkbox' && (
                   <span className="mb-1.5 block text-sm font-medium text-slate-700">
                     {String(f.field_label)}
                     {required ? <span className="text-red-500"> *</span> : null}
                   </span>
                 )}
                 {input}
               </label>
             )
           })}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">Price breakdown</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">MRP</span><span className="tnum font-medium">₹{mrpNum.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Discounted price</span><span className="tnum font-medium">₹{priceNum.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="tnum font-medium">₹{discountAmount.toFixed(2)} ({discountPercent}%)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Delivery charge</span><span className="tnum font-medium">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold"><span>Payable amount</span><span className="tnum">₹{payableAmount.toFixed(2)}</span></div>
              </div>
              {mrpNum > 0 && priceNum > mrpNum && (
                <p className="mt-2 text-xs font-medium text-red-500">Discounted price cannot exceed MRP.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Product image (no background) <span className="text-red-500">*</span>
                </span>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600">
                  <UploadCloud className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const files = e.target.files
                      if (files && files.length) void uploadImages(files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Upload a product image with no background (transparent/white background). At least one image is required.
              </p>
              {images.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {images.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative">
                      <img src={url} alt="Product" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-red-500">Required: upload at least one image with no background.</p>
              )}
            </div>

        </form>
      )}
    </div>
  )
}
