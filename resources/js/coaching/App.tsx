/**
 * Coaching institute panel (/coaching/*).
 *
 * Shell, tokens and primitives come from the shared kit so this panel matches
 * admin/vendor/school by construction. Unlike the school flow there is no
 * review gate: registration activates instantly and lands on the profile page
 * (the basic details entered at signup, kept editable afterwards).
 */
import type { ReactNode } from 'react'
import { Inbox, Mail, Tag } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@lib/auth'
import { BrandProvider } from '@lib/brand'
import { AppShell, icons, type NavItem } from '@ui'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Messages } from './pages/Messages'
import { Profile } from './pages/Profile'
import { InstituteDetails } from './pages/InstituteDetails'
import { Keywords } from './pages/Keywords'

const ROLE = 'coaching'

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard, end: true, group: 'Overview' },
  { to: '/messages', label: 'Messages', icon: <Mail className="h-4 w-4" />, group: 'Overview' },
  { to: '/leads', label: 'Enquiry/Leads', icon: <Inbox className="h-4 w-4" />, group: 'Overview' },
  { to: '/profile', label: 'Profile', icon: icons.users, group: 'Overview' },
  { to: '/keywords', label: 'Keywords', icon: <Tag className="h-4 w-4" />, group: 'Overview' },
  { to: '/details', label: 'Courses & details', icon: icons.book, group: 'Details' },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/messages': 'Messages',
  '/leads': 'Enquiry/Leads',
  '/profile': 'Profile',
  '/keywords': 'Keywords',
  '/details': 'Courses & details',
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
  if (pathname === '/') page = <Dashboard />
  else if (pathname === '/messages') page = <Messages />
  else if (pathname === '/leads') page = <Leads />
  else if (pathname === '/profile') page = <Profile />
  else if (pathname === '/keywords') page = <Keywords />
  else if (pathname === '/details') page = <InstituteDetails />
  else page = <NotFound path={pathname} />

  return (
    <AppShell title={TITLES[pathname] ?? 'Coaching panel'} nav={NAV}>
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
        part of the coaching panel.
      </p>
    </div>
  )
}