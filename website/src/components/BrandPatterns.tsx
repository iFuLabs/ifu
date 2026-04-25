/**
 * Advanced Brand Pattern Components
 * Based on official iFu Labs Brand Identity Book
 * 
 * Includes: Co-branding, Photo overlays, Branded CTAs, Social templates, Gradients
 */

import React from 'react'

// ── GRADIENT BACKGROUNDS ─────────────────────────────────────────

type GradientType = 'plum-lavender' | 'iris-lavender' | 'grey-white' | 'mint-white'
type GradientDirection = 'linear' | 'radial'

interface GradientBackgroundProps {
  type: GradientType
  direction?: GradientDirection
  children: React.ReactNode
  className?: string
}

export function GradientBackground({ 
  type, 
  direction = 'linear',
  children, 
  className = '' 
}: GradientBackgroundProps) {
  const gradientClass = direction === 'radial' 
    ? `gradient-${type}-radial` 
    : `gradient-${type}`
  
  return (
    <div className={`${gradientClass} ${className}`}>
      {children}
    </div>
  )
}

// ── CO-BRANDING COMPONENT ────────────────────────────────────────

interface CoBrandingProps {
  partnerLogoSrc: string
  partnerLogoAlt: string
  theme?: 'dark' | 'light'
}

export function CoBranding({ partnerLogoSrc, partnerLogoAlt, theme = 'dark' }: CoBrandingProps) {
  return (
    <div className="co-branding-container">
      <img
        src={theme === 'light' ? '/logos/plum.svg' : '/logos/white.svg'}
        alt="iFu Labs"
        style={{ height: '32px', width: 'auto' }}
      />
      <div className={`brand-divider${theme === 'light' ? ' brand-divider--light' : ''}`} />
      <img 
        src={partnerLogoSrc} 
        alt={partnerLogoAlt}
        className="partner-logo"
      />
    </div>
  )
}

// ── PHOTO WITH OVERLAY ───────────────────────────────────────────

interface PhotoOverlayProps {
  src: string
  alt: string
  overlay?: 'plum' | 'lavender' | 'iris'
  frame?: boolean
  frameColor?: 'plum' | 'lavender' | 'iris'
  diagonal?: boolean
  className?: string
}

export function PhotoOverlay({ 
  src, 
  alt, 
  overlay = 'iris', 
  frame = false,
  frameColor = 'lavender',
  diagonal = false,
  className = ''
}: PhotoOverlayProps) {
  const overlayClass = `photo-overlay photo-overlay--${overlay}`
  const frameClass = frame ? `photo-frame photo-frame--${frameColor}` : ''
  const diagonalClass = diagonal ? 'photo-diagonal-frame' : ''
  
  return (
    <div className={`${overlayClass} ${frameClass} ${diagonalClass} ${className}`}>
      <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} />
    </div>
  )
}

// ── BRANDED HERO SECTION ─────────────────────────────────────────

interface BrandedHeroProps {
  title: string
  subtitle: string
  imageSrc: string
  imageAlt: string
  ctaText?: string
  ctaHref?: string
}

export function BrandedHero({ 
  title, 
  subtitle, 
  imageSrc, 
  imageAlt,
  ctaText,
  ctaHref
}: BrandedHeroProps) {
  return (
    <section className="hero-branded">
      <div className="hero-branded-inner">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {ctaText && ctaHref && (
            <a href={ctaHref} className="btn-iris" style={{ marginTop: '24px' }}>
              {ctaText}
            </a>
          )}
        </div>
        <PhotoOverlay 
          src={imageSrc} 
          alt={imageAlt}
          overlay="iris"
          frame
          frameColor="iris"
        />
      </div>
    </section>
  )
}

// ── MINT ACCENT CARD ─────────────────────────────────────────────

interface MintCardProps {
  icon?: React.ReactNode
  title: string
  description: string
}

export function MintCard({ icon, title, description }: MintCardProps) {
  return (
    <div className="card-mint">
      {icon && (
        <div className="card-mint-icon">
          {icon}
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

// ── IRIS CTA BUTTON ──────────────────────────────────────────────

interface IrisButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

export function IrisButton({ children, href, onClick, type = 'button' }: IrisButtonProps) {
  if (href) {
    return (
      <a href={href} className="btn-iris">
        {children}
      </a>
    )
  }
  
  return (
    <button type={type} onClick={onClick} className="btn-iris">
      {children}
    </button>
  )
}

// ── SOCIAL MEDIA POST TEMPLATE ───────────────────────────────────

interface SocialPostProps {
  headline: string
  imageSrc?: string
  imageAlt?: string
}

export function SocialPost({ headline, imageSrc, imageAlt }: SocialPostProps) {
  return (
    <div className="social-post">
      <div className="social-post-content">
        {imageSrc && (
          <img 
            src={imageSrc} 
            alt={imageAlt || ''} 
            style={{ 
              width: '100%', 
              borderRadius: '12px',
              marginBottom: '24px'
            }} 
          />
        )}
      </div>
      
      <h2>{headline}</h2>
      
      <div className="social-post-footer">
        <img 
          src="/logos/white.svg" 
          alt="iFu Labs" 
          style={{ height: '40px', width: 'auto' }}
        />
        <span>iFU Labs</span>
      </div>
    </div>
  )
}

// ── BILLBOARD/OOH TEMPLATE ───────────────────────────────────────

interface BillboardProps {
  headline: string
  imageSrc: string
  imageAlt: string
}

export function Billboard({ headline, imageSrc, imageAlt }: BillboardProps) {
  return (
    <div className="billboard">
      <div>
        <h1>{headline}</h1>
        
        <div className="billboard-footer">
          <img 
            src="/logos/white.svg" 
            alt="iFu Labs" 
            style={{ height: '40px', width: 'auto' }}
          />
          <span>iFU Labs</span>
        </div>
      </div>
      
      <div className="billboard-image">
        <img src={imageSrc} alt={imageAlt} />
      </div>
    </div>
  )
}
