/** Storefront chrome: utility bar, logo + search, dropdown category nav, footer + cart badge. */
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Clock, Heart, LogOut, Mail, MapPin, Menu, Moon, Package, Phone, Search, ShoppingCart, Sun, Truck, X } from 'lucide-react'
import { useBrand } from '@lib/brand'
import { Logo, useTheme } from '@ui'
import { useShop } from '../store/shop'
import { useHomeConfig } from '../store/homeConfig'
import { PAGE_ROUTES, useSiteInfo } from '../store/siteInfo'
import { SHOP_MENUS } from '../data/home'

/** Brand glyphs (lucide-react v1 dropped brand icons) — simple inline SVGs. */
const SOCIAL_PATHS: Record<string, string> = {
  Facebook: 'M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5z',
  Instagram: 'M12 8.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8zm0-2.1a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6zm6.8-.3a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM12 4.2c-2.5 0-2.8 0-3.8.1-1 .1-1.6.2-2.2.4-.6.2-1 .5-1.4.9-.4.4-.7.8-.9 1.4-.2.6-.3 1.2-.4 2.2-.1 1-.1 1.3-.1 3.8s0 2.8.1 3.8c.1 1 .2 1.6.4 2.2.2.6.5 1 .9 1.4.4.4.8.7 1.4.9.6.2 1.2.3 2.2.4 1 .1 1.3.1 3.8.1s2.8 0 3.8-.1c1-.1 1.6-.2 2.2-.4.6-.2 1-.5 1.4-.9.4-.4.7-.8.9-1.4.2-.6.3-1.2.4-2.2.1-1 .1-1.3.1-3.8s0-2.8-.1-3.8c-.1-1-.2-1.6-.4-2.2-.2-.6-.5-1-.9-1.4-.4-.4-.8-.7-1.4-.9-.6-.2-1.2-.3-2.2-.4-1-.1-1.3-.1-3.8-.1z',
  X: 'M17.8 4h2.7l-6 6.8L21.5 20h-5.6l-4.3-5.6L6.6 20H3.9l6.4-7.3L3.6 4H9.3l3.9 5.1L17.8 4zm-1 14.3h1.5L8.1 5.6H6.5l10.3 12.7z',
  YouTube: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z',
  LinkedIn: 'M6.9 8.6H4V20h2.9V8.6zM5.4 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM9.5 8.6h2.7v1.6h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4V20h-2.9v-6.2c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V20H9.5V8.6z',
  WhatsApp: 'M12 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12 4zm0 14.6a6.6 6.6 0 0 1-3.4-.9l-.2-.1-2.4.6.6-2.3-.2-.2a6.6 6.6 0 1 1 5.6 2.9zm3.6-4.9c-.2-.1-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.4 5.4 0 0 1-2.7-2.3c-.2-.4.2-.4.6-1.3.1-.2 0-.3 0-.4l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.2 3.5 3 .5.2.9.3 1.2.4.5.2 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2z',
}

function SocialIcon({ network, className }: { network: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={SOCIAL_PATHS[network] ?? SOCIAL_PATHS.Facebook} />
    </svg>
  )
}


