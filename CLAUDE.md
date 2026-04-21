# CLAUDE.md — iFu Labs Logo & Mobile Fixes

## Current task
Logo consistency audit, mobile click fix, and hero copy update across all apps (website, portal, comply, finops)

## Logo folder path
`/Users/titusquayson/Downloads/iFU Labs/`
- SVG: white.svg, black.svg, lavender.svg, plum.svg
- PNG: logomark (1024x1024)@4x-8.png + variants

**Copied to project:**
- `website/public/logos/` - all 4 SVG files
- `portal/public/logos/` - all 4 SVG files  
- `comply/public/logos/` - all 4 SVG files
- `finops/public/logos/` - all 4 SVG files
- `website/public/logomark.png` - 1024x1024 PNG for favicon/metadata

## Mobile click root cause
**FOUND**: `.nav-mobile-backdrop` in `website/src/app/globals.css` has `z-index: 999` and `display: block` on mobile but lacks `pointer-events: none` when closed. Even with `opacity: 0`, it blocks all clicks underneath.

**FIX**: Add `pointer-events: none;` to `.nav-mobile-backdrop` base style, and `pointer-events: auto;` to `.nav-mobile-backdrop.is-open`

## Status

### Website
| File | Logo Status | Mobile Clicks |
|---|---|---|
| website/src/components/SiteNav.tsx | ✅ white.svg (correct) | N/A |
| website/src/components/SiteFooter.tsx | ✅ white.svg (correct) | N/A |
| website/src/app/globals.css | N/A | ✅ FIXED - added pointer-events |
| website/src/app/HomePageClient.tsx | ✅ DONE - replaced SVG with white.svg | N/A |
| website/src/app/HomePageClient.tsx hero copy | ✅ DONE - updated to new copy | N/A |
| website/src/app/for-startups/page-minimal.tsx | ✅ DONE - white.svg nav, black.svg footer | N/A |
| website/src/app/demo/comply/ComplyDemoPageClient.tsx | ✅ DONE - white.svg nav & footer | N/A |
| website/src/app/demo/costless/CostlessDemoPageClient.tsx | ✅ DONE - white.svg nav & footer | N/A |

### Portal
| File | Logo Status | Mobile Clicks |
|---|---|---|
| portal/src/app/login/page.tsx | ✅ white.svg (correct) | N/A |
| portal/src/app/invite/[token]/page.tsx | ✅ white.svg (correct) | N/A |
| portal/src/app/reset-password/[token]/page.tsx | ✅ white.svg (correct) | N/A |
| portal/src/app/forgot-password/page.tsx | ✅ white.svg (correct) | N/A |
| portal/src/app/page.tsx | ✅ lavender.svg (correct) | N/A |
| portal/src/app/onboarding/page.tsx | ✅ DONE - replaced SVG with white.svg | N/A |
| portal/src/app/subscribe/page.tsx | ✅ DONE - replaced SVG with white.svg | N/A |

### Comply
| File | Logo Status | Mobile Clicks |
|---|---|---|
| comply/src/app/dashboard/layout.tsx | ✅ white.svg (correct) | N/A |
| comply/src/app/page.tsx | ⏸ SKIPPED - redirects to dashboard | N/A |

### FinOps
| File | Logo Status | Mobile Clicks |
|---|---|---|
| finops/src/app/dashboard/layout.tsx | ✅ white.svg (correct) | N/A |
| finops/src/app/page.tsx | ⏸ SKIPPED - redirects to dashboard | N/A |

## Last completed
✅ ALL FIXES COMPLETE!
- Fixed mobile click blocking in website/src/app/globals.css
- Updated hero copy in website/src/app/HomePageClient.tsx
- Replaced all hardcoded SVG hexagons with proper logo files across 8 files
- Updated footer tagline across all 5 locations to: "Expert AWS engineering for startups that ship fast."

## Footer tagline locations updated:
1. ✅ website/src/components/SiteFooter.tsx
2. ✅ website/src/app/HomePageClient.tsx
3. ✅ website/src/app/for-startups/page-minimal.tsx
4. ✅ website/src/app/demo/comply/ComplyDemoPageClient.tsx
5. ✅ website/src/app/demo/costless/CostlessDemoPageClient.tsx

## Next up
None - all tasks complete!

## Notes
- Mobile click issue was caused by `.nav-mobile-backdrop` having `z-index: 999` without `pointer-events: none` when closed
- All hardcoded SVG hexagons have been replaced with actual logo files
- Logo sizes: nav 34px, footer 30px, auth cards 36px (all height, width auto to preserve aspect ratio)
- Used white.svg for dark backgrounds, black.svg for light backgrounds (for-startups footer)
- Hero copy updated from startup-focused to consultant-led services focus

