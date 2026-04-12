'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, TrendingDown, Settings, LogOut, Menu
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard',          label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/analysis', label: 'Cost Analysis', icon: TrendingDown },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 6L10.5 7.5V10.5L8 12L5.5 10.5V7.5L8 6Z" fill="white"/>
            </svg>
          </div>
          <span className="font-mono text-sm font-medium tracking-tight">FinOps</span>
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
                    ? 'bg-brand-light text-brand font-medium border-r-2 border-brand -mr-3 pr-3'
                    : 'text-muted hover:text-ink hover:bg-bg'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <Link
            href="/dashboard/settings"
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all text-muted hover:text-ink hover:bg-bg',
              pathname === '/dashboard/settings' && 'bg-brand-light text-brand font-medium'
            )}
          >
            <Settings size={15} />
            Settings
          </Link>

          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink truncate">User</div>
              <div className="text-[10px] text-muted truncate">user@example.com</div>
            </div>
          </div>

          <a
            href="http://localhost:3003"
            className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-muted hover:text-ink transition-all"
          >
            <LogOut size={15} />
            Back to portal
          </a>
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
          <span className="font-mono text-sm font-medium">iFu Labs · FinOps</span>
          <div className="w-5" />
        </div>

        {children}
      </main>
    </div>
  )
}