export function Shell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme()
  const { appName } = useBrand()
  const { count, wish, student, logout } = useShop()
  const cfg = useHomeConfig()
  const site = useSiteInfo()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  const go = (e: React.FormEvent) => {
    e.preventDefault()
    nav(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop')
    setOpen(false)
  }

  const linkCls = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${isActive ? 'accent-soft accent-soft-text' : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'}`

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      {/* Utility strip (mitticool-style): fulfilment promises + account shortcuts. */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-3)]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 text-[11px] font-medium text-[var(--text-subtle)]">
          <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Free pickup from school on most items</span>
          <span className="hidden sm:inline">Pay online or Cash on Delivery — no hidden fees</span>
          <span className="flex items-center gap-3">
            <Link to="/track" className="hover:text-[var(--text)]">Track order</Link>
            {student ? (
              <Link to="/orders" className="hover:text-[var(--text)]">Hi, {student.name.split(' ')[0]}</Link>
            ) : (
              <Link to="/login" className="font-bold accent-text hover:underline">Login / Register</Link>
            )}
          </span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
          {/* Menu button renders only AFTER login. Logged-out visitors get a clean
              public shop (search / wishlist / cart icons + Login); the full nav
              drawer with Orders / Track / Checkout appears once signed in. */}
          {student && (
            <button className="btn btn-ghost btn-icon lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            {/* <span className="leading-tight">
              <span className="block text-sm font-bold text-[var(--text)]">{appName} Store</span>
              <span className="block text-[11px] text-[var(--text-subtle)]">for students</span>
            </span> */}
          </Link>
          <form onSubmit={go} className="relative mx-auto hidden w-full max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books, bottles, bundles…" className="field pl-9 outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/wishlist" className="btn btn-ghost btn-icon relative" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wish.length > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wish.length}</span>}
            </Link>
            <Link to="/cart" className="btn btn-ghost btn-icon relative" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && <span className="accent-bg absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">{count}</span>}
            </Link>
            {student ? (
              <span className="ml-1 hidden items-center gap-2 sm:flex">
                <Link to="/orders" className="btn btn-secondary !px-3 !py-2 text-xs"><Package className="h-4 w-4" />{student.name.split(' ')[0]}</Link>
                <button className="btn btn-ghost btn-icon" onClick={logout} aria-label="Logout"><LogOut className="h-4 w-4" /></button>
              </span>
            ) : (
              <Link to="/login" className="btn btn-primary ml-1 !px-4 !py-2 text-xs">Login</Link>
            )}
          </div>
        </div>
        <form onSubmit={go} className="relative px-4 pb-3 md:hidden">
          <Search className="pointer-events-none absolute top-1/2 left-7 h-4 w-4 -translate-y-[calc(50%+6px)] text-[var(--text-subtle)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="field pl-9 outline-none" />
        </form>
        {/* Mobile drawer (opens only via the login-gated hamburger): flattened menu. */}
        {open && (
          <div className="border-t border-[var(--border)] px-3 py-2 lg:hidden">
            {SHOP_MENUS.map((m) => m.items ? (
              <div key={m.label} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">{m.label}</p>
                {m.items.map((it) => (
                  <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-3)]">
                    {it.label} {it.hint && <span className="text-[11px] font-normal text-[var(--text-subtle)]">{it.hint}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <NavLink key={m.label} to={m.to!} onClick={() => setOpen(false)}
                className={({ isActive }) => `block ${linkCls(isActive)}`}>
                {m.label}
              </NavLink>
            ))}
          </div>
        )}
        {/* Desktop nav: hover/focus dropdowns (mitticool-style category menu). */}
        <nav aria-label="Main" className="hidden border-t border-[var(--border)] px-4 lg:block">
          <ul className="mx-auto flex max-w-6xl items-center gap-0.5 py-1">
            {SHOP_MENUS.map((m) => (
              <li key={m.label} className="group relative">
                {m.items ? (
                  <>
                    <button type="button" aria-haspopup="menu"
                      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]">
                      {m.label} <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" />
                    </button>
                    <div className="invisible absolute top-full left-0 z-50 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 opacity-0 shadow-[var(--shadow-raised)] transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      {m.items.map((it) => (
                        <Link key={it.to} to={it.to}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text)]">
                          {it.label}
                          {it.hint && <span className="text-[11px] font-normal text-[var(--text-subtle)]">{it.hint}</span>}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <NavLink to={m.to!} className={({ isActive }) => linkCls(isActive)}>{m.label}</NavLink>
                )}
              </li>
            ))}
            <li className="ml-auto hidden items-center gap-1.5 text-xs text-[var(--text-subtle)] xl:flex">
              <Truck className="h-3.5 w-3.5" /> Free pickup from school on most items
            </li>
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      {/* Multi-column footer: brand (+ socials), shop, policies, contact. */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-extrabold text-[var(--text)]">{appName} Store</span>
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              {cfg.footer.blurb}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold accent-text"><Truck className="h-3.5 w-3.5" /> {cfg.footer.promise}</p>
            {site.socials.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                {site.socials.map((s) => (
                  <a key={s.network} href={s.url} target="_blank" rel="noreferrer" aria-label={`${s.network} (opens in new tab)`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-[var(--text-muted)] transition hover:bg-[var(--brand,#6366f1)] hover:text-white">
                    <SocialIcon network={s.network} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">Shop</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(SHOP_MENUS.find((m) => m.label === 'Shop')?.items ?? []).map((it) => (
                <li key={it.to}><Link to={it.to} className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">{it.label}</Link></li>
              ))}
              <li><Link to="/shop?sort=off" className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">Top deals</Link></li>
              <li><Link to="/sell" className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">Sell with us</Link></li>
              <li><Link to="/directory" className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">Institute directory</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">Policies</p>
            <ul className="mt-3 space-y-2 text-sm">
              {PAGE_ROUTES.map((p) => (
                <li key={p.to}><Link to={p.to} className="text-[var(--text-muted)] hover:text-[var(--text)] hover:underline">{site.pages[p.key].title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-[var(--text-subtle)] uppercase">Contact</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--text-muted)]">
              {site.contact.phone && (
                <li><a href={`tel:${site.contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-[var(--text)] hover:underline"><Phone className="h-3.5 w-3.5 shrink-0" /> {site.contact.phone}</a></li>
              )}
              {site.contact.email && (
                <li><a href={`mailto:${site.contact.email}`} className="flex items-center gap-2 hover:text-[var(--text)] hover:underline"><Mail className="h-3.5 w-3.5 shrink-0" /> {site.contact.email}</a></li>
              )}
              {site.contact.address && (
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {site.contact.address}</li>
              )}
              {site.contact.hours && (
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /> {site.contact.hours}</li>
              )}
              <li><Link to="/contact" className="font-bold accent-text hover:underline">Contact us →</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-4 text-center text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text)]">© {new Date().getFullYear()} {appName} Store</p>
          <p className="mt-1">{cfg.footer.bottom}</p>
        </div>
      </footer>
    </div>
  )
}


