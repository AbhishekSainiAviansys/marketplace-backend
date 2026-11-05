/** Admin -> Categories main page. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ArrowRight, Trash2, Pencil, ImageUp, Loader2 } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Modal } from '@ui'
import { assetUrl } from '@lib/brand'

type CategoryField = {
  id: number
  category_id: number
  field_name: string
  field_label: string
  field_type: string
  options: string[] | null
  is_required: boolean
  sort_order: number
}

type Category = {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null

  is_active: boolean
  fields: CategoryField[]
}

const FIELD_TYPES = ['text', 'number', 'textarea', 'select', 'file', 'date', 'checkbox'] as const

export function Categories() {
  const [rows, setRows] = useState<Category[]>([])
  const [status, setStatus] = useState<'' | 'Active' | 'Inactive'>('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [, setErr] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [, setCatId] = useState<number | null>(null)
  const [, setCat] = useState<Category | null>(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const iconRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: '', is_active: true })
  const [editId, setEditId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const [fieldsCategoryId, setFieldsCategoryId] = useState<number | null>(null)
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [fieldBusy, setFieldBusy] = useState<number | null>(null)
  const [fieldForm, setFieldForm] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    optionsText: '',
    is_required: false,
    sort_order: '0',
  })

  const timer = useRef<number | undefined>(undefined)

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text })
    window.setTimeout(() => setMsg(null), 4000)
  }

  const load = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/categories')
      .then((r) => {
        const data = r.data as Category[]
        setRows(data)
        setErr('')
      })
      .catch((e) => setErr(errMsg(e, 'Could not load categories.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setQ(q.trim()) }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q])

  const pickTab = (key: '' | 'Active' | 'Inactive') => { setStatus(key) }

  const openCategory = (id: number) => {
    setCatId(id)
    const c = rows.find((r) => r.id === id)
    setCat(c ?? null)
  }

  const filtered = rows.filter((r) => {
    if (status === 'Active' && !r.is_active) return false
    if (status === 'Inactive' && r.is_active) return false
    const s = q.toLowerCase()
    if (s && !r.name.toLowerCase().includes(s) && !r.slug.toLowerCase().includes(s)) return false
    return true
  })

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusyId(-1)
    try {
      await api.post('/admin/categories', form)
      flash('ok', 'Category created')
      setForm({ name: '', slug: '', description: '', icon: '', is_active: true })
      setShowAdd(false)
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Create failed') })
    } finally {
      setBusyId(null)
    }
  }

  const updateCategory = async (e: React.FormEvent) => {
    if (!editId) return
    e.preventDefault()
    setMsg(null)
    setBusyId(editId)
    try {
      await api.put('/admin/categories/' + editId, form)
      flash('ok', 'Category updated')
      setEditId(null)
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Update failed') })
    } finally {
      setBusyId(null)
    }
  }
  const uploadIcon = async (file: File) => {
    setUploadingIcon(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('folder', 'categories')
      const { data } = await api.post('/upload/image', fd)
      setForm((f) => ({ ...f, icon: data.url }))
      flash('ok', 'Icon uploaded')
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Icon upload failed') })
    } finally {
      setUploadingIcon(false)
      if (iconRef.current) iconRef.current.value = ''
    }
  }

  const removeIcon = () => setForm((f) => ({ ...f, icon: '' }))

  const uploadCategoryIcon = async (c: Category, file: File) => {
    setBusyId(c.id)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('folder', 'categories')
      const { data } = await api.post('/upload/image', fd)
      await api.put('/admin/categories/' + c.id, { ...c, icon: data.url })
      flash('ok', 'Icon uploaded')
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Icon upload failed') })
    } finally {
      setBusyId(null)
    }
  }



  const deleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category? This will also delete its fields.')) return
    setMsg(null)
    setBusyId(id)
    try {
      await api.delete('/admin/categories/' + id)
      flash('ok', 'Category deleted')
      if (fieldsCategoryId === id) setFieldsCategoryId(null)
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Delete failed') })
    } finally {
      setBusyId(null)
    }
  }

  const startEdit = (c: Category) => {
    setShowAdd(false)
    setEditId(c.id)
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', icon: c.icon ?? '', is_active: c.is_active })
  }

  const selectedCategory = rows.find((r) => r.id === fieldsCategoryId) ?? null

  const resetFieldForm = () => {
    setEditingFieldId(null)
    setFieldForm({ field_name: '', field_label: '', field_type: 'text', optionsText: '', is_required: false, sort_order: '0' })
  }

  const openFields = (c: Category) => {
    setFieldsCategoryId(c.id)
    resetFieldForm()
  }

  const closeFields = () => {
    setFieldsCategoryId(null)
    resetFieldForm()
  }

  const parseOptions = (text: string) =>
    text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const startEditField = (f: CategoryField) => {
    setEditingFieldId(f.id)
    setFieldForm({
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type,
      optionsText: (f.options ?? []).join(', '),
      is_required: f.is_required,
      sort_order: String(f.sort_order ?? 0),
    })
  }

  const submitField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fieldsCategoryId) return
    setMsg(null)
    const payload: any = {
      field_name: fieldForm.field_name.trim(),
      field_label: fieldForm.field_label.trim(),
      field_type: fieldForm.field_type,
      is_required: fieldForm.is_required,
      sort_order: Number(fieldForm.sort_order) || 0,
      options: fieldForm.field_type === 'select' ? parseOptions(fieldForm.optionsText) : null,
    }
    setFieldBusy(editingFieldId ?? -1)
    try {
      if (editingFieldId) {
        await api.put('/admin/category-fields/' + editingFieldId, payload)
        flash('ok', 'Field updated')
      } else {
        await api.post('/admin/category-fields', { ...payload, category_id: fieldsCategoryId })
        flash('ok', 'Field added')
      }
      resetFieldForm()
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Field save failed') })
    } finally {
      setFieldBusy(null)
    }
  }

  const deleteField = async (id: number) => {
    if (!window.confirm('Delete this field?')) return
    setMsg(null)
    setFieldBusy(id)
    try {
      await api.delete('/admin/category-fields/' + id)
      flash('ok', 'Field deleted')
      if (editingFieldId === id) resetFieldForm()
      load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Delete failed') })
    } finally {
      setFieldBusy(null)
    }
  }

  const badge = (active: boolean) => (active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700')

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Categories</h2>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setForm({ name: '', slug: '', description: '', icon: '', is_active: true }) }}
            className="btn accent-bg !py-2 !px-4 flex items-center gap-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <select
            aria-label="Filter by status"
            className="field !py-2 !text-sm"
            value={status}
            onChange={(e) => pickTab(e.target.value as '' | 'Active' | 'Inactive')}
          >
            <option value="">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <input
            aria-label="Search categories"
            className="field !py-2 !text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or slug..."
          />
          <div className="flex items-center justify-end sm:col-span-2">
            <span className="text-xs text-slate-500">Showing {filtered.length} of {rows.length}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm ${msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {msg.kind === 'ok' && <span className="h-4 w-4" />}
          {msg.text}
        </div>
      )}
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
          <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-600" /> Loading categories ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500">No categories match your filter.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Icon</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Slug</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fields</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3">
                      {assetUrl(c.icon) ? (
                        <img src={assetUrl(c.icon)!} alt={c.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <label className={`btn btn-secondary !px-2.5 !py-1 !text-xs cursor-pointer ${busyId === c.id ? 'opacity-60 pointer-events-none' : ''}`}>
                          <ImageUp className="h-3.5 w-3.5" /> Add icon
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busyId === c.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) void uploadCategoryIcon(c, f)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openCategory(c.id)}
                        className="text-left flex items-center gap-2"
                      >
                        <span className="block text-sm font-semibold text-slate-900">{c.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{c.slug}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{c.description ?? 'No description available'}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{c.fields?.length ?? 0}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badge(c.is_active)}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                          disabled={busyId === c.id}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openFields(c)}
                          className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                        >
                          Fields
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(c.id)}
                          className="btn !px-3 !py-1.5 !text-xs !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60"
                          disabled={busyId === c.id}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Category" onClose={() => { setShowAdd(false); setForm({ name: '', slug: '', description: '', icon: '', is_active: true }) }}>
          <form onSubmit={addCategory} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Category name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Books"
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Slug</span>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. books"
                className="field focus:field-focus outline-none"
              />
            </label>
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Icon</span>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                  {assetUrl(form.icon) ? (
                    <img src={assetUrl(form.icon)!} alt="Category icon" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] leading-tight text-center text-slate-400">No icon</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={iconRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingIcon}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void uploadIcon(f)
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingIcon}
                    onClick={() => iconRef.current?.click()}
                    className="accent-bg inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                  >
                    {uploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                    {uploadingIcon ? 'Uploading…' : form.icon ? 'Replace icon' : 'Add icon'}
                  </button>
                  {form.icon && (
                    <button
                      type="button"
                      onClick={removeIcon}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>


            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Optional description"
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-slate-300 text-accent"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setForm({ name: '', slug: '', description: '', icon: '', is_active: true }) }} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
              <button type="submit" disabled={busyId === -1} className="accent-bg !py-2 !text-sm text-white">Save category</button>
            </div>
          </form>
        </Modal>
      )}

      {editId !== null && (
        <Modal title="Edit Category" onClose={() => setEditId(null)}>
          <form onSubmit={updateCategory} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Category name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Slug</span>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="field focus:field-focus outline-none"
              />
            </label>
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Icon</span>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                  {assetUrl(form.icon) ? (
                    <img src={assetUrl(form.icon)!} alt="Category icon" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] leading-tight text-center text-slate-400">No icon</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={iconRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingIcon}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void uploadIcon(f)
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingIcon}
                    onClick={() => iconRef.current?.click()}
                    className="accent-bg inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                  >
                    {uploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                    {uploadingIcon ? 'Uploading…' : form.icon ? 'Replace icon' : 'Add icon'}
                  </button>
                  {form.icon && (
                    <button
                      type="button"
                      onClick={removeIcon}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>


            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="field focus:field-focus outline-none"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-slate-300 text-accent"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditId(null)} className="btn btn-secondary !py-2 !text-sm">Cancel</button>
              <button type="submit" disabled={busyId === editId} className="accent-bg !py-2 !text-sm text-white">Save changes</button>
            </div>
          </form>
        </Modal>
      )}

      {fieldsCategoryId !== null && selectedCategory && (
        <Modal title={`Fields for ${selectedCategory.name}`} sub="Manage the dynamic fields collected for products in this category." wide onClose={closeFields}>
          <div className="mt-2 space-y-5">
            <form onSubmit={submitField} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingFieldId ? 'Edit field' : 'Add new field'}
                </h3>
                {editingFieldId && (
                  <button type="button" onClick={resetFieldForm} className="text-xs text-slate-500 hover:text-slate-700">
                    Cancel edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Field name (key)</span>
                  <input
                    required
                    value={fieldForm.field_name}
                    onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value })}
                    placeholder="e.g. author"
                    className="field !py-2 !text-sm focus:field-focus outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Field label</span>
                  <input
                    required
                    value={fieldForm.field_label}
                    onChange={(e) => setFieldForm({ ...fieldForm, field_label: e.target.value })}
                    placeholder="e.g. Author"
                    className="field !py-2 !text-sm focus:field-focus outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Field type</span>
                  <select
                    value={fieldForm.field_type}
                    onChange={(e) => setFieldForm({ ...fieldForm, field_type: e.target.value })}
                    className="field !py-2 !text-sm focus:field-focus outline-none"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Sort order</span>
                  <input
                    type="number"
                    min={0}
                    value={fieldForm.sort_order}
                    onChange={(e) => setFieldForm({ ...fieldForm, sort_order: e.target.value })}
                    className="field !py-2 !text-sm focus:field-focus outline-none"
                  />
                </label>
              </div>
              {fieldForm.field_type === 'select' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">Options (comma separated)</span>
                  <textarea
                    value={fieldForm.optionsText}
                    onChange={(e) => setFieldForm({ ...fieldForm, optionsText: e.target.value })}
                    rows={2}
                    placeholder="e.g. steel, plastic, copper"
                    className="field focus:field-focus outline-none"
                  />
                </label>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldForm.is_required}
                  onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })}
                  className="rounded border-slate-300 text-accent"
                />
                <span className="text-sm text-slate-700">Required</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={fieldBusy !== null}
                  className="accent-bg !py-2 !px-4 !text-sm text-white"
                >
                  {editingFieldId ? 'Update field' : 'Add field'}
                </button>
              </div>
            </form>

            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Order</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Label</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Name</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Required</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Options</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCategory.fields ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                          No fields yet. Add one above.
                        </td>
                      </tr>
                    ) : (
                      (selectedCategory.fields ?? []).map((f) => (
                        <tr key={f.id} className="transition hover:bg-slate-50/60">
                          <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{f.sort_order}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-900">{f.field_label}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{f.field_name}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{f.field_type}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">{f.is_required ? 'Yes' : 'No'}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">{(f.options ?? []).join(', ') || 'No options available'}</td>
                          <td className="border-b border-slate-100 px-3 py-2">
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditField(f)}
                                disabled={fieldBusy === f.id}
                                className="btn btn-secondary !px-2.5 !py-1 !text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteField(f.id)}
                                disabled={fieldBusy === f.id}
                                className="btn !px-2.5 !py-1 !text-xs !bg-red-600 !text-white hover:!bg-red-700 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
