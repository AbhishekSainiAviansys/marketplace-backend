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
import { Coaching } from './pages/Coaching'
import { SchoolProfilePage } from './pages/SchoolProfilePage'
import { Students } from './pages/Students'
import { OrderLedger } from './pages/OrderLedger'
import { OrderDetail } from './pages/OrderDetail'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { Categories } from './pages/Categories'
import { Coupons } from './pages/Coupons'
import { Products } from './pages/Products'
import { AppShell, icons, type NavItem } from '@ui'

const ROLE = 'admin'
const PREFIX = 'admin'

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/vendors', label: 'Vendors', icon: icons.store },
  { to: '/schools', label: 'Schools', icon: icons.school },
  { to: '/coaching', label: 'Coaching institutes', icon: icons.building },
  { to: '/students', label: 'Students', icon: icons.users },
  { to: '/order-ledger', label: 'Admin Order Ledger', icon: icons.coins },
  { to: '/categories', label: 'Categories', icon: icons.tags },
  { to: '/coupons', label: 'Coupons', icon: icons.tags },
  { to: '/products', label: 'Admin Products', icon: icons.package },
  { to: '/products/new', label: 'Add Product', icon: icons.plus },
  { to: '/home-content', label: 'Home content', icon: <HomeIcon className="h-4 w-4" /> },
  { to: '/pages-footer', label: 'Pages & Footer', icon: <FileText className="h-4 w-4" /> },
  { to: '/settings', label: 'Settings', icon: icons.settings },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/vendors': 'Vendors',
  '/schools': 'Schools',
  '/coaching': 'Coaching institutes',
  '/students': 'Students',
  '/order-ledger': 'Admin Order Ledger',
  '/categories': 'Categories',
  '/coupons': 'Coupons',
  '/products': 'Admin Products',
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
  else if (pathname === '/coaching') page = <Coaching />
  else if (pathname === '/students') page = <Students />
  else if (pathname === '/order-ledger') page = <OrderLedger />
  else if (/^\/order-ledger\/\d+$/.test(pathname)) page = <OrderDetail />
  else if (pathname === '/students/profile') page = <StudentProfilePage />
  else if (pathname === '/categories') page = <Categories />
  else if (pathname === '/coupons') page = <Coupons />
else if (pathname === '/products') page = <Products />
  else if (pathname === '/schools/profile') page = <SchoolProfilePage />
  else if (pathname === '/products/new') page = <ProductForm prefix={PREFIX} />
  else if (/^\/products\/[A-Za-z0-9\-]+\/edit$/.test(pathname)) page = <ProductForm prefix={PREFIX} id={pathname.split('/')[2]} />
  else if (pathname === '/home-content') page = <HomeContent />
  else if (pathname === '/pages-footer') page = <SitePages />
  else if (pathname === '/settings') page = <Settings />
  else page = <Placeholder path={pathname} />

  return <AppShell title={TITLES[pathname] ?? (pathname.includes('/edit') ? 'Edit product' : 'Admin panel')} nav={NAV}>{page}</AppShell>
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
