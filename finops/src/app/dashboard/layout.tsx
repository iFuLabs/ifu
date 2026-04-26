'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, TrendingDown, Settings, LogOut, Menu, GitBranch, Users, CreditCard, PieChart
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/allocation',   label: 'Allocation',   icon: PieChart },
  { href: '/dashboard/integrations', label: 'Integrations', icon: GitBranch },
]

const BOTTOM_NAV = [
  { href: '/dashboard/team',    label: 'Team',    icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Fetch user info - auth cookie is sent automatically via credentials: 'include'
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/me`, {
      credentials: 'include'
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.email) setUserEmail(data.user.email)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) {
        console.error('Logout failed:', res.status)
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      window.location.href = process.env.NEXT_PUBLIC_PORTAL_URL + '/login'
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-56 bg-card border-r border-border transition-transform duration-200',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <img src="/logomark.png" alt="iFu" style={{ height: '32px', width: '32px' }} />
          <span className="font-semibold text-ink">iFu Costless</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all',
                  active
                    ? 'font-semibold text-ink'
                    : 'text-muted hover:text-ink hover:bg-surface-hover'
                )}
                style={active ? { background: '#DAC0FD', borderLeft: '3px solid #8A63E6', paddingLeft: 9, color: '#33063D' } : undefined}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all',
                pathname === href ? 'font-semibold text-ink' : 'text-muted hover:text-ink hover:bg-surface-hover'
              )}
              style={pathname === href ? { background: '#DAC0FD', borderLeft: '3px solid #8A63E6', paddingLeft: 9, color: '#33063D' } : undefined}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}

          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink truncate">{userEmail?.split('@')[0] || 'User'}</div>
              <div className="text-[10px] text-muted truncate">{userEmail || 'user@example.com'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-muted hover:text-danger transition-all w-full text-left"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-56 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)}>
            <Menu size={20} className="text-muted" />
          </button>
          <span className="font-mono text-sm font-medium">iFu Labs · iFu Costless</span>
          <div className="w-5" />
        </div>

        {children}
      </main>
    </div>
  )
}