## TODO
None - implementation complete!

## Implementation Plan (awaiting confirmation)

### 1. Website Navigation (Dark background #07080D)
**File:** `website/src/components/SiteNav.tsx`
**Logo:** `white.svg`
**Why:** Dark background requires white logo for contrast
**Changes:** Replace hardcoded SVG hexagon + text with `<img src="/logos/white.svg" alt="iFU Labs" />`

### 2. Website Footer (Dark background)
**File:** `website/src/components/SiteFooter.tsx`
**Logo:** `white.svg`
**Why:** Dark background requires white logo
**Changes:** Replace hardcoded SVG hexagon + text with `<img src="/logos/white.svg" alt="iFU Labs" />`

### 3. Portal Login Page (Dark gradient background)
**File:** `portal/src/app/login/page.tsx`
**Logo:** `white.svg`
**Why:** Dark radial gradient background
**Changes:** Replace hardcoded SVG hexagon in orange box with `<img src="/logos/white.svg" alt="iFU Labs" />` (remove orange box, logo has its own colors)

### 4. Portal Invite Page
**File:** `portal/src/app/invite/[token]/page.tsx`
**Logo:** `white.svg`
**Why:** Dark background
**Changes:** Replace LOGO_MARK constant with actual logo

### 5. Portal Reset Password Page
**File:** `portal/src/app/reset-password/[token]/page.tsx`
**Logo:** `white.svg`
**Why:** Dark background
**Changes:** Replace LOGO_MARK constant with actual logo

### 6. Portal Forgot Password Page
**File:** `portal/src/app/forgot-password/page.tsx`
**Logo:** `white.svg` (if exists, need to check)
**Why:** Dark background
**Changes:** Replace any hardcoded logo

### 7. Portal Choose Product Page
**File:** `portal/src/app/page.tsx`
**Logo:** `lavender.svg`
**Why:** Per usage guide - product selector uses lavender variant
**Changes:** Replace any hardcoded logo

### 8. Comply Dashboard Sidebar
**File:** `comply/src/app/dashboard/layout.tsx`
**Logo:** `white.svg`
**Why:** Dark sidebar background
**Changes:** Replace hardcoded SVG hexagon + "iFu Comply" text with logo

### 9. FinOps Dashboard Sidebar
**File:** `finops/src/app/dashboard/layout.tsx`
**Logo:** `white.svg`
**Why:** Dark sidebar background
**Changes:** Replace hardcoded SVG hexagon + "iFu Costless" text with logo

### 10. Website Favicon & Metadata
**File:** `website/src/app/layout.tsx`
**Logo:** `logomark.png`
**Why:** Favicon requires PNG, metadata needs OG image
**Changes:** Update icons metadata to use `/logomark.png`, add proper sizes

### 11. Portal Favicon & Metadata
**File:** `portal/src/app/layout.tsx`
**Logo:** `logomark.png`
**Why:** Favicon requires PNG
**Changes:** Update icons metadata to use `/logomark.png`

### 12. Email Templates (3 templates)
**File:** `src/services/email.js`
**Logo:** Need to embed as base64 or use hosted URL
**Why:** Email clients need inline or absolute URLs
**Changes:** Replace text "iFu Labs" with logo image (will need to decide on approach)

## Last completed
✅ ALL 12 FILES COMPLETE! Logo implementation finished across entire project.

All hardcoded logos replaced with professional SVG/PNG brand assets. Favicon and metadata updated. Email templates now use hosted logo URL.

## Next up
None - logo implementation complete. Ready to commit and deploy.

## Notes
- All logos successfully implemented with correct variants
- Website nav/footer: white.svg on dark backgrounds
- Portal pages: white.svg on dark gradients, lavender.svg on product selector
- Dashboard sidebars: white.svg (removed product name text for cleaner look)
- Favicons: logomark.png with proper sizes (16x16, 32x32, 180x180)
- OG/Twitter images: logomark.png for social sharing
- Email templates: white.svg hosted at https://www.ifulabs.com/logos/white.svg
- All aspect ratios preserved - no stretching
- No CSS filters used - correct color variants selected

## Implementation Summary
1. ✅ Copied all logo files to public folders
2. ✅ Replaced 9 in-page hardcoded logos with SVG files
3. ✅ Updated 2 layout files with proper favicon/metadata
4. ✅ Updated 3 email templates with hosted logo URL
5. ✅ Removed all orange gradient boxes and hardcoded SVG hexagons
6. ✅ Consistent professional branding across all touchpoints

## TODO
None - implementation complete!
