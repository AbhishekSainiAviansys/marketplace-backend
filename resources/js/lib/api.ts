/**
 * Shared axios client. One instance for all three panels.
 *
 * API_URL is read from each app's own .env (Vite only exposes VITE_* vars from
 * the app root), so the fallback is identical to the old per-app value.
 */
import axios from 'axios'

// Same-origin by default: in dev Vite proxies /api -> :8001, and in production
// Laravel serves the built SPA and the API from one origin. Override with
// VITE_API_URL to point at a remote API instead.
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

/** Origin of the API (no trailing slash, no /api/v1) - used for /storage/... files. */
export const apiOrigin = () => API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')

/* ---------------------------------------------------------------------------
 * Panel routing helpers (single-SPA, four panels).
 *
 * Each panel is mounted under its own basename, so its login page lives at
 * /admin/login, /vendor/login, ... while the public storefront uses /login.
 * These helpers let the shared api interceptor and the shell redirect the user
 * to the login page that belongs to the panel they are currently in.
 * ------------------------------------------------------------------------ */
const PANELS = ['admin', 'vendor', 'school', 'student']

/** First URL segment when it names one of the four panels, else '' (storefront). */
export const panelOf = (pathname: string = location.pathname): string => {
  const seg = pathname.split('/')[1]
  return PANELS.includes(seg) ? seg : ''
}

/** Absolute login URL for the panel the user is currently in. */
export const loginUrl = (): string => {
  const seg = panelOf()
  return seg ? `/${seg}/login` : '/login'
}

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

// Expired/revoked token -> drop the stale session so the UI falls back to /login
// instead of rendering a broken shell full of failed requests.
// The backend returns 401 (not 500) for guarded routes, so this reliably fires.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // 401 = expired/revoked token. Drop the stale session and send the user to
    // the login page of the panel they are in. The `/\/login$/` guard stops an
    // expected 401 (bad credentials on the login form itself) from navigating
    // away and wiping the inline error message.
    if (err?.response?.status === 401 && !/\/login$/.test(location.pathname)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      location.replace(loginUrl())
    }
    return Promise.reject(err)
  },
)

/** Normalised message from an axios error. */
export const errMsg = (e: unknown, fallback = 'Something went wrong') => {
  const ax = e as { response?: { data?: { message?: string } }; message?: string }
  return ax?.response?.data?.message || ax?.message || fallback
}

/* ---------------------------------------------------------------------------
 * Response-shape helpers.
 *
 * The API is inconsistent on purpose-free: list endpoints such as
 * /admin/vendors return a Laravel paginator ({ data, total, last_page, ... })
 * while /categories returns a plain array. Normalising here stops every screen
 * from re-guarding the same two shapes.
 * ------------------------------------------------------------------------ */
export type Paged<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

/** True when the payload looks like a Laravel paginator. */
export const isPaged = (r: unknown): r is Paged<unknown> =>
  !!r && typeof r === 'object' && Array.isArray((r as Paged<unknown>).data)

/** Rows for a paginator OR a bare array. */
export const rowsOf = <T,>(r: unknown): T[] => {
  if (Array.isArray(r)) return r as T[]
  if (isPaged(r)) return r.data as T[]
  return []
}

/** Pagination meta, with safe defaults for bare-array responses. */
export const metaOf = (r: unknown) => {
  if (isPaged(r)) {
    return {
      page: r.current_page ?? 1,
      lastPage: Math.max(1, r.last_page ?? 1),
      total: r.total ?? r.data?.length ?? 0,
    }
  }
  const n = Array.isArray(r) ? r.length : 0
  return { page: 1, lastPage: 1, total: n }
}
