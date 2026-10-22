/**
 * Admin → Home content.
 *
 * Edits the storefront's home page without touching code:
 *   • section visibility (hero, banners, trust, ticker, promos, deals, live,
 *     quotes, boosted row, random row)
 *   • hero copy for logged-out visitors (logged-in copy stays personalized)
 *   • ticker items + banner slides (add / remove / reorder)
 *   • boosted ("featured") product picker + random-picks count
 *
 * Everything saves as two settings keys (home_content, home_boost_ids) via the
 * existing bulk PUT /admin/settings endpoint; the student app reads them from
 * the unauthenticated GET /settings/public.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Plus, Save, Search, Star, Trash2, X } from 'lucide-react'
import { api, errMsg } from '@lib/api'

export type SectionKey =
  | 'hero' | 'banners' | 'trust' | 'ticker' | 'promos'
  | 'deals' | 'dealStrip' | 'live' | 'quotes' | 'boost' | 'random' | 'marquee' | 'vendor' | 'school' | 'directory'

export type Slide = {
  eyebrow: string; title: string; highlight: string; sub: string
  cta: string; to: string; image: string; chip: string
}

export type TrustRow = { title: string; sub: string }
export type PromoRow = {
  tag: string; title: string; sub: string; cta: string; to: string
  image: string; tint: string; countdown?: boolean
}
export type ScheduleRow = { time: string; title: string }
export type LiveStepRow = { title: string; sub: string }
export type QuoteRow = { quote: string; name: string; role: string }

export type Content = {
  sections: Record<SectionKey, boolean>
  hero: { badge: string; headline: string; highlight: string; sub: string }
  ticker: string[]
  banners: Slide[]
  random_count: number
  headings: {
    deals: string; dealsChip: string; dealsTip: string
    dealStripTitle: string
    quotesEyebrow: string; quotesTitle: string
    boostEyebrow: string; boostTitle: string
    randomEyebrow: string; randomTitle: string
    marqueeEyebrow: string; marqueeTitle: string
  }
  trust: TrustRow[]
  promos: PromoRow[]
  live: {
    kicker: string; title: string; sub: string
    schedule: ScheduleRow[]; steps: LiveStepRow[]
  }
  quotes: QuoteRow[]
  vendor: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  school: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  directory: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  footer: { blurb: string; promise: string; bottom: string }
}

/** Mirrors the home page's render order (student/pages/Home.tsx), top to bottom. */
export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero banner', banners: 'Gallery banner slider',
  marquee: 'Moving product rows (auto-scroll)', boost: 'Boosted (featured) products',
  trust: 'Trust strip', ticker: 'Offer ticker', promos: 'Promo cards',
  deals: 'Deal of the day', dealStrip: 'Deal of the day — moving promo row',
  random: 'Random picks', live: 'Live class section',
  directory: 'Institute directory (students)', school: 'Register-as-school / institute',
  vendor: 'Vendor / seller section', quotes: 'Testimonials',
}

/** Mirrors the built-in defaults in student/store/homeConfig.ts — shown until the
 *  admin saves an override. */
