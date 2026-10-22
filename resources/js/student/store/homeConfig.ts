/**
 * Admin-managed home content (Admin → Home content).
 *
 * Fetched once from the public GET /settings/public endpoint and cached at
 * module level, then merged over the built-in defaults in data/home.ts so the
 * storefront keeps working (with defaults) when the API is offline or the
 * admin has never saved anything.
 */
import { useEffect, useState } from 'react'
import { api } from '@lib/api'
import { BANNERS, PROMOS, QUOTES, SCHEDULE, TICKER_ITEMS, type Banner, type Promo } from '../data/home'

export type SectionKey =
  | 'hero' | 'banners' | 'trust' | 'ticker' | 'promos'
  | 'deals' | 'dealStrip' | 'live' | 'quotes' | 'boost' | 'random' | 'marquee' | 'vendor' | 'school' | 'directory'

export type TrustItem = { title: string; sub: string }
export type LiveScheduleItem = { time: string; title: string }
export type LiveStep = { title: string; sub: string }
export type QuoteItem = { quote: string; name: string; role: string }

export const DEFAULT_TRUST: TrustItem[] = [
  { title: 'Free school pickup', sub: 'Collect at the office — zero delivery fee' },
  { title: 'COD available', sub: 'Pay cash or UPI at pickup' },
  { title: 'Class-verified lists', sub: 'Only what your class actually needs' },
  { title: 'Easy returns', sub: '7 days, no questions asked' },
]

export const DEFAULT_LIVE_STEPS: LiveStep[] = [
  { title: 'Order by Sunday', sub: 'Pay online or choose COD. We pack class-wise, not random.' },
  { title: 'We ping your class teacher', sub: 'WhatsApp + in-app note when your box reaches school.' },
  { title: 'Flash the order ID', sub: 'Collect at the office. Average wait: under 2 minutes.' },
]

export const DEFAULT_HEADINGS: HomeConfig['headings'] = {
  shopEyebrow: 'Start here',
  shopTitle: 'Shop by category',
  categoriesEyebrow: 'Start here',
  categoriesTitle: 'Shop by category',
  deals: 'Deal of the day',
  dealsChip: 'ends tonight',
  dealsTip: 'Tip: hit “Add to cart” right on a deal — no page jump needed.',
  dealStripTitle: 'More deals',
  quotesEyebrow: 'Wall of love',
  quotesTitle: 'Parents said it better than us',
  boostEyebrow: 'Hand-picked',
  boostTitle: 'Featured picks',
  randomEyebrow: 'Fresh every visit',
  randomTitle: 'Surprise picks',
  marqueeEyebrow: 'Trending now',
  marqueeTitle: 'Students are loving these',
}

export const DEFAULT_LIVE = {
  kicker: 'Study with us — live',
  title: 'Class 6 Science revision, tonight 5 PM',
  sub: 'Free demo · bring one question from Chapter 4.',
  stepsTitle: 'Pickup in 3 tiny steps',
}

export const DEFAULT_VENDOR = {
  kicker: 'For sellers',
  title: 'Sell to schools that buy every term',
  sub: 'List your books and bottles once — we handle the school pickup counter. Zero listing fee, payout on every pickup.',
  cta: 'Become a seller',
  points: [
    'Zero listing fee — pay only a small cut per sale',
    'Payouts land after every school pickup',
    'Your stock stays yours until it sells',
  ],
}

export const DEFAULT_SCHOOL = {
  kicker: 'For schools & institutes',
  title: 'Run your school panel — books, bottles and bundles',
  sub: 'Schools, educational institutes and private coaching centres can register, add products and serve students at their own school pickup counter.',
  cta: 'Register your school or institute',
  points: [
    'Zero listing fee — pay only a small cut per sale',
    'Payouts land after every school pickup',
    'Separate login for schools and coaching institutes',
  ],
}

export const DEFAULT_DIRECTORY = {
  kicker: 'Find near you',
  title: 'Schools & coaching institutes, one search away',
  sub: 'Filter by country, state and district, then pick a type - school, private coaching or private institute. Open any listing for its registration and basic details.',
  cta: 'Browse the directory',
  points: [
    'Country, state and district filters',
    'School, private coaching and private institute listings',
    'Registration + basic details on every listing',
  ],
}


export const DEFAULT_FOOTER = {
  blurb: 'Books, bundles and bottles linked to your school — pay online or Cash on Delivery, collect at school or home.',
  promise: 'Free pickup on most items',
  bottom: 'Powered By : Aviansys Technology Pvt. Ltd.',
}

