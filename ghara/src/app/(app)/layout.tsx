'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Shield, TrendingDown, GitBranch,
  Users, CreditCard, Bell, Settings, LogOut, Menu, X, ScrollText
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import TrialBanner from '@/components/TrialBanner'

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/compliance',     label: 'Compliance',   icon: Shield },
  { href: '/cost',           label: 'Cost',         icon: TrendingDown },
  { href: '/integrations',   label: 'Integrations', icon: GitBranch },
]

const BOTTOM_NAV = [
  { href: '/team',           label: 'Team',          icon: Users },
  { href: '/billing',        label: 'Billing',       icon: CreditCard },
  { href: '/notifications',  label: 'Notifications', icon: Bell },
  { href: '/compliance/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/account',        label: 'Settings',      icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user)
        else router.replace('/login')
      })
      .catch(() => router.replace('/login'))
  }, [router])

  const handleLogout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {}
    window.location.href = '/login'
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
          <img src="/brand/logo.svg" alt="Ghara" className="h-7" />
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
                    : 'text-muted hover:text-ink hover:bg-surface'
                )}
                style={active ? { background: '#DAC0FD', borderLeft: '3px solid #8A63E6', paddingLeft: 9, color: '#33063D' } : undefined}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all',
                  active
                    ? 'font-semibold text-ink'
                    : 'text-muted hover:text-ink hover:bg-surface'
                )}
                style={active ? { background: '#DAC0FD', borderLeft: '3px solid #8A63E6', paddingLeft: 9, color: '#33063D' } : undefined}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {/* User */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2 mt-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: '#8A63E6' }}>
                {(user.name?.[0] || user.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{user.name || user.email.split('@')[0]}</div>
                <div className="text-[10px] text-muted truncate">{user.email}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-muted hover:text-danger transition-all w-full text-left"
          >
            <LogOut size={16} />
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
        <TrialBanner />
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} className="text-muted" />
          </button>
          <span className="font-mono text-sm font-medium text-ink">iFU Labs · Ghara</span>
          <div className="w-5" />
        </div>

        {children}
      </main>
    </div>
  )
}