const DEFAULT: Content = {
  sections: {
    hero: true, banners: true, trust: true, ticker: true, promos: true,
    deals: true, dealStrip: true, live: true, quotes: true, boost: true, random: true, marquee: true, vendor: true, school: true, directory: true,
  },
  hero: {
    badge: 'Admissions week · up to 30% off bundles',
    headline: 'The school shop that feels like homework,',
    highlight: 'minus the homework.',
    sub: 'Books, bundles and bottles linked to your school — pay online or COD, collect at school or home.',
  },
  ticker: [
    'FLAT 20% OFF on Book Bundles',
    'Free pickup from your school',
    'COD available — pay at pickup',
    'Exam-week sale ends Sunday',
    'New here? Register with your school code',
    'Steel bottles from ₹249',
  ],
  banners: [
    {
      eyebrow: 'Season sale', title: 'Full class sets at', highlight: '25% off',
      sub: 'Maths, Science, English + notebooks — one box, one price, school pickup.',
      cta: 'Shop bundles', to: '/shop?cat=Book Bundle',
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1600&q=80',
      chip: 'Ends Sunday',
    },
    {
      eyebrow: 'Hydration upgrade', title: 'Steel bottles from', highlight: '₹249',
      sub: 'Leak-proof, playground-tough, fits every school bag side pocket.',
      cta: 'Shop bottles', to: '/shop?cat=Water Bottle',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1600&q=80',
      chip: 'New colours',
    },
    {
      eyebrow: 'Zero delivery fee', title: 'Free pickup from', highlight: 'your school',
      sub: 'Order today, collect at the school office this week. COD also works at pickup.',
      cta: 'See top deals', to: '/shop?sort=off',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
      chip: 'Most loved',
    },
  ],
  random_count: 6,
  headings: {
    deals: 'Deal of the day', dealsChip: 'ends tonight',
    dealsTip: 'Tip: hit “Add to cart” right on a deal — no page jump needed.',
    dealStripTitle: 'More deals',
    quotesEyebrow: 'Wall of love', quotesTitle: 'Parents said it better than us',
    boostEyebrow: 'Hand-picked', boostTitle: 'Featured picks',
    randomEyebrow: 'Fresh every visit', randomTitle: 'Surprise picks',
    marqueeEyebrow: 'Trending now', marqueeTitle: 'Students are loving these',
  },
  trust: [
    { title: 'Free school pickup', sub: 'Collect at the office — zero delivery fee' },
    { title: 'COD available', sub: 'Pay cash or UPI at pickup' },
    { title: 'Class-verified lists', sub: 'Only what your class actually needs' },
    { title: 'Easy returns', sub: '7 days, no questions asked' },
  ],
  promos: [
    {
      tag: 'Exam-week sale', title: 'Bundle up, save 25%',
      sub: 'Full class sets — Maths, Science, English + notebooks in one box.',
      cta: 'Shop bundles', to: '/shop?cat=Book Bundle',
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
      tint: 'from-indigo-950/85 via-indigo-900/55 to-transparent', countdown: true,
    },
    {
      tag: 'Hydration upgrade', title: 'Steel bottles from ₹249',
      sub: 'Leak-proof, playground-tough. Mrs. Sharma approved.',
      cta: 'Shop bottles', to: '/shop?cat=Water Bottle',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
      tint: 'from-emerald-950/85 via-emerald-900/55 to-transparent',
    },
    {
      tag: 'New school?', title: 'Get your school code',
      sub: 'Register in 2 minutes — class, code, WhatsApp, OTP. Done.',
      cta: 'Register free', to: '/school/register',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80',
      tint: 'from-amber-950/85 via-amber-900/55 to-transparent',
    },
  ],
  live: {
    kicker: 'Study with us — live',
    title: 'Class 6 Science revision, tonight 5 PM',
    sub: 'Free demo · bring one question from Chapter 4.',
    schedule: [
      { time: 'Today · 5 PM', title: 'Class 6 Science revision' },
      { time: 'Tomorrow · 4 PM', title: 'How school pickup works' },
      { time: 'Sunday · 11 AM', title: 'Bundle unboxing + Q&A' },
    ],
    steps: [
      { title: 'Order by Sunday', sub: 'Pay online or choose COD. We pack class-wise, not random.' },
      { title: 'We ping your class teacher', sub: 'WhatsApp + in-app note when your box reaches school.' },
      { title: 'Flash the order ID', sub: 'Collect at the office. Average wait: under 2 minutes.' },
    ],
  },
  quotes: [
    { quote: 'Ordered the full Class 3 set on Monday, picked it up at the school office on Wednesday. Zero delivery fee.', name: 'Priya N.', role: 'Parent · Class 3' },
    { quote: 'COD at pickup is perfect — my son shows the order ID, I pay UPI, done. Feels made for schools.', name: 'Rahul V.', role: 'Parent · Class 6' },
    { quote: 'Finally one list per class instead of ten shop visits. The bundle discount actually shows.', name: 'Mrs. Sharma', role: 'Teacher · Class 5' },
  ],
  vendor: {
    kicker: 'For sellers',
    title: 'Sell to schools that buy every term',
    sub: 'List your books and bottles once — we handle the school pickup counter. Zero listing fee, payout on every pickup.',
    cta: 'Become a seller',
    points: [
      'Zero listing fee — pay only a small cut per sale',
      'Payouts land after every school pickup',
      'Your stock stays yours until it sells',
    ],
  },
  school: {
    kicker: 'For schools & institutes',
    title: 'Run your school panel — books, bottles and bundles',
    sub: 'Schools, educational institutes and private coaching centres can register, add products and serve students at their own school pickup counter.',
    cta: 'Register your school or institute',
    points: [
      'Zero listing fee — pay only a small cut per sale',
      'Payouts land after every school pickup',
      'Separate login for schools and coaching institutes',
    ],
  },
  directory: {
    kicker: 'Find near you',
    title: 'Schools & coaching institutes, one search away',
    sub: 'Filter by country, state and district, then pick a type - school, private coaching or private institute. Open any listing for its registration and basic details.',
    cta: 'Browse the directory',
    points: [
      'Country, state and district filters',
      'School, private coaching and private institute listings',
      'Registration + basic details on every listing',
    ],
  },
  footer: {
    blurb: 'Books, bundles and bottles linked to your school — pay online or Cash on Delivery, collect at school or home.',
    promise: 'Free pickup on most items',
    bottom: 'Powered By : Aviansys Technology Pvt. Ltd.',
  },
}

