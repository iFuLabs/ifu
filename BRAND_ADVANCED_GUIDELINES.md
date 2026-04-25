# Advanced Brand Guidelines Implementation

## Overview

This document covers advanced brand applications from the official iFu Labs Brand Identity Book, including co-branding, photography overlays, and brand in action examples.

## Co-Branding Guidelines

### Layout Structure
When partnering with other brands (e.g., AWS, cloud providers):

```
[iFu Labs Logo] | [Partner Logo]
```

### Implementation Rules

1. **Vertical Divider**
   - Use a thin vertical line between logos
   - Height: Match cap height of iFu Labs wordmark
   - Color: Use border color from current theme (Plum on light, Lavender on dark)
   - Width: 1-2px

2. **Sizing**
   - Align partner logo to baseline of iFu Labs wordmark
   - Match optical weight, not exact height
   - Neither logo should dominate

3. **Color Usage**
   - Always use iFu Labs logo in approved colors (Plum, White, Lavender)
   - Never recolor iFu Labs logo to match partner palette
   - Partner logos must appear in their approved formats

### Example CSS Implementation

```css
.co-branding-container {
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand-divider {
  width: 1px;
  height: 32px; /* Match wordmark cap height */
  background: #33063D; /* Plum on light backgrounds */
}

.partner-logo {
  height: auto;
  max-height: 32px;
}
```

## Photography Overlays

### Color Wash Overlays

Apply brand color overlays to photography to integrate images into the brand system.

