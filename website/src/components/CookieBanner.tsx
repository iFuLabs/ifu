'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ifu-cookie-consent'

type Choice = 'accepted' | 'rejected'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch { /* localStorage unavailable — fail silently */ }
  }, [])

  const decide = (choice: Choice) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() })) } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <strong>We use cookies.</strong>{' '}
          iFu Labs uses essential cookies for authentication and session management.
          We do not use third-party advertising or tracking cookies.{' '}
          <a href="/privacy">Read our Privacy Policy</a>.
        </div>
        <div className="cookie-banner-actions">
          <button type="button" className="cookie-btn cookie-btn--ghost" onClick={() => decide('rejected')}>
            Reject non-essential
          </button>
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={() => decide('accepted')}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