export type HomeConfig = {
  sections: Record<SectionKey, boolean>
  hero: { badge?: string; headline?: string; highlight?: string; sub?: string }
  headings: {
    shopEyebrow: string; shopTitle: string
    categoriesEyebrow: string; categoriesTitle: string
    deals: string; dealsChip: string; dealsTip: string; dealStripTitle: string
    quotesEyebrow: string; quotesTitle: string
    boostEyebrow: string; boostTitle: string
    randomEyebrow: string; randomTitle: string
    marqueeEyebrow: string; marqueeTitle: string
  }
  trust: { title: string; sub: string }[]
  promos: Promo[]
  live: {
    kicker: string; title: string; sub: string
    schedule: { time: string; title: string }[]
    steps: { title: string; sub: string }[]
  }
  quotes: { quote: string; name: string; role: string }[]
  vendor: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  school: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  directory: { kicker: string; title: string; sub: string; cta: string; points: string[] }
  footer: {
    blurb: string; promise: string; bottom: string
  }
  ticker: string[]
  banners: Banner[]
  random_count: number
  boostIds: number[]
}

export const DEFAULT_HOME: HomeConfig = {
  sections: {
    hero: true, banners: true, trust: true, ticker: true, promos: true,
    deals: true, dealStrip: true, live: true, quotes: true, boost: true, random: true, marquee: true, vendor: true, school: true, directory: true,
  },
  hero: {},
  headings: DEFAULT_HEADINGS,
  trust: DEFAULT_TRUST,
  promos: PROMOS,
  live: {
    kicker: DEFAULT_LIVE.kicker, title: DEFAULT_LIVE.title, sub: DEFAULT_LIVE.sub,
    schedule: SCHEDULE.map(({ time, title }) => ({ time, title })),
    steps: DEFAULT_LIVE_STEPS,
  },
  quotes: QUOTES,
  vendor: { ...DEFAULT_VENDOR, points: [...DEFAULT_VENDOR.points] },
  school: { ...DEFAULT_SCHOOL, points: [...DEFAULT_SCHOOL.points] },
  directory: { ...DEFAULT_DIRECTORY, points: [...DEFAULT_DIRECTORY.points] },
  footer: DEFAULT_FOOTER,
  ticker: TICKER_ITEMS,
  banners: BANNERS,
  random_count: 6,
  boostIds: [],
}

let cache: HomeConfig | null = null
let inflight: Promise<HomeConfig> | null = null

const load = (): Promise<HomeConfig> => {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api
    .get('/settings/public')
    .then((r) => {
      const c = (r.data?.home_content ?? {}) as Partial<HomeConfig>
      const rawIds: unknown = r.data?.home_boost_ids
      const ids = Array.isArray(rawIds) ? rawIds.map(Number).filter((n) => n > 0) : []
      cache = {
        ...DEFAULT_HOME,
        ...c,
        sections: { ...DEFAULT_HOME.sections, ...(c.sections ?? {}) },
        hero: { ...DEFAULT_HOME.hero, ...(c.hero ?? {}) },
        headings: { ...DEFAULT_HOME.headings, ...(c.headings ?? {}) },
        trust: Array.isArray(c.trust) ? c.trust : DEFAULT_HOME.trust,
        promos: Array.isArray(c.promos) ? (c.promos as Promo[]) : DEFAULT_HOME.promos,
        live: {
          ...DEFAULT_HOME.live,
          ...(c.live ?? {}),
          schedule: Array.isArray(c.live?.schedule) ? c.live.schedule : DEFAULT_HOME.live.schedule,
          steps: Array.isArray(c.live?.steps) ? c.live.steps : DEFAULT_HOME.live.steps,
        },
        quotes: Array.isArray(c.quotes) ? c.quotes : DEFAULT_HOME.quotes,
        vendor: {
          ...DEFAULT_HOME.vendor,
          ...(c.vendor ?? {}),
          points: Array.isArray(c.vendor?.points) ? c.vendor.points : DEFAULT_HOME.vendor.points,
        },
        school: {
          ...DEFAULT_HOME.school,
          ...(c.school ?? {}),
          points: Array.isArray(c.school?.points) ? c.school.points : DEFAULT_HOME.school.points,
        },
        directory: {
          ...DEFAULT_HOME.directory,
          ...(c.directory ?? {}),
          points: Array.isArray(c.directory?.points) ? c.directory.points : DEFAULT_HOME.directory.points,
        },
        footer: {
          ...DEFAULT_HOME.footer,
          ...(c.footer ?? {}),
        },
        ticker: Array.isArray(c.ticker) ? c.ticker : DEFAULT_HOME.ticker,
        banners: Array.isArray(c.banners) ? (c.banners as Banner[]) : DEFAULT_HOME.banners,
        random_count: Number(c.random_count) || DEFAULT_HOME.random_count,
        boostIds: ids,
      }
      return cache
    })
    .catch(() => {
      cache = DEFAULT_HOME
      return DEFAULT_HOME
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Home content with module-level caching (safe to call from many components). */
export function useHomeConfig(): HomeConfig {
  const [cfg, setCfg] = useState<HomeConfig>(() => cache ?? DEFAULT_HOME)
  useEffect(() => {
    let alive = true
    load().then((c) => { if (alive) setCfg(c) })
    return () => { alive = false }
  }, [])
  return cfg
}