type PRow = { id: number; name: string; price: number; mrp?: number | null; images?: { url?: string }[]; category?: { name?: string } }
type Row = { key: string; value: string }

const parseJson = <T,>(raw: string | undefined | null, fb: T): T => {
  if (!raw) return fb
  try { return JSON.parse(raw) as T } catch { return fb }
}

/** Merge a partial saved payload over the defaults (old saves may miss keys). */
const mergeContent = (saved: Partial<Content> | null | undefined): Content => {
  const s = saved ?? {}
  return {
    ...DEFAULT,
    ...s,
    sections: { ...DEFAULT.sections, ...(s.sections ?? {}) },
    hero: { ...DEFAULT.hero, ...(s.hero ?? {}) },
    ticker: Array.isArray(s.ticker) ? s.ticker : DEFAULT.ticker,
    banners: Array.isArray(s.banners) ? s.banners : DEFAULT.banners,
    random_count: Number(s.random_count ?? DEFAULT.random_count) || DEFAULT.random_count,
    headings: { ...DEFAULT.headings, ...(s.headings ?? {}) },
    trust: Array.isArray(s.trust) ? (s.trust as TrustRow[]) : DEFAULT.trust,
    promos: Array.isArray(s.promos) ? (s.promos as PromoRow[]) : DEFAULT.promos,
    live: {
      ...DEFAULT.live,
      ...(s.live ?? {}),
      schedule: Array.isArray(s.live?.schedule) ? (s.live.schedule as ScheduleRow[]) : DEFAULT.live.schedule,
      steps: Array.isArray(s.live?.steps) ? (s.live.steps as LiveStepRow[]) : DEFAULT.live.steps,
    },
    quotes: Array.isArray(s.quotes) ? (s.quotes as QuoteRow[]) : DEFAULT.quotes,
    vendor: {
      ...DEFAULT.vendor,
      ...(s.vendor ?? {}),
      points: Array.isArray(s.vendor?.points) ? s.vendor.points : DEFAULT.vendor.points,
    },
    school: {
      ...DEFAULT.school,
      ...(s.school ?? {}),
      points: Array.isArray(s.school?.points) ? s.school.points : DEFAULT.school.points,
    },
    directory: {
      ...DEFAULT.directory,
      ...(s.directory ?? {}),
      points: Array.isArray(s.directory?.points) ? s.directory.points : DEFAULT.directory.points,
    },
    footer: { ...DEFAULT.footer, ...(s.footer ?? {}) },
  }
}