**Approved Overlay Colors:**
- Plum (#33063D) with 40-60% opacity
- Iris (#8A63E6) with 30-50% opacity
- Lavender (#DAC0FD) with 20-40% opacity

**CSS Implementation:**
```css
.photo-overlay {
  position: relative;
}

.photo-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #8A63E6;
  opacity: 0.4;
  mix-blend-mode: multiply;
}
```

### Stroke Overlays

Frame photography with geometric strokes using brand colors.

**Rules:**
- Stroke width: 2pt (2px) for digital applications
- Never run strokes across key focal points (eyes, faces, hands)
- Use rounded corners (8-12px border-radius)
- Maintain sufficient contrast for text overlay

**CSS Implementation:**
```css
.photo-frame {
  border: 2px solid #DAC0FD;
  border-radius: 12px;
  overflow: hidden;
}

/* Diagonal stroke overlay */
.photo-diagonal-frame {
  position: relative;
}

.photo-diagonal-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid #FFFFFF;
  border-radius: 12px;
  transform: rotate(-5deg);
  pointer-events: none;
}
```

### Combined Overlays

Color wash + stroke for maximum brand integration:

```css
.photo-branded {
  position: relative;
  border: 2px solid #DAC0FD;
  border-radius: 12px;
  overflow: hidden;
}

.photo-branded::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #33063D 0%, #8A63E6 100%);
  opacity: 0.3;
  mix-blend-mode: multiply;
}
```

## Color in Use Examples

### Hero Section Pattern

```jsx
<section style={{
  background: '#DAC0FD', // Lavender
  padding: '80px 20px'
}}>
  <div style={{
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    alignItems: 'center'
  }}>
    <div>
      <h1 style={{
        fontFamily: "'PP Fragment', serif",
        fontSize: '48px',
        color: '#33063D', // Plum
        marginBottom: '20px'
      }}>
        Get compliant.
        Spend less on AWS.
      </h1>
      <p style={{
        fontFamily: "'Aeonik', sans-serif",
        fontSize: '18px',
        color: '#33063D',
        lineHeight: '1.6'
      }}>
        Automate security compliance and find wasted cloud spend
        in your AWS account. No sales calls. No contracts.
      </p>
    </div>
    <img 
      src="/path/to/image.jpg" 
      alt="Engineer working"
      style={{
        width: '100%',
        borderRadius: '12px',
        border: '2px solid #8A63E6'
      }}
    />
  </div>
</section>
```

### Card Pattern with Mint Accent

```jsx
<div style={{
  background: '#C8F6C0', // Mint
  padding: '40px',
  borderRadius: '16px'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      background: '#33063D',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Logomark */}
    </div>
    <span style={{
      fontFamily: "'Aeonik', sans-serif",
      fontSize: '20px',
      fontWeight: '600',
      color: '#33063D'
    }}>
      iFU Labs
    </span>
  </div>
  <h3 style={{
    fontFamily: "'Aeonik', sans-serif",
    fontSize: '24px',
    fontWeight: '600',
    color: '#33063D',
    marginBottom: '12px'
  }}>
    Prove compliance.
    Reduce spend.
    Zero sales calls.
  </h3>
</div>
```

### Iris CTA Pattern

```jsx
<button style={{
  background: '#8A63E6', // Iris
  color: '#FFFFFF',
  fontFamily: "'Aeonik', sans-serif",
  fontSize: '16px',
  fontWeight: '600',
  padding: '16px 32px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s'
}}
onMouseOver={(e) => e.currentTarget.style.background = '#33063D'}
onMouseOut={(e) => e.currentTarget.style.background = '#8A63E6'}
>
  Get Started
</button>
```

## Brand in Action: Real-World Applications

### 1. Social Media Post Template

```jsx
<div style={{
  width: '1080px',
  height: '1080px',
  background: '#8A63E6', // Iris
  padding: '60px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
}}>
  <div style={{
    background: 'rgba(218, 192, 253, 0.2)',
    borderRadius: '16px',
    padding: '40px',
    border: '2px solid #DAC0FD'
  }}>
    <img 
      src="/photo.jpg" 
      alt="Content"
      style={{
        width: '100%',
        borderRadius: '12px'
      }}
    />
  </div>
  
  <h2 style={{
    fontFamily: "'PP Fragment', serif",
    fontSize: '64px',
    color: '#FFFFFF',
    lineHeight: '1.1'
  }}>
    No dashboard.
    Just fixes.
    All smiles.
  </h2>
  
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }}>
    {/* Logomark */}
    <span style={{
      fontFamily: "'Aeonik', sans-serif",
      fontSize: '24px',
      color: '#FFFFFF'
    }}>
      iFU Labs
    </span>
  </div>
</div>
```

### 2. Billboard/OOH Template

```jsx
<div style={{
  width: '100%',
  aspectRatio: '16/9',
  background: '#33063D', // Plum
  padding: '80px',
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '60px',
  alignItems: 'center'
}}>
  <div>
    <h1 style={{
      fontFamily: "'PP Fragment', serif",
      fontSize: '96px',
      color: '#FFFFFF',
      lineHeight: '1',
      marginBottom: '40px'
    }}>
      Get audit-ready
      without the spreadsheet
    </h1>
    
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    }}>
      {/* Logomark white */}
      <span style={{
        fontFamily: "'Aeonik', sans-serif",
        fontSize: '32px',
        color: '#FFFFFF'
      }}>
        iFU Labs
      </span>
    </div>
  </div>
  
  <div style={{
    background: '#C8F6C0', // Mint
    padding: '40px',
    borderRadius: '24px'
  }}>
    <img 
      src="/photo.jpg" 
      alt="Team member"
      style={{
        width: '100%',
        borderRadius: '16px'
      }}
    />
  </div>
</div>
```

### 3. Swag/Merchandise Examples

**Tote Bag:**
- Background: Plum (#33063D)
- Logomark: Lavender (#DAC0FD) or White (#FFFFFF)
- Text: "Get AWS Compliant" in Aeonik
- Website: ifulabs.com in Aeonik Fono

**Water Bottle:**
- Background: Lavender (#DAC0FD) or Plum (#33063D)
- Text options:
  - "AWS inside" (Aeonik Fono)
  - "Get compliant. Spend less on AWS." (Aeonik)
- Logomark at bottom

**Lanyard/Badge:**
- Background: Plum (#33063D)
- Logomark: White (#FFFFFF)
- Name in Aeonik Medium
- Title in Aeonik Regular

## Implementation Checklist

- [x] Co-branding divider component created
- [x] Photo overlay CSS utilities added
- [x] Stroke frame components implemented
- [x] Hero section patterns documented
- [x] CTA button variants created
- [x] Social media templates prepared
- [ ] Swag design files exported

## Implementation Status

All advanced brand patterns have been implemented and are ready to use:

### Files Created
- `/website/src/components/BrandPatterns.tsx` - Reusable React components
- `/website/src/app/brand-showcase/page.tsx` - Live showcase of all patterns
- CSS utilities added to `/website/src/app/globals.css`

### Available Components
1. `<CoBranding />` - Partner logo display with divider
2. `<PhotoOverlay />` - Images with color wash and frames
3. `<BrandedHero />` - Lavender hero section pattern
4. `<MintCard />` - Success state cards
5. `<IrisButton />` - Primary CTA buttons
6. `<SocialPost />` - 1080×1080 social media template
7. `<Billboard />` - 16:9 OOH advertising template

### How to Use
Visit `/brand-showcase` on your website to see all patterns in action. Copy component usage from the showcase page or import directly from `@/components/BrandPatterns`.

## Notes

- All implementations must maintain WCAG AA contrast requirements
- Test overlays at different opacities for optimal legibility
- Always use approved color combinations
- Maintain clear space around logos in co-branding
- Photography should follow brand principles: Real, Confident, Precise

## Resources Needed

- High-resolution photography following brand guidelines
- Partner logo files in approved formats
- Font files (Aeonik, PP Fragment, Aeonik Fono)
- Design templates for common applications
