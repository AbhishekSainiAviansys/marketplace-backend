import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImageUp, Loader2, Save, Send, Trash2 } from 'lucide-react'
import { api, apiOrigin, errMsg } from '@lib/api'
import { assetUrl, useBrand } from '@lib/brand'

type Row = { key: string; value: string; group: string; is_secret: number | boolean }

const GROUPS: Record<string, { label: string; blurb: string }> = {
  branding: { label: 'Branding', blurb: 'Shown in the sidebar and on every login page.' },
  payment: { label: 'Payments', blurb: 'Razorpay keys, webhook secret and payment mode.' },
  mail: { label: 'Mail', blurb: 'Outgoing mail configuration.' },
  otp: { label: 'OTP', blurb: 'One-time-password behaviour.' },
  general: { label: 'General', blurb: 'Everything else.' },
  home: { label: 'Home content', blurb: 'Managed on the dedicated Home content page.' },
}

export function Settings() {
  const [rows, setRows] = useState<Row[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mail, setMail] = useState('test@gmail.com')
  const fileRef = useRef<HTMLInputElement>(null)
  const { appName } = useBrand()

  const load = async () => {
    const { data } = await api.get<Row[]>('/admin/settings')
    // home_*/site_* keys are structured JSON owned by dedicated pages
    // (Home content, Pages & Footer) — hidden here so nobody edits raw JSON.
    const visible = data.filter((x) => !x.key.startsWith('home_') && !['site_pages', 'contact_info', 'social_links'].includes(x.key))
    setRows(visible)
    const o: Record<string, string> = {}
    visible.forEach((x) => (o[x.key] = x.is_secret ? '' : (x.value ?? '')))
    setForm(o)
  }

  useEffect(() => {
    load().catch(() => setMsg({ kind: 'err', text: 'API offline – is Laravel running on :8001?' }))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      const clean: Record<string, string> = {}
      // Secrets stay untouched when the field is left blank.
      Object.keys(form).forEach((k) => {
        if (form[k] !== '') clean[k] = form[k]
      })
      await api.put('/admin/settings', { settings: clean })
      setMsg({ kind: 'ok', text: 'Settings saved' })
      await load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Save failed') })
    } finally {
      setBusy(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setUploading(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('folder', 'branding')
      const { data } = await api.post('/upload/image', fd)
      await api.put('/admin/settings', { settings: { branding_logo: data.url } })
      setMsg({ kind: 'ok', text: 'Logo uploaded — it now appears on all three panels' })
      await load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Logo upload failed') })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeLogo = async () => {
    setMsg(null)
    try {
      await api.put('/admin/settings', { settings: { branding_logo: '' } })
      setMsg({ kind: 'ok', text: 'Logo removed' })
      await load()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Could not remove logo') })
    }
  }

  const testMail = async () => {
    setMsg(null)
    try {
      const { data } = await api.post('/admin/settings/test-mail', { email: mail })
      setMsg({ kind: 'ok', text: `Mail sent to ${data.sent_to} via ${data.via} (${data.host})` })
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e, 'Mail test failed') })
    }
  }

  const logo = assetUrl(form.branding_logo)
  const EXPLICIT_KEYS = new Set(['branding_logo', 'app_name', 'brand_primary', 'brand_secondary', 'button_style'])
  const grouped = Object.keys(GROUPS)
    .map((g) => [g, rows.filter((r) => (r.group || 'general') === g && !EXPLICIT_KEYS.has(r.key))] as const)
    .filter(([, list]) => list.length > 0)
return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Admin settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Everything here is stored in the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">settings</code> table
          for {appName}.
        </p>
      </div>

      {/* Logo upload - the logo appears in the sidebar of all 3 panels + login pages */}
      <section className="card p-6">
        <h3 className="text-base font-bold text-slate-900">Logo</h3>
        <p className="mt-1 text-sm text-slate-500">
          PNG, JPG or SVG up to 2&nbsp;MB. Square works best — it is shown in the sidebar and on every login page.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="flex h-28 w-56 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
            {logo ? (
              <img src={logo} alt="Current logo" className="max-h-20 max-w-full object-contain" />
            ) : (
              <span className="text-center text-[11px] leading-tight font-semibold text-slate-400">
                Logo space
                <br />
                <span className="font-normal">nothing uploaded yet</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadLogo(f)
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="accent-bg inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              {uploading ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
            </button>

            {logo && (
              <button
                type="button"
                onClick={removeLogo}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Application name</span>
            <input
              value={form.app_name ?? ''}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              placeholder="Marketplace"
              className="field focus:field-focus outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Brand colour</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(form.brand_primary ?? '') ? form.brand_primary : '#4f46e5'}
                onChange={(e) => setForm({ ...form, brand_primary: e.target.value })}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <input
                value={form.brand_primary ?? ''}
                onChange={(e) => setForm({ ...form, brand_primary: e.target.value })}
                placeholder="#4f46e5"
                className="field focus:field-focus outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Secondary colour (gradient end)</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(form.brand_secondary ?? '') ? form.brand_secondary : '#0ea5e9'}
                onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <input
                value={form.brand_secondary ?? ''}
                onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })}
                placeholder="#0ea5e9"
                className="field focus:field-focus outline-none"
              />
            </div>
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Button style</span>
            <div className="flex gap-2">
              {(['solid', 'gradient'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, button_style: s })}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition ${((form.button_style ?? 'solid') === s) ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Solid = flat brand colour. Gradient = brand → secondary.</p>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Live preview</span>
            <div className="flex gap-2">
              <span
                className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={(form.button_style ?? 'solid') === 'gradient'
                  ? { backgroundImage: `linear-gradient(135deg, ${form.brand_primary || '#4f46e5'}, ${form.brand_secondary || '#0ea5e9'})` }
                  : { backgroundColor: form.brand_primary || '#4f46e5' }}
              >
                Shop now
              </span>
              <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                Secondary
              </span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">Brand colour, secondary colour and button style apply to all panels. Press “Save settings” below.</p>
      </section>
      <form onSubmit={save} className="space-y-6">
        {grouped.map(([group, list]) => (
          <section key={group} className="card p-6">
            <h3 className="text-base font-bold text-slate-900">{GROUPS[group]?.label ?? group}</h3>
            <p className="mt-1 text-sm text-slate-500">{GROUPS[group]?.blurb}</p>
            <div className="mt-5 space-y-4">
              {list.map((r) => (
                <label key={r.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    {r.key}
                    {r.is_secret ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">secret — leave blank to keep</span>
                    ) : null}
                  </span>
                  <input
                    type={r.is_secret ? 'password' : 'text'}
                    value={form[r.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [r.key]: e.target.value })}
                    placeholder={r.is_secret ? '••••••••' : r.value}
                    className="field focus:field-focus outline-none"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="card flex flex-wrap items-center gap-3 p-5">
          <button
            type="submit"
            disabled={busy}
            className="accent-bg inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? 'Saving…' : 'Save settings'}
          </button>
          <p className="text-xs text-slate-500">
            Razorpay webhook URL:{' '}
            <code>{apiOrigin()}/api/v1/payments/webhook</code>
            <span className="ml-1 text-slate-400">
              (paste this in the Razorpay dashboard — it follows the domain you are on)
            </span>
          </p>
        </div>
      </form>

      {/* Test mail */}
      <section className="card p-6">
        <h3 className="text-base font-bold text-slate-900">Test mail</h3>
        <p className="mt-1 text-sm text-slate-500">Local mail is captured by Mailpit on http://localhost:8025</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="you@example.com"
            className="field focus:field-focus max-w-xs outline-none"
          />
          <button
            type="button"
            onClick={testMail}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Send className="h-4 w-4" /> Send test mail
          </button>
        </div>
      </section>

      {msg && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            msg.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {msg.kind === 'ok' && <CheckCircle2 className="h-4 w-4" />}
          {msg.text}
        </div>
      )}
    </div>
  )
}