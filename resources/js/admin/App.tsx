import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FileText, Home as HomeIcon } from 'lucide-react'
import { AuthProvider, useAuth } from '@lib/auth'
import { BrandProvider } from '@lib/brand'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ProductForm } from './pages/ProductForm'
import { Settings } from './pages/Settings'
import { HomeContent } from './pages/HomeContent'
import { SitePages } from './pages/SitePages'
import { Vendors } from './pages/Vendors'
import { Schools } from './pages/Schools'
import { SchoolProfilePage } from './pages/SchoolProfilePage'
import { AppShell, icons, type NavItem } from '@ui'

const ROLE = 'admin'
const PREFIX = 'admin'

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/vendors', label: 'Vendors', icon: icons.store },
  { to: '/schools', label: 'Schools', icon: icons.school },
  { to: '/categories', label: 'Categories', icon: icons.tags },
  { to: '/products', label: 'Products', icon: icons.package },
  { to: '/products/new', label: 'Add Product', icon: icons.plus },
  { to: '/home-content', label: 'Home content', icon: <HomeIcon className="h-4 w-4" /> },
  { to: '/pages-footer', label: 'Pages & Footer', icon: <FileText className="h-4 w-4" /> },
  { to: '/settings', label: 'Settings', icon: icons.settings },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/vendors': 'Vendors',
  '/schools': 'Schools',
  '/categories': 'Categories',
  '/products': 'Products',
  '/products/new': 'Add product',
  '/home-content': 'Home content',
  '/pages-footer': 'Pages & Footer',
  '/settings': 'Settings',
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

  if (pathname === '/') page = <Dashboard role={ROLE} prefix={PREFIX} />
  else if (pathname === '/vendors') page = <Vendors />
  else if (pathname === '/schools') page = <Schools />
  else if (pathname === '/schools/profile') page = <SchoolProfilePage />
  else if (pathname === '/products/new') page = <ProductForm prefix={PREFIX} />
  else if (pathname === '/home-content') page = <HomeContent />
  else if (pathname === '/pages-footer') page = <SitePages />
  else if (pathname === '/settings') page = <Settings />
  else page = <Placeholder path={pathname} />

  return <AppShell title={TITLES[pathname] ?? 'Admin panel'} nav={NAV}>{page}</AppShell>
}

function Placeholder({ path }: { path: string }) {
  return (
    <div className="card mx-auto max-w-2xl p-10 text-center">
      <h2 className="text-lg font-bold text-slate-900">Coming soon</h2>
      <p className="mt-2 text-sm text-slate-500">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{path}</code> is wired into the sidebar and
        protected routing, but the screen itself has not been built yet.
      </p>
    </div>
  )
}
