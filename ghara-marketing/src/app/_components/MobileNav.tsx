'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MobileNav({ appUrl }: { appUrl: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const nav = document.querySelector('.site-nav')
    if (!nav) return
    const onScroll = () => {
      if (window.scrollY > 12) nav.classList.add('is-scrolled')
      else nav.classList.remove('is-scrolled')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = () => setOpen(false)

  return (
    <>
      <button
        className="nav-mobile-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      <div className={`mobile-nav ${open ? 'open' : ''}`} role="dialog" aria-hidden={!open}>
        <Link href="/#features" onClick={close}>Features</Link>
        <Link href="/#pricing" onClick={close}>Pricing</Link>
        <Link href="/about" onClick={close}>About</Link>
        <Link href="/demo" onClick={close}>Demo</Link>
        <div className="mobile-nav-actions">
          <a href={`${appUrl}/login`} className="btn-secondary" onClick={close}>Sign in</a>
          <a href={`${appUrl}/signup`} className="btn-primary" onClick={close}>Start free trial</a>
        </div>
      </div>
    </>
  )
}