const MAX_BOOST = 8

export function HomeContent() {
  const [content, setContent] = useState<Content>(DEFAULT)
  const [boostIds, setBoostIds] = useState<number[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PRow[]>([])
  const [searching, setSearching] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const load = async () => {
    const { data } = await api.get<Row[]>('/admin/settings')
    const home = data.find((x) => x.key === 'home_content')
    const boost = data.find((x) => x.key === 'home_boost_ids')
    setContent(mergeContent(parseJson<Partial<Content> | null>(home?.value, null)))
    const ids = parseJson<number[]>(boost?.value, [])
    setBoostIds(Array.isArray(ids) ? ids.map(Number).filter((n) => n > 0) : [])
    setLoaded(true)
  }

  useEffect(() => {
    load().catch((err) => setMsg({ kind: 'err', text: errMsg(err, 'API offline – is Laravel running on :8001?') }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced product search for the boost picker (250ms).
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (!loaded) return
    setSearching(true)
    timer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/products', { params: { search: q || undefined, per_page: 20 } })
        const rows: unknown = data?.data ?? data
        setResults(Array.isArray(rows) ? (rows as PRow[]) : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(timer.current)
  }, [q, loaded])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      await api.put('/admin/settings', {
        settings: { home_content: content, home_boost_ids: boostIds },
      })
      setMsg({ kind: 'ok', text: 'Home content saved — the storefront updates on next load' })
      await load()
    } catch (err) {
      setMsg({ kind: 'err', text: errMsg(err, 'Save failed') })
    } finally {
      setBusy(false)
    }
  }

  const upd = (patch: Partial<Content>) => setContent((c) => ({ ...c, ...patch }))
  const toggleSection = (k: SectionKey) =>
    setContent((c) => ({ ...c, sections: { ...c.sections, [k]: !c.sections[k] } }))
  const toggleBoost = (id: number) =>
    setBoostIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_BOOST ? ids : [...ids, id]))
  const moveSlide = (i: number, d: number) =>
    setContent((c) => {
      const b = [...c.banners]
      const j = i + d
      if (j < 0 || j >= b.length) return c
      ;[b[i], b[j]] = [b[j], b[i]]
      return { ...c, banners: b }
    })

  const thumb = (p: PRow) => p.images?.[0]?.url ?? 'https://picsum.photos/seed/p' + p.id + '/80/80'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Home content</h2>
        <p className="mt-1 text-sm text-slate-500">
          Decide what shoppers see on the storefront home page — section visibility, hero copy, ticker
          offers, banner slides, boosted products and random picks. Saved content goes live on the next page load.
        </p>
      </header>

      <form onSubmit={save} className="space-y-6">
        {/* Section visibility */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Sections on the home page</h3>
          <p className="mt-1 text-sm text-slate-500">Turn a section off to hide it from every visitor.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                <span className="text-sm font-medium text-slate-700">{SECTION_LABELS[k]}</span>
                <input type="checkbox" checked={content.sections[k]} onChange={() => toggleSection(k)} className="h-4 w-4 accent-indigo-600" />
              </label>
            ))}
          </div>
        </section>

        {/* Section headings */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Section headings</h3>
          <p className="mt-1 text-sm text-slate-500">Eyebrows + titles for the deals, testimonials and product rows.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ['deals', 'Deals title'], ['dealsChip', 'Deals chip'], ['dealsTip', 'Deals tip line'],
              ['dealStripTitle', 'Deal promo row title'],
              ['quotesEyebrow', 'Testimonials eyebrow'], ['quotesTitle', 'Testimonials title'],
              ['boostEyebrow', 'Featured eyebrow'], ['boostTitle', 'Featured title'],
              ['randomEyebrow', 'Surprise eyebrow'], ['randomTitle', 'Surprise title'],
              ['marqueeEyebrow', 'Moving rows eyebrow'], ['marqueeTitle', 'Moving rows title'],
            ] as const).map(([k, label]) => (
              <label key={k} className={k === 'dealsTip' ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.headings[k]} onChange={(e) => upd({ headings: { ...content.headings, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
        </section>

        {/* Hero copy (logged-out visitors) */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Hero copy <span className="ml-2 text-xs font-normal text-slate-400">logged-out visitors</span></h3>
          <p className="mt-1 text-sm text-slate-500">Signed-in students always see their personalized greeting — this copy is the public fallback.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Badge pill</span>
              <input value={content.hero.badge} onChange={(e) => upd({ hero: { ...content.hero, badge: e.target.value } })} className="field focus:field-focus outline-none" placeholder="Admissions week · up to 30% off bundles" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Headline (plain)</span>
              <input value={content.hero.headline} onChange={(e) => upd({ hero: { ...content.hero, headline: e.target.value } })} className="field focus:field-focus outline-none" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Headline (gradient part)</span>
              <input value={content.hero.highlight} onChange={(e) => upd({ hero: { ...content.hero, highlight: e.target.value } })} className="field focus:field-focus outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Sub text</span>
              <textarea value={content.hero.sub} onChange={(e) => upd({ hero: { ...content.hero, sub: e.target.value } })} rows={2} className="field focus:field-focus outline-none" />
            </label>
          </div>
        </section>

        {/* Offer ticker */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Offer ticker</h3>
          <p className="mt-1 text-sm text-slate-500">The scrolling strip below the banners — one offer per row.</p>
          <div className="mt-4 space-y-2">
            {content.ticker.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={t}
                  onChange={(e) => upd({ ticker: content.ticker.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="field focus:field-focus outline-none"
                />
                <button type="button" aria-label="Remove item" onClick={() => upd({ ticker: content.ticker.filter((_, j) => j !== i) })}
                  className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => upd({ ticker: [...content.ticker, 'New offer'] })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add ticker item
            </button>
          </div>
        </section>

        {/* Gallery banner slides */}
        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Gallery banner slides</h3>
              <p className="mt-1 text-sm text-slate-500">The rotating slider under the hero. Order = playback order.</p>
            </div>
            <button type="button"
              onClick={() => upd({ banners: [...content.banners, { eyebrow: 'New slide', title: 'Banner title', highlight: 'highlight', sub: '', cta: 'Shop now', to: '/?cat=All', image: '', chip: '' }] })}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add slide
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {content.banners.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Slide {i + 1}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveSlide(i, -1)} className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Move down" disabled={i === content.banners.length - 1} onClick={() => moveSlide(i, 1)} className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Delete slide" onClick={() => upd({ banners: content.banners.filter((_, j) => j !== i) })} className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([['eyebrow', 'Eyebrow'], ['chip', 'Chip badge'], ['title', 'Title'], ['highlight', 'Gradient highlight'], ['cta', 'Button label'], ['to', 'Button link']] as const).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
                      <input value={s[field]} onChange={(e) => upd({ banners: content.banners.map((b, j) => (j === i ? ({ ...b, [field]: e.target.value } as Slide) : b)) })} className="field focus:field-focus outline-none" />
                    </label>
                  ))}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Sub text</span>
                    <input value={s.sub} onChange={(e) => upd({ banners: content.banners.map((b, j) => (j === i ? { ...b, sub: e.target.value } : b)) })} className="field focus:field-focus outline-none" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Image URL</span>
                    <span className="flex items-center gap-2">
                      {s.image && <img src={s.image} alt="" className="h-9 w-14 shrink-0 rounded-md border border-slate-200 object-cover" />}
                      <input value={s.image} onChange={(e) => upd({ banners: content.banners.map((b, j) => (j === i ? { ...b, image: e.target.value } : b)) })} className="field focus:field-focus outline-none" placeholder="https://…" />
                    </span>
                  </label>
                </div>
              </div>
            ))}
            {content.banners.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No slides — the slider stays hidden until you add one.</p>
            )}
          </div>
        </section>

        {/* Trust strip */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Trust strip</h3>
          <p className="mt-1 text-sm text-slate-500">The quiet divider row under the hero — keep it to 4 short promises.</p>
          <div className="mt-4 space-y-2">
            {content.trust.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={t.title} placeholder="Title"
                  onChange={(e) => upd({ trust: content.trust.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  className="field focus:field-focus w-44 shrink-0 outline-none" />
                <input value={t.sub} placeholder="One-line detail"
                  onChange={(e) => upd({ trust: content.trust.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)) })}
                  className="field focus:field-focus outline-none" />
                <button type="button" aria-label="Remove item" onClick={() => upd({ trust: content.trust.filter((_, j) => j !== i) })}
                  className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {content.trust.length < 4 && (
              <button type="button" onClick={() => upd({ trust: [...content.trust, { title: 'New promise', sub: 'One-line detail' }] })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
                <Plus className="h-4 w-4" /> Add promise
              </button>
            )}
          </div>
        </section>

        {/* Promo cards */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Promo cards</h3>
          <p className="mt-1 text-sm text-slate-500">First card renders large, the rest small. Use /shop links so filters pre-select.</p>
          <div className="mt-4 space-y-4">
            {content.promos.map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Card {i + 1}{i === 0 ? ' · large' : ''}</span>
                  <button type="button" aria-label="Delete card" onClick={() => upd({ promos: content.promos.filter((_, j) => j !== i) })}
                    className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([['tag', 'Eyebrow'], ['title', 'Title'], ['cta', 'Button label'], ['to', 'Button link']] as const).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
                      <input value={p[field]} onChange={(e) => upd({ promos: content.promos.map((x, j) => (j === i ? { ...x, [field]: e.target.value } : x)) })}
                        className="field focus:field-focus outline-none" />
                    </label>
                  ))}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Sub text</span>
                    <input value={p.sub} onChange={(e) => upd({ promos: content.promos.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)) })}
                      className="field focus:field-focus outline-none" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Image URL</span>
                    <input value={p.image} onChange={(e) => upd({ promos: content.promos.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)) })}
                      className="field focus:field-focus outline-none" placeholder="https://…" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={!!p.countdown}
                      onChange={(e) => upd({ promos: content.promos.map((x, j) => (j === i ? { ...x, countdown: e.target.checked } : x)) })}
                      className="h-4 w-4 accent-indigo-600" /> Show countdown timer
                  </label>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => upd({ promos: [...content.promos, { tag: 'New', title: 'New promo', sub: '', cta: 'Shop now', to: '/shop', image: '', tint: 'from-indigo-950/85 via-indigo-900/55 to-transparent' }] })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add promo card
            </button>
          </div>
        </section>

        {/* Pickup story */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Pickup story</h3>
          <p className="mt-1 text-sm text-slate-500">Photo card + numbered steps explaining school pickup.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['kicker', 'Eyebrow'], ['title', 'Photo headline'], ['sub', 'Photo sub line']] as const).map(([k, label]) => (
              <label key={k} className={k === 'sub' ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.live[k]} onChange={(e) => upd({ live: { ...content.live, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Schedule pills</p>
          <div className="mt-2 space-y-2">
            {content.live.schedule.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s.time} placeholder="Today · 5 PM"
                  onChange={(e) => upd({ live: { ...content.live, schedule: content.live.schedule.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) } })}
                  className="field focus:field-focus w-40 shrink-0 outline-none" />
                <input value={s.title} placeholder="Event title"
                  onChange={(e) => upd({ live: { ...content.live, schedule: content.live.schedule.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } })}
                  className="field focus:field-focus outline-none" />
                <button type="button" aria-label="Remove slot" onClick={() => upd({ live: { ...content.live, schedule: content.live.schedule.filter((_, j) => j !== i) } })}
                  className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => upd({ live: { ...content.live, schedule: [...content.live.schedule, { time: 'Soon', title: 'New slot' }] } })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add slot
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Numbered steps</p>
          <div className="mt-2 space-y-2">
            {content.live.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-sm font-extrabold text-slate-400">{i + 1}</span>
                <input value={s.title} placeholder="Step title"
                  onChange={(e) => upd({ live: { ...content.live, steps: content.live.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } })}
                  className="field focus:field-focus w-48 shrink-0 outline-none" />
                <input value={s.sub} placeholder="Step detail"
                  onChange={(e) => upd({ live: { ...content.live, steps: content.live.steps.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)) } })}
                  className="field focus:field-focus outline-none" />
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Testimonials</h3>
          <p className="mt-1 text-sm text-slate-500">Real parent/teacher voices — quote, name, role.</p>
          <div className="mt-4 space-y-3">
            {content.quotes.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Quote {i + 1}</span>
                  <button type="button" aria-label="Delete quote" onClick={() => upd({ quotes: content.quotes.filter((_, j) => j !== i) })}
                    className="btn btn-ghost btn-icon !p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <textarea value={t.quote} rows={2}
                  onChange={(e) => upd({ quotes: content.quotes.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)) })}
                  className="field focus:field-focus outline-none" />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input value={t.name} placeholder="Name"
                    onChange={(e) => upd({ quotes: content.quotes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                    className="field focus:field-focus outline-none" />
                  <input value={t.role} placeholder="Parent · Class 3"
                    onChange={(e) => upd({ quotes: content.quotes.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })}
                    className="field focus:field-focus outline-none" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => upd({ quotes: [...content.quotes, { quote: 'New testimonial', name: 'Name', role: 'Parent' }] })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
              <Plus className="h-4 w-4" /> Add testimonial
            </button>
          </div>
        </section>

        {/* Register-as-vendor section */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Register-as-vendor (Sell with us)</h3>
          <p className="mt-1 text-sm text-slate-500">The “become a seller” band on the home page. The button links to /sell.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['kicker', 'Eyebrow'], ['cta', 'Button label'], ['title', 'Headline'], ['sub', 'Sub-line']] as const).map(([k, label]) => (
              <label key={k} className={k === 'title' || k === 'sub' ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.vendor[k]} onChange={(e) => upd({ vendor: { ...content.vendor, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Selling points</span>
            <div className="space-y-2">
              {content.vendor.points.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={p} placeholder="One reason to sell here"
                    onChange={(e) => upd({ vendor: { ...content.vendor, points: content.vendor.points.map((x, j) => (j === i ? e.target.value : x)) } })}
                    className="field focus:field-focus outline-none" />
                  <button type="button" aria-label="Remove point" onClick={() => upd({ vendor: { ...content.vendor, points: content.vendor.points.filter((_, j) => j !== i) } })}
                    className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.vendor.points.length < 5 && (
                <button type="button" onClick={() => upd({ vendor: { ...content.vendor, points: [...content.vendor.points, 'New selling point'] } })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
                  <Plus className="h-4 w-4" /> Add point
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Register-as-school / institute band */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Register-as-school / institute</h3>
          <p className="mt-1 text-sm text-slate-500">The “register your school” band on the home page. The button links to /school/register.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['kicker', 'Eyebrow'], ['cta', 'Button label'], ['title', 'Headline'], ['sub', 'Sub-line']] as const).map(([k, label]) => (
              <label key={k} className={k === 'title' || k === 'sub' ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.school[k]} onChange={(e) => upd({ school: { ...content.school, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Selling points</span>
            <div className="space-y-2">
              {content.school.points.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={p} placeholder="One reason to register"
                    onChange={(e) => upd({ school: { ...content.school, points: content.school.points.map((x, j) => (j === i ? e.target.value : x)) } })}
                    className="field focus:field-focus outline-none" />
                  <button type="button" aria-label="Remove point" onClick={() => upd({ school: { ...content.school, points: content.school.points.filter((_, j) => j !== i) } })}
                    className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.school.points.length < 5 && (
                <button type="button" onClick={() => upd({ school: { ...content.school, points: [...content.school.points, 'New point'] } })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
                  <Plus className="h-4 w-4" /> Add point
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Institute directory (students) band */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Institute directory (students)</h3>
          <p className="mt-1 text-sm text-slate-500">The “find near you” band on the home page. The button links to /directory.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['kicker', 'Eyebrow'], ['cta', 'Button label'], ['title', 'Headline'], ['sub', 'Sub-line']] as const).map(([k, label]) => (
              <label key={k} className={k === 'title' || k === 'sub' ? 'block sm:col-span-2' : 'block'}>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.directory[k]} onChange={(e) => upd({ directory: { ...content.directory, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Selling points</span>
            <div className="space-y-2">
              {content.directory.points.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={p} placeholder="One reason to browse"
                    onChange={(e) => upd({ directory: { ...content.directory, points: content.directory.points.map((x, j) => (j === i ? e.target.value : x)) } })}
                    className="field focus:field-focus outline-none" />
                  <button type="button" aria-label="Remove point" onClick={() => upd({ directory: { ...content.directory, points: content.directory.points.filter((_, j) => j !== i) } })}
                    className="btn btn-ghost btn-icon !p-2 text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {content.directory.points.length < 5 && (
                <button type="button" onClick={() => upd({ directory: { ...content.directory, points: [...content.directory.points, 'New point'] } })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
                  <Plus className="h-4 w-4" /> Add point
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Footer text */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Footer text</h3>
          <p className="mt-1 text-sm text-slate-500">Brand blurb, pickup promise and bottom line in the storefront footer.</p>
          <div className="mt-4 grid gap-4">
            {([['blurb', 'Brand blurb'], ['promise', 'Pickup promise'], ['bottom', 'Bottom line']] as const).map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
                <input value={content.footer[k]} onChange={(e) => upd({ footer: { ...content.footer, [k]: e.target.value } })}
                  className="field focus:field-focus outline-none" />
              </label>
            ))}
          </div>
        </section>

        {/* Boost picker + random picks */}
        <section className="card p-6">
          <h3 className="text-base font-bold text-slate-900">Boosted products <span className="ml-2 text-xs font-normal text-slate-400">up to {MAX_BOOST}</span></h3>
          <p className="mt-1 text-sm text-slate-500">Picked products appear in the “Featured picks” row on the home page.</p>

          {boostIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {boostIds.map((id) => {
                const p = results.find((r) => r.id === id)
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <Star className="h-3 w-3 fill-indigo-500 text-indigo-500" />
                    {p?.name ?? `#${id}`}
                    <button type="button" aria-label="Unboost" onClick={() => toggleBoost(id)} className="text-indigo-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )
              })}
            </div>
          )}

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to boost…" className="field focus:field-focus pl-9 outline-none" />
            {searching && <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
          </div>

          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
            {results.map((p) => {
              const on = boostIds.includes(p.id)
              return (
                <button key={p.id} type="button" onClick={() => toggleBoost(p.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${on ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'}`}>
                  <img src={thumb(p)} alt="" className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-700">{p.name}</span>
                    <span className="block text-xs text-slate-400">{p.category?.name ?? '—'} · ₹{p.price}</span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${on ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                </button>
              )
            })}
            {!searching && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No products found — add products from the Products screen first.</p>
            )}
          </div>

          <label className="mt-4 block max-w-xs">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Random picks count</span>
            <input type="number" min={2} max={12} value={content.random_count}
              onChange={(e) => upd({ random_count: Math.min(12, Math.max(2, Number(e.target.value) || 2)) })}
              className="field focus:field-focus outline-none" />
            <span className="mt-1 block text-xs text-slate-400">Shown in the “Surprise picks” row (2–12 products, reshuffles each visit).</span>
          </label>
        </section>

        {/* Save bar */}
        <div className="card flex flex-wrap items-center gap-3 p-5">
          <button type="submit" disabled={busy}
            className="accent-bg inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? 'Saving…' : 'Save home content'}
          </button>
          <p className="text-xs text-slate-500">Applies to the storefront at http://127.0.0.1:8001/ — refresh to see changes.</p>
        </div>
      </form>

      {msg && (
        <div role="status"
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {msg.text}
        </div>
      )}
    </div>
  )
}
