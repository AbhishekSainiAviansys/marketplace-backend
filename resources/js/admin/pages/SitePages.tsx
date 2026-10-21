/**
 * Admin → Pages & Footer.
 * Policies (plain text), contact details + social links — all admin-managed.
 * Saves as three settings keys (site_pages, contact_info, social_links).
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Plus, Save, X } from 'lucide-react'
import { api, errMsg } from '@lib/api'

import {
  DEFAULT_CONTACT, DEFAULT_PAGES, NETWORKS, PAGE_LABELS,
  type ContactInfo, type PageBody, type PageKey, type SocialLink,
} from '../../student/data/site'

export type { ContactInfo, PageBody, PageKey, SocialLink }
export { DEFAULT_CONTACT, DEFAULT_PAGES }

type Row = { key: string; value: string }

const parseJson = <T,>(raw: string | undefined | null, fb: T): T => {
  if (!raw) return fb
  try { return JSON.parse(raw) as T } catch { return fb }
}

export function SitePages() {
  const [pages, setPages] = useState<Record<PageKey, PageBody>>(DEFAULT_PAGES)
  const [contact, setContact] = useState<ContactInfo>(DEFAULT_CONTACT)
  const [socials, setSocials] = useState<SocialLink[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get<Row[]>('/admin/settings')
      .then(({ data }) => {
        const byKey = new Map(data.map((x) => [x.key, x.value]))
        const sp = parseJson<Partial<Record<PageKey, PageBody>>>(byKey.get('site_pages'), {})
        setPages({
          privacy: { ...DEFAULT_PAGES.privacy, ...(sp.privacy ?? {}) },
          return: { ...DEFAULT_PAGES.return, ...(sp.return ?? {}) },
          refund: { ...DEFAULT_PAGES.refund, ...(sp.refund ?? {}) },
          terms: { ...DEFAULT_PAGES.terms, ...(sp.terms ?? {}) },
        })
        const c = parseJson<Partial<ContactInfo>>(byKey.get('contact_info'), {})
        setContact({ ...DEFAULT_CONTACT, ...c })
        const sl = parseJson<SocialLink[]>(byKey.get('social_links'), [])
        setSocials(Array.isArray(sl) ? sl.filter((s) => s?.url?.trim()) : [])
      })
      .catch((err) => setMsg({ kind: 'err', text: errMsg(err, 'API offline?') }))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      await api.put('/admin/settings', {
        settings: {
          site_pages: pages,
          contact_info: contact,
          social_links: socials.filter((s) => s.url.trim()),
        },
      })
      setMsg({ kind: 'ok', text: 'Saved — storefront updates on next load' })
    } catch (err) {
      setMsg({ kind: 'err', text: errMsg(err, 'Save failed') })
    } finally {
      setBusy(false)
    }
  }

  const setPage = (k: PageKey, patch: Partial<PageBody>) =>
    setPages((p) => ({ ...p, [k]: { ...p[k], ...patch } }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Pages & Footer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Policy pages, contact details and social links in the storefront footer.
        </p>
      </header>

      <form onSubmit={save} className="space-y-6">
        {(Object.keys(PAGE_LABELS) as PageKey[]).map((k) => (
          <section key={k} className="card p-6">
            <h3 className="text-base font-bold text-slate-900">{PAGE_LABELS[k]}</h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
                <input value={pages[k].title} onChange={(e) => setPage(k, { title: e.target.value })}
                  className="field focus:field-focus outline-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Text</span>
                <textarea value={pages[k].body} onChange={(e) => setPage(k, { body: e.target.value })}
                  rows={6} className="field focus:field-focus outline-none" />
              </label>
            </div>
          </section>
        ))}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Contact details</h3>
          <p className="mt-1 text-sm text-slate-500">Blank fields are hidden on the storefront.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
              <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                className="field focus:field-focus outline-none" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="field focus:field-focus outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
              <input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })}
                className="field focus:field-focus outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Hours</span>
              <input value={contact.hours} onChange={(e) => setContact({ ...contact, hours: e.target.value })}
                className="field focus:field-focus outline-none" />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Social links</h3>
          <p className="mt-1 text-sm text-slate-500">Icon buttons under the footer brand. Rows without a URL are ignored.</p>
          <div className="mt-4 space-y-2">
            {socials.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={s.network}
                  onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, network: e.target.value } : x)))}
                  className="field focus:field-focus w-36 shrink-0 outline-none">
                  {NETWORKS.map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
                <input value={s.url} placeholder="https://…"
                  onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                  className="field focus:field-focus outline-none" />
                <button type="button" aria-label="Remove link"
                  onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                  className="btn btn-ghost btn-icon shrink-0 !p-2 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => setSocials([...socials, { network: NETWORKS[socials.length % NETWORKS.length], url: '' }])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add social link
            </button>
          </div>
        </section>

        <div className="card flex flex-wrap items-center gap-3 p-5">
          <button type="submit" disabled={busy}
            className="accent-bg inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? 'Saving…' : 'Save pages & footer'}
          </button>
          {msg && (
            <p role="status" className={`flex items-center gap-1.5 text-sm ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {msg.kind === 'ok' && <CheckCircle2 className="h-4 w-4" />}{msg.text}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

