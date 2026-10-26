/**
 * Shared branding. Sourced from Admin -> Settings via the PUBLIC endpoint
 * (GET /settings/public) so the Login page can render the logo before anyone
 * is authenticated. Mounted in every panel, so a logo/colour change in Admin
 * propagates to all three UIs.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, apiOrigin } from './api'

export type Brand = {
  appName: string
  logoUrl: string | null
  iconUrl: string | null
  primary: string | null
  /** Gradient end colour (Admin → Settings → Branding). */
  secondary: string | null
  /** "solid" (flat brand colour) or "gradient" (two-stop accent surfaces). */
  buttonStyle: 'solid' | 'gradient'
}

const FALLBACK: Brand = { appName: 'Marketplace', logoUrl: null, iconUrl: null, primary: null, secondary: null, buttonStyle: 'solid' }

const HEX = /^#[0-9a-f]{3,8}$/i
const hexOr = (v: unknown): string | null =>
  typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : null

type BrandCtxValue = { brand: Brand; refresh: () => Promise<void> }

const Ctx = createContext<BrandCtxValue>({ brand: FALLBACK, refresh: async () => {} })

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [brand, setBrand] = useState<Brand>(FALLBACK)

  const loadBrand = async () => {
    try {
      const r = await api.get('/settings/public')
      const d = r.data ?? {}
      const logo =
        typeof d.branding_logo === 'string' && d.branding_logo.trim() ? d.branding_logo.trim() : null
      const icon =
        typeof d.branding_icon === 'string' && d.branding_icon.trim() ? d.branding_icon.trim() : null
      setBrand({
        appName: (typeof d.app_name === 'string' && d.app_name.trim()) || FALLBACK.appName,
        logoUrl: logo,
        iconUrl: icon,
        primary: hexOr(d.brand_primary),
        secondary: hexOr(d.brand_secondary),
        buttonStyle: d.button_style === 'gradient' ? 'gradient' : 'solid',
      })
    } catch {
      /* API offline - keep built-in defaults so the UI still renders */
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await loadBrand()
    })()
    return () => {
      alive = false
    }
  }, [])

  const refresh = async () => {
    await loadBrand()
  }

  // Push the admin-chosen accent onto <html> so every `.accent-*` helper follows.
  useEffect(() => {
    const root = document.documentElement
    if (brand.primary) root.style.setProperty('--brand', brand.primary)
    else root.style.removeProperty('--brand')
    if (brand.secondary) root.style.setProperty('--brand-2', brand.secondary)
    else root.style.removeProperty('--brand-2')
    // Gradient button mode: one variable flips .accent-bg / .btn-primary across
    // all four panels (design.css reads --accent-fill-image; solid = none).
    if (brand.buttonStyle === 'gradient') {
      root.style.setProperty(
        '--accent-fill-image',
        'linear-gradient(135deg, var(--brand, var(--color-brand-600)), var(--brand-2, color-mix(in srgb, var(--brand, var(--color-brand-600)) 55%, #0f172a)))',
      )
    } else {
      root.style.removeProperty('--accent-fill-image')
    }
  }, [brand.primary, brand.secondary, brand.buttonStyle])

  // Keep the browser tab icon in sync with the configured logo icon.
  useEffect(() => {
    const href = assetUrl(brand.iconUrl) || '/favicon.svg'
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href
  }, [brand.iconUrl])

  return <Ctx.Provider value={{ brand, refresh }}>{children}</Ctx.Provider>
}

export const useBrand = () => useContext(Ctx).brand

export const useBrandRefresh = () => useContext(Ctx).refresh

/** Turn a server-relative "/storage/..." path into a full URL on the API origin. */
export const assetUrl = (p: string | null) =>
  !p ? null : /^https?:\/\//i.test(p) ? p : `${apiOrigin()}${p}`

/** Initials fallback when there is no avatar image. */
export const initials = (name?: string | null) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'
