/**
 * School panel (:5182).
 *
 * Shell, tokens and primitives come from this app's shared kit, so this panel
 * matches admin and vendor by construction.
 */
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@lib/auth'
import { BrandProvider } from '@lib/brand'
import { AppShell, icons, type NavItem } from '@ui'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Catalogue } from './pages/Catalogue'
import { Vendors } from './pages/Vendors'
import { Products } from './pages/Products'
import { ProductForm } from './pages/ProductForm'
import { Register } from './pages/Register'
import { RegisterOnboarding } from './pages/RegisterOnboarding'
import { InstituteDetails } from './pages/InstituteDetails'

const ROLE = 'school'
const PREFIX = 'school'

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true, group: 'Overview' },
  { to: '/catalogue', label: 'Catalogue', icon: icons.book, group: 'Catalogue' },
  { to: '/vendors', label: 'Vendors', icon: icons.store, group: 'Network' },
  { to: '/products', label: 'My products', icon: icons.package, group: 'My products' },
  { to: '/products/new', label: 'Add product', icon: icons.plus, group: 'My products' },
  { to: '/details', label: 'Institute details', icon: icons.building, group: 'Profile' },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/catalogue': 'Catalogue',
  '/vendors': 'Vendors',
  '/products': 'My products',
  '/products/new': 'Add product',
  '/details': 'Institute details',
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
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<RegisterOnboarding />} />
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
  else if (pathname === '/catalogue') page = <Catalogue />
  else if (pathname === '/vendors') page = <Vendors />
  else if (pathname === '/products') page = <Products />
  else if (pathname === '/products/new') page = <ProductForm prefix={PREFIX} />
  else if (pathname === '/details') page = <InstituteDetails />
  else page = <NotFound path={pathname} />

  return (
    <AppShell title={TITLES[pathname] ?? 'School panel'} nav={NAV}>
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
        part of the school panel.
      </p>
    </div>
  )
}
