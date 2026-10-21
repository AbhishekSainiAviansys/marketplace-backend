/**
 * Vendor panel (:5181).
 *
 * The shell, design tokens and primitives come from this app's shared kit.
 * Only the nav list and screens are vendor-specific.
 */
import type { ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@lib/auth'
import { BrandProvider } from '@lib/brand'
import { AppShell, icons, type NavItem } from '@ui'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { ProductForm } from './pages/ProductForm'
import { Schools } from './pages/Schools'
import { Addresses } from './pages/Addresses'

const ROLE = 'vendor'
const PREFIX = 'vendor'

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true, group: 'Overview' },
  { to: '/products', label: 'My products', icon: icons.package, group: 'Catalogue' },
  { to: '/products/new', label: 'Add product', icon: icons.plus, group: 'Catalogue' },
  { to: '/schools', label: 'Linked schools', icon: icons.school, group: 'Network' },
  { to: '/addresses', label: 'My addresses', icon: <MapPin className="h-4 w-4" />, group: 'Network' },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'My products',
  '/products/new': 'Add product',
  '/schools': 'Linked schools',
  '/addresses': 'My addresses',
}

function Guard({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== ROLE) return <Navigate to="/login" replace />
  return children
}

export default function App({ basename = '/' }: { basename?: string }) {
  return (
    <AuthProvider>
      <BrandProvider>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/login" element={<Login role={ROLE} />} />
            <Route
              path="*"
              element={
                <Guard>
                  <Shell />
                </Guard>
              }
            />
          </Routes>
        </BrowserRouter>
      </BrandProvider>
    </AuthProvider>
  )
}

/** Picks the page title from the current path and renders the shared shell. */
function Shell() {
  const { pathname } = useLocation()
  let page: ReactNode

  if (pathname === '/') page = <Dashboard prefix={PREFIX} />
  else if (pathname === '/products') page = <Products />
  else if (pathname === '/products/new') page = <ProductForm prefix={PREFIX} />
  else if (pathname === '/schools') page = <Schools />
  else if (pathname === '/addresses') page = <Addresses />
  else page = <NotFound path={pathname} />

  return (
    <AppShell title={TITLES[pathname] ?? 'Vendor panel'} nav={NAV}>
      {page}
    </AppShell>
  )
}

function NotFound({ path }: { path: string }) {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-lg font-bold text-[var(--text)]">Page not found</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-xs">{path}</code> is not
        part of the vendor panel.
      </p>
    </div>
  )
}
