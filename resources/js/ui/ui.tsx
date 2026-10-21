/**
 * Shared UI kit for all three panels (admin / vendor / school).
 *
 * This file is the reason the panels no longer drift: the shell, the primitives
 * and the icon set are defined once and imported everywhere, so a design change
 * lands in all three UIs at once. Visual decisions live in shared/design.css.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  HandCoins,
  Inbox,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  School,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@lib/auth'
import { api, errMsg, loginUrl, rowsOf } from '@lib/api'
import { assetUrl, initials, useBrand } from '@lib/brand'

/* =========================================================================
   Theme (light / dark)
   ========================================================================= */
const THEME_KEY = 'mp-theme'

const readTheme = (): 'light' | 'dark' =>
  localStorage.getItem(THEME_KEY) === 'dark'
    ? 'dark'
    : localStorage.getItem(THEME_KEY) === 'light'
      ? 'light'
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}

/* =========================================================================
   Primitives
   ========================================================================= */

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin-slow ${className}`} aria-hidden />
}

export function Logo({ dark = false }: { dark?: boolean }) {
  const { appName, logoUrl } = useBrand()
  const src = assetUrl(logoUrl)

  if (src) {
    return (
      <img
        src={src}
        alt={`${appName} logo`}
        className="max-h-9 max-w-[180px] object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  return (
    <div
      className={`flex items-center gap-2.5 ${dark ? 'text-white' : ''}`}
      title="Upload your logo from Admin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Settings ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Branding"
    >
      <span className="accent-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white">
        {initials(appName)}
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate text-sm leading-tight font-bold ${
            dark ? 'text-white' : 'text-[var(--text)]'
          }`}
        >
          {appName}
        </span>
        <span
          className={`block text-[10px] leading-tight font-medium ${
            dark ? 'text-white/60' : 'text-[var(--text-subtle)]'
          }`}
        >
          Marketplace
        </span>
      </span>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-[var(--text)] sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Alert({
  kind = 'err',
  children,
}: {
  kind?: 'ok' | 'err' | 'info'
  children: ReactNode
}) {
  const cls = kind === 'ok' ? 'alert-ok' : kind === 'info' ? 'alert-info' : 'alert-err'
  const Icon = kind === 'ok' ? CheckCircle2 : AlertCircle
  return (
    <div role={kind === 'err' ? 'alert' : 'status'} className={`alert ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--text-subtle)]">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-[var(--text)]">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="field-hint text-[var(--color-danger-600)]">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  )
}

export function Button({
  variant = 'primary',
  busy,
  icon,
  children,
  className = '',
  ...rest
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  busy?: boolean
  icon?: ReactNode
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, string> = {
    primary: 'btn-primary hover:brightness-110',
    secondary: 'btn-secondary hover:bg-[var(--surface-3)]',
    ghost: 'btn-ghost hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
    danger: 'btn-danger hover:bg-[var(--color-danger-700)]',
  }
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={`btn ${styles[variant]} ${busy || rest.disabled ? 'btn-disabled' : ''} ${className}`}
    >
      {busy ? <Spinner /> : icon}
      {children}
    </button>
  )
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'accent',
  hint,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'accent' | 'ok' | 'warn' | 'info' | 'danger'
  hint?: string
}) {
  const tones: Record<string, string> = {
    accent: 'accent-soft accent-soft-text',
    ok: 'bg-[var(--color-ok-100)] text-[var(--color-ok-700)]',
    warn: 'bg-[var(--color-warn-100)] text-[var(--color-warn-700)]',
    info: 'bg-[var(--color-info-100)] text-[var(--color-info-700)]',
    danger: 'bg-[var(--color-danger-100)] text-[var(--color-danger-700)]',
  }
  return (
    <div className={`card card-hover card-tint-${tone} p-5 hover:shadow-[var(--shadow-raised)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="tnum mt-2 text-3xl font-bold text-[var(--text)]">{value}</p>
          {hint && <p className="mt-1 text-xs text-[var(--text-subtle)]">{hint}</p>}
        </div>
        {icon && <span className={`icon-tile ${tones[tone]}`}>{icon}</span>}
      </div>
    </div>
  )
}

/** Card with an optional title/subtitle header and right-aligned actions. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  bodyClass = 'p-5 sm:p-6',
  className = '',
  tone,
  onClick,
}: {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  bodyClass?: string
  /** Extra classes on the card shell (e.g. flex layout for fixed-height screens). */
  className?: string
  /** Soft colour wash: adds the tint gradient + top accent edge. */
  tone?: 'accent' | 'ok' | 'warn' | 'info' | 'danger'
  /** Makes the whole card clickable (pair with cursor-pointer in className). */
  onClick?: () => void
}) {
  return (
    <section className={`card ${tone ? `card-tint-${tone} ` : ''}${className}`} onClick={onClick}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-[var(--text)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

/* =========================================================================
   Overlays: notifications + profile menu
   Shared click-outside / Escape handling.
   ========================================================================= */
function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return ref
}

type Note = {
  id: number
  title: string
  body?: string
  is_read?: boolean | number
  created_at?: string
}

/** Bell wired to GET /notifications + POST /notifications/{id}/read. */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Note[]>([])
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  const load = async () => {
    try {
      // Paginated - rowsOf() handles a paginator and a bare array alike.
      const r = await api.get('/notifications')
      setItems(rowsOf<Note>(r.data))
    } catch {
      /* notifications are non-critical - keep the bell usable */
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const unread = items.filter((n) => !n.is_read).length

  const markAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await Promise.allSettled(
      items.filter((n) => !n.is_read).map((n) => api.post(`/notifications/${n.id}/read`)),
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) void load()
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="btn btn-ghost btn-icon relative hover:bg-[var(--surface-3)]"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="tnum accent-bg absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--text)]">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="accent-text text-xs font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                You&rsquo;re all caught up.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-[var(--border)] px-4 py-3 last:border-0 ${
                    n.is_read ? '' : 'accent-soft'
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--text)]">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{n.body}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProfileMenu() {
  const { user, logoutRemote } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  if (!user) return null

  const doLogout = async () => {
    setBusy(true)
    await logoutRemote()
    location.replace(loginUrl())
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pr-2.5 pl-1 transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]"
      >
        <span className="accent-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[9rem] truncate text-sm leading-tight font-semibold text-[var(--text)]">
            {user.name}
          </span>
          <span className="block text-[11px] leading-tight font-medium text-[var(--text-muted)] capitalize">
            {user.role}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
            <span className="accent-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{user.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {user.email || user.whatsapp || 'ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â'}
              </p>
              <span className="badge badge-accent mt-1">{user.role}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={doLogout}
            disabled={busy}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-[var(--color-danger-600)] transition hover:bg-[var(--color-danger-50)] disabled:opacity-60"
          >
            {busy ? <Spinner /> : <LogOut className="h-4 w-4" />}
            {busy ? 'Signing outÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   AppShell
   Responsive by design:
   - desktop -> fixed sidebar that collapses to an icon rail (persisted)
   - mobile  -> off-canvas drawer with scrim, Escape-to-close and a body
                scroll lock while it is open
   ========================================================================= */

export type NavItem = {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
  /** Optional section heading rendered above this item. */
  group?: string
}

const RAIL_KEY = 'mp-rail'

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string
  nav: NavItem[]
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const [rail, setRail] = useState(() => localStorage.getItem(RAIL_KEY) === '1')
  const { appName } = useBrand()
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawer(false)
  }, [location.pathname])

  // Lock body scroll + allow Escape to dismiss while the drawer is open.
  useEffect(() => {
    if (!drawer) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [drawer])

  const toggleRail = () => {
    setRail((v) => {
      localStorage.setItem(RAIL_KEY, v ? '0' : '1')
      return !v
    })
  }

  // A grouped nav renders its heading on the first item of each group.
  const seen = new Set<string>()

  const navList = (compact: boolean) => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {nav.map((item) => {
        const showGroup = item.group && !seen.has(item.group)
        if (item.group) seen.add(item.group)
        return (
          <div key={item.to}>
            {showGroup && !compact && <p className="nav-group-label">{item.group}</p>}
            <NavLink
              to={item.to}
              end={item.end}
              title={compact ? item.label : undefined}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : 'hover:nav-link-hover'} ${
                  compact ? 'justify-center px-0' : ''
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!compact && <span className="truncate">{item.label}</span>}
            </NavLink>
          </div>
        )
      })}
    </nav>
  )

  const sidebarInner = (compact: boolean) => (
    <>
      <div
        className={`flex items-center border-b border-[var(--border)] ${
          compact ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4'
        }`}
      >
        {compact ? (
          <span className="accent-bg flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white">
            {initials(appName)}
          </span>
        ) : (
          <Logo />
        )}
        {!compact && (
          <button
            type="button"
            onClick={() => setDrawer(false)}
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {navList(compact)}

      <div className="border-t border-[var(--border)] p-3">
        {compact ? (
          <div className="flex justify-center">
            <span className="accent-bg flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
              {initials(user?.name)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="accent-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{user?.name}</p>
              <p className="truncate text-xs text-[var(--text-muted)] capitalize">
                {appName} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {user?.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      {/* Desktop sidebar - collapses to an icon rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden shrink-0 border-r border-[var(--border)] transition-[width] duration-200 lg:block ${
          rail ? 'w-[var(--spacing-rail)]' : 'w-[var(--spacing-sidebar)]'
        }`}
      >
        <div className="drawer">{sidebarInner(rail)}</div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="scrim"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 w-[min(var(--spacing-sidebar),85vw)] shadow-[var(--shadow-pop)]">
            <div className="drawer">{sidebarInner(false)}</div>
          </div>
        </div>
      )}

      <div
        className={`transition-[padding] duration-200 ${
          rail ? 'lg:pl-[var(--spacing-rail)]' : 'lg:pl-[var(--spacing-sidebar)]'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[var(--topbar-bg)] px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={toggleRail}
            className="btn btn-ghost btn-icon hidden lg:inline-flex"
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {rail ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-[var(--text)] sm:text-lg">{title}</h1>
            <p className="hidden truncate text-xs text-[var(--text-muted)] sm:block">
              {appName} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· <span className="capitalize">{user?.role}</span> panel
            </p>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="btn btn-ghost btn-icon"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <NotificationBell />
          <ProfileMenu />
        </header>

        <main className="animate-fade-up p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

/** Shared icon set so all three panels stay visually consistent. */
export const icons = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  school: <School className="h-4 w-4" />,
  store: <Store className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  plus: <PlusCircle className="h-4 w-4" />,
  tags: <Tags className="h-4 w-4" />,
  settings: <SettingsIcon className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  coins: <HandCoins className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
}


/* =========================================================================
   AuthScreen ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â the login page, shared by all three panels.
   ========================================================================= */
/* Free, hotlinkable imagery (Unsplash License - no API key required).
   Picked per role so each panel gets relevant photography. Swap these URLs to
   re-theme; the component falls back to the gradient if one fails to load. */
const HERO_IMAGES: Record<string, string> = {
  admin: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80',
  vendor: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80',
  school: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80',
  coaching: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80',
  fallback:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
}

/* Company attribution shown on every login page. The year is derived at
   render time, so the footer rolls over automatically each January. */
const _COMPANY = {
  name: 'Aviansys Technologies Private Limited',
  url: 'https://www.aviansys-tech.com/',
}

const LOGIN_COPY: Record<string, { title: string; blurb: string; points: string[] }> = {
  admin: {
    title: 'Command the whole marketplace',
    blurb: 'Approve vendors, onboard schools, assign royalties and publish the catalogue.',
    points: ['Manage vendors & schools', 'Assign royalty splits', 'Branding + payment settings'],
  },
  vendor: {
    title: 'Grow your store',
    blurb: 'List products, track linked schools and keep your catalogue up to date.',
    points: ['Add & edit products', 'View linked schools', 'Track royalties'],
  },
  school: {
    title: 'Serve your students',
    blurb: 'Browse the catalogue, manage your own products and coordinate deliveries.',
    points: ['Browse vendor catalogue', 'Manage school products', 'Track vendors'],
  },
  coaching: {
    title: 'Run your coaching institute',
    blurb: 'Keep your institute details current and get discovered by students in the district directory.',
    points: ['Instant activation', 'Listed in the student directory', 'Update basic details anytime'],
  },
}

export function AuthScreen({ role, signupTo }: { role: string; signupTo?: string }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // If the remote photo fails (offline machine, blocked CDN) we silently keep
  // the brand gradient instead of showing a broken image icon.
  const [heroOk, setHeroOk] = useState(true)
  const nav = useNavigate()
  const { login: save } = useAuth()
  const { appName } = useBrand()
  const copy = LOGIN_COPY[role] ?? LOGIN_COPY.admin
  const hero = HERO_IMAGES[role] ?? HERO_IMAGES.fallback

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { login: login.trim(), password })
      if (data.user.role !== role) {
        setErr(`This panel is for ${role} accounts only. Use the correct panel to sign in.`)
        return
      }
      save(data.user, data.token)
      nav('/', { replace: true })
    } catch (e) {
      setErr(errMsg(e, 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: brand panel */}
        <div className="accent-gradient relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex">
          {/* Hero photo - sits behind the gradient and text, never above them. */}
          {heroOk && (
            <img
              src={hero}
              alt=""
              aria-hidden
              loading="eager"
              decoding="async"
              onError={() => setHeroOk(false)}
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
          )}
          {/* Scrim: keeps the headline readable over any photo. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-black/75" />

          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-black/20 blur-3xl" />

          <div className="relative w-fit rounded-xl bg-white/10 p-3 backdrop-blur">
            <Logo dark />
          </div>

          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {role.toUpperCase()} PANEL
            </span>
            <h2 className="mt-5 text-4xl leading-tight font-bold">{copy.title}</h2>
            <p className="mt-3 text-white/80">{copy.blurb}</p>
            <ul className="mt-7 space-y-2.5">
              {copy.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-white/90">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">{appName} ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· secure workspace</p>
        </div>

        {/* Right: form */}
        <div className="flex w-full flex-1 items-center justify-center bg-[var(--app-bg)] px-5 py-10 sm:px-8 lg:w-1/2">
          <div className="animate-fade-up w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>

            <div className="card p-7 sm:p-8">
              <span className="accent-bg badge">{role}</span>
              <h1 className="mt-3 text-2xl font-bold text-[var(--text)]">Welcome back</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Sign in to your {appName} {role} account.
              </p>

              {err && (
                <div role="alert" className="alert alert-err mt-5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Email or WhatsApp">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                    <input
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="you@example.com"
                      className="field focus:field-focus pl-9 outline-none"
                    />
                  </div>
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      type={show ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢"
                      className="field focus:field-focus px-9 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="btn btn-ghost btn-icon absolute top-1/2 right-2 -translate-y-1/2"
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Button type="submit" busy={busy} className="w-full">
                  {!busy && <ArrowRight className="h-4 w-4" />}
                  {busy ? 'Signing inÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦' : 'Sign in'}
                </Button>
              </form>
              {signupTo && (
                <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
                  {role === 'school' ? 'Need school access?' : `New to the ${role} panel?`}{' '}
                  <Link to={signupTo} className="accent-text font-semibold hover:underline">
                    {role === 'school'
                      ? 'Create a school account'
                      : role === 'coaching'
                        ? 'Register your coaching institute'
                        : 'Create an account'}
                  </Link>
                </p>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-[var(--text-subtle)]">
              {appName} API ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {import.meta.env.VITE_API_URL || '/api/v1'}
            </p>
          </div>
        </div>
      </div>

      {/* Full-width footer. The year is read at render time, so the copyright
          rolls over on its own every January - nothing to maintain by hand. */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          &copy; {new Date().getFullYear()} 
          <a href="https://www.aviansys-tech.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--text)] hover:underline">Aviansys Technologies Private Limited</a>
        </p>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Powered by 
          <a href="https://www.aviansys-tech.com/" target="_blank" rel="noopener noreferrer" className="accent-text font-semibold hover:underline">Aviansys Technology</a>
          <a href="https://www.aviansys-tech.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text)]">aviansys-tech.com</a>
        </p>
      </footer>
    </div>

  )
}
