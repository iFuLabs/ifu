# CLAUDE.md — Brand Identity & Light-Mode Conversion

## Current task
Convert website + portal (auth/billing only) from dark to light mode using the official iFU Labs Brand Identity. Source: `/Users/titusquayson/Downloads/iFU Labs-compressed.pdf` → extracted to `brand.md`.

## Brand tokens (from PDF)
- **Palette**: Plum `#33063D` · Lavender `#DAC0FD` · Iris `#8A63E6` · White `#FFFFFF` · Grey `#F4F4F4` · Mint `#C8F6C0`
- **Typography**: Aeonik (sans) · PP Fragment (display ≥32pt) · Aeonik Fono (mono) · Arial (fallback)
- **Logos** (`website/public/logos/`): `plum.svg` (on light), `white.svg` (on plum/dark), `black.svg`, `lavender.svg`
- **Light-mode role map**:
  - bg `#FFFFFF` · surface `#F4F4F4` · elevated `#FFFFFF` · accent surface `#DAC0FD`
  - ink/primary text `#33063D` · muted `#33063D` @ 0.7 opacity · link `#8A63E6`
  - pragmatic border `#E5E5E5` (brand Grey too close to white for borders — documented deviation)

## Scope rules
- **In scope**: website (all pages), portal auth (login, forgot/reset/invite), portal onboarding, portal billing (subscribe, callback)
- **Out of scope**: comply dashboard, finops dashboard, portal dashboard interiors
- No copy / layout / functionality changes. Colors/typography/logos only.

## Status

| # | File | Status |
|---|------|--------|
| 1 | `brand.md` (root) | ✅ Created from PDF |
| 2 | `website/src/app/globals.css` | ✅ `:root` tokens flipped; dark hexes patched; svc-hero/cards/about/nav/footer/mobile drawer converted |
| 3 | `website/src/app/layout.tsx` | ✅ themeColor → `#FFFFFF` |
| 4 | `website/src/components/SiteNav.tsx` | ✅ Logo → `plum.svg` |
| 5 | `website/src/components/SiteFooter.tsx` | ✅ Logo → `plum.svg`; divider → `#33063D`; AWS → `powered-by-aws.png` |
| 6 | `website/src/components/Footer.tsx` | ✅ Same as SiteFooter |
| 7 | `website/src/components/BrandPatterns.tsx` | ✅ `CoBranding` logo switches by theme prop (billboard/social stay white — render on plum) |
| 8 | `website/src/components/CookieBanner.tsx` | ✅ No change needed — CSS-class only, covered by globals |
| 9 | `website/src/app/page.tsx` + `HomePageClient` | ⏳ Pending |
| 10 | `website/src/app/about/page.tsx` | ⏳ Pending |
| 11 | `website/src/app/for-startups/page.tsx` | ⏳ Pending |
| 12 | `website/src/app/services/page.tsx` + `[slug]/page.tsx` | ⏳ Pending |
| 13 | `website/src/app/demos/comply`, `demos/costless` | ⏳ Pending |
| 14 | `website/src/app/privacy`, `terms`, `acceptable-use` | ⏳ Pending |
| 15 | `website/src/app/schedule-consultation/page.tsx` | ⏳ Pending |
| 16 | `website/src/app/brand-showcase/page.tsx` | ⏳ Pending |
| 17 | `portal/src/app/globals.css` | ⏳ Pending |
| 18 | `portal/src/app/layout.tsx` + `page.tsx` | ⏳ Pending |
| 19 | `portal/src/app/login`, `forgot-password`, `reset-password/[token]`, `invite/[token]` | ⏳ Pending |
| 20 | `portal/src/app/onboarding/page.tsx` (1,436 lines) | ⏳ Pending |
| 21 | `portal/src/app/billing/subscribe`, `billing/callback` | ⏳ Pending |

## Open flags / deviations
- Border `#E5E5E5` is off-palette (brand has no neutral mid-grey for hairlines — Grey `#F4F4F4` blends into white).
- Muted text = Plum @ 0.7 opacity. Brand guidance discourages opacity on brand colors, but hierarchy needs it. Alternative: Iris for secondary text — noted, not yet applied.

## Last completed
`website/src/components/BrandPatterns.tsx` + `CookieBanner.tsx` audit — all shared chrome done.

## Next up
Verification pass on the website (spin up preview, check nav/footer/home), then begin page-by-page conversion starting with `HomePageClient`.
