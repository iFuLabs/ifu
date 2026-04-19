# CLAUDE.md — iFu Labs page redesign

## Current task
Audit all pages and redesign those that don't match the iFu Labs site design system. Leave product dashboards untouched. Do not change copy, routes, or auth logic — only visual styling.

## Status
| Page | Status |
|---|---|
| website/src/app/page.tsx | ✅ DONE (already matches) |
| website/src/app/about/page.tsx | ✅ DONE (already matches) |
| website/src/app/services/page.tsx | ✅ DONE (already matches) |
| website/src/app/services/[slug]/page.tsx | ✅ DONE (already matches) |
| website/src/app/for-startups/page.tsx | ✅ DONE (already matches) |
| website/src/app/schedule-consultation/page.tsx | ✅ DONE (already matches) |
| website/src/app/demo/comply/page.tsx | ✅ DONE (already matches) |
| website/src/app/demo/costless/page.tsx | ✅ DONE (already matches) |
| website/src/app/privacy/page.tsx | ✅ DONE (already matches) |
| website/src/app/terms/page.tsx | ✅ DONE (already matches) |
| website/src/app/acceptable-use/page.tsx | ✅ DONE (already matches) |
| portal/src/app/login/page.tsx | ✅ DONE (already matches) |
| portal/src/app/onboarding/page.tsx | ✅ DONE (already matches) |
| portal/src/app/page.tsx | ✅ DONE (Choose Product page) |
| portal/src/app/subscribe/page.tsx | ✅ DONE |
| portal/src/app/invite/[token]/page.tsx | ✅ DONE |
| portal/src/app/billing/callback/page.tsx | ✅ DONE |
| portal/src/app/forgot-password/page.tsx | ✅ DONE |
| portal/src/app/reset-password/[token]/page.tsx | ✅ DONE |
| comply/src/app/** | 🚫 DO NOT TOUCH |
| finops/src/app/** | 🚫 DO NOT TOUCH |

## Last completed
All 6 portal redesigns (page, subscribe, invite, billing/callback, forgot-password, reset-password) — verified visually against login reference.

## Next up
None — all audited pages are now on the portal auth dark theme.

## Design tokens (extracted from portal/login + website/globals.css)

Portal auth / account pages:
- Background: `radial-gradient(ellipse at top, #15171D 0%, #0B0C0F 60%)`
- Card surface: `rgba(20, 22, 27, 0.8)` + `backdrop-filter: blur(8px)`
- Card border: `1px solid #25282F`
- Card radius: `16px`
- Card padding: `40px`
- Card shadow: `0 24px 48px rgba(0, 0, 0, 0.4)`
- Input bg: `#0F1115`
- Input border: `#25282F`
- Input focus border: `#E8820A` + `box-shadow: 0 0 0 3px rgba(232,130,10,0.15)`
- Input radius: `10px`
- Input padding: `14px 16px`
- Primary button: bg `#E8820A`, text `#0B0C0F`, hover `#FF9820`, radius `10px`, shadow `0 6px 16px rgba(232,130,10,0.25)`
- Secondary/ghost button: border `#25282F`, text `#C4C7CC`
- Logo mark: `linear-gradient(135deg, #E8820A 0%, #C96F08 100%)`, radius `14px`, shadow `0 8px 24px rgba(232,130,10,0.25)`
- Title color: `#F5F5F5`
- Body/label color: `#C4C7CC`, muted: `#9AA0A6`, subtle: `#6B7078`
- Divider line: `#25282F`, panel fill: `#14161B`
- Heading font: `'Fraunces', serif` (letter-spacing `-0.02em`)
- Body font: `'DM Sans', system-ui, sans-serif`
- Uppercase label: font-size `13px`, weight `500`, letter-spacing `0.02em`, color `#C4C7CC`

Error banner:
- bg `rgba(239, 68, 68, 0.08)`, border `rgba(239, 68, 68, 0.3)`, text `#FCA5A5`, radius `10px`

Website (for reference):
- `--bg` #07080D, `--surface` #0D0F18, `--ink` #EFF1F7, `--muted` #8590A6, `--accent` #E8820A, `--border` #1e1e1e
- Section bgs alternate #111111 / #0d0d0d
- Hero warm gradient: `linear-gradient(160deg, #0f0f0f 0%, #161410 60%, #1a1208 100%)`

## Notes
- portal/src/app/login/page.tsx is the reference implementation — mimic its structure (header with logo + title + subtitle, centered card, single column 440px max-width).
- Do not change copy, form fields, routes, or auth/API logic.
- For Choose-Product page: use card grid styled like website product cards but on portal-auth dark bg.
- Subscribe page needs Stripe form preservation — only change wrappers/colors.
- All portal pages already import fonts via layout, so Fraunces/DM Sans available.
