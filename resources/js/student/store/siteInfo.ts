/**
 * Admin-managed site pages / contact / socials (Admin → Pages & Footer).
 * Same pattern as homeConfig: fetched once from GET /settings/public,
 * module-cached, merged over built-in defaults so pages work offline.
 */
import { useEffect, useState } from 'react'
import { api } from '@lib/api'
import {
  DEFAULT_CONTACT, DEFAULT_PAGES, PAGE_ROUTES,
  type ContactInfo, type PageBody, type PageKey, type SocialLink,
} from '../data/site'

export type { ContactInfo, PageBody, PageKey, SocialLink }
export { PAGE_ROUTES }

export type SiteInfo = {
  pages: Record<PageKey, PageBody>
  contact: ContactInfo
  socials: SocialLink[]
}

export const DEFAULT_SITE: SiteInfo = {
  pages: DEFAULT_PAGES,
  contact: DEFAULT_CONTACT,
  socials: [],
}

let cache: SiteInfo | null = null
let inflight: Promise<SiteInfo> | null = null

const load = (): Promise<SiteInfo> => {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api
    .get('/settings/public')
    .then((r) => {
      const d = r.data ?? {}
      const sp = (d.site_pages ?? {}) as Partial<Record<PageKey, PageBody>>
      const c = (d.contact_info ?? {}) as Partial<ContactInfo>
      const sl = Array.isArray(d.social_links) ? (d.social_links as SocialLink[]) : []
      cache = {
        pages: {
          privacy: { ...DEFAULT_PAGES.privacy, ...(sp.privacy ?? {}) },
          return: { ...DEFAULT_PAGES.return, ...(sp.return ?? {}) },
          refund: { ...DEFAULT_PAGES.refund, ...(sp.refund ?? {}) },
          terms: { ...DEFAULT_PAGES.terms, ...(sp.terms ?? {}) },
        },
        contact: { ...DEFAULT_CONTACT, ...c },
        socials: sl.filter((s) => s?.url?.trim()),
      }
      return cache
    })
    .catch(() => {
      cache = DEFAULT_SITE
      return DEFAULT_SITE
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Site pages + contact + socials (module-cached, safe in many components). */
export function useSiteInfo(): SiteInfo {
  const [info, setInfo] = useState<SiteInfo>(() => cache ?? DEFAULT_SITE)
  useEffect(() => {
    let alive = true
    load().then((c) => { if (alive) setInfo(c) })
    return () => { alive = false }
  }, [])
  return info
}
