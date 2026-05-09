'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-grey">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-plum flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-plum text-lg">Ghara</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/compliance" className="text-sm text-plum/70 hover:text-plum transition-colors">Compliance</Link>
          <Link href="/cost" className="text-sm text-plum/70 hover:text-plum transition-colors">Cost</Link>
          <Link href="/pricing" className="text-sm text-plum/70 hover:text-plum transition-colors">Pricing</Link>
          <Link href="/demo" className="text-sm text-plum/70 hover:text-plum transition-colors">Demo</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://app.ghara.cloud/login" className="text-sm text-plum/70 hover:text-plum px-3 py-2">Sign in</a>
          <a href="https://app.ghara.cloud/signup" className="text-sm font-medium text-white bg-plum px-4 py-2 rounded-lg hover:bg-plum/90 transition-colors">
            Start free trial
          </a>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-grey px-6 py-4 space-y-3 bg-white">
          <Link href="/compliance" className="block text-sm text-plum/70">Compliance</Link>
          <Link href="/cost" className="block text-sm text-plum/70">Cost</Link>
          <Link href="/pricing" className="block text-sm text-plum/70">Pricing</Link>
          <Link href="/demo" className="block text-sm text-plum/70">Demo</Link>
          <hr className="border-grey" />
          <a href="https://app.ghara.cloud/signup" className="block text-sm font-medium text-white bg-plum px-4 py-2.5 rounded-lg text-center">
            Start free trial
          </a>
        </div>
      )}
    </nav>
  )
}
