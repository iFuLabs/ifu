# iFU Labs — Brand Reference

Source: Brand Identity Book v1.0 (Bernard Sakyi A., Transvo Digital). This file mirrors the PDF so future sessions do not need to re-read it. If this conflicts with the PDF, the PDF wins.

## Color palette

| Token     | Hex       | Role                                              |
|-----------|-----------|---------------------------------------------------|
| Plum      | `#33063D` | Primary brand color; primary text on light bg     |
| Lavender  | `#DAC0FD` | Light accent surface, pill buttons, tinted cards  |
| Iris      | `#8A63E6` | Action / CTA accent                               |
| White     | `#FFFFFF` | Default page background                           |
| Grey      | `#F4F4F4` | Alt neutral surface                               |
| Mint      | `#C8F6C0` | Secondary accent surface                          |

The brand overview copy references "accent orange"; the defined palette has no orange. The palette on page 17 is the source of truth. Iris (`#8A63E6`) plays the "action" role.

## Gradients

| Name              | From → To              | Use                      |
|-------------------|------------------------|--------------------------|
| Plum to Lavender  | `#33063D → #8A63E6`    | Primary, heavy surfaces  |
| Iris to Lavender  | `#DAC0FD → #8A63E6`    | Primary, lighter surfaces|
| Grey to White     | `#F4F4F4 → #FFFFFF`    | Secondary neutral        |
| Mint to White     | `#C8F6C0 → #FFFFFF`    | Secondary neutral        |

## Light-mode role mapping (applied across website + portal auth)

- Page bg → White `#FFFFFF`
- Alt section bg → Grey `#F4F4F4` or Lavender `#DAC0FD`
- Card bg on white → White with Grey border, or Lavender tint
- Primary text → Plum `#33063D`
- Muted text → Plum at Aeonik Regular weight on Grey bg (don't drop opacity)
- Border / divider → Grey `#F4F4F4` (thin Plum for emphasis)
- Primary button → Plum bg + White text
- Secondary button → Lavender bg + Plum text (pill shape per brand-in-action)
- Accent / link → Iris `#8A63E6`
- Input bg → White; border Grey; focus border Iris; text Plum; placeholder Plum @ reduced weight
- Nav bg → White; text Plum; logo Plum variant
- Footer bg → Plum (dark surface retained as accent section) OR White; logo variant matches

## Typography

- **Aeonik** (primary, geometric sans) — Regular (body), Medium (subheads/UI), Bold (headlines), Fono (monospace — code, pricing, tags)
- **PP Fragment** (display serif) — Regular & ExtraBold. Only at ≥32pt, display moments. Never in UI/body/docs.
- **Arial** — email/technical fallback only. Not for designed materials.

Rules:
- Never set body in bold
- Never ALL CAPS paragraphs
- Never justify-align
- Never underline body text
- Never mix typefaces within a block
- Never apply gradients/patterns/textures to type

## Logo

- Logomark: 3×3 grid — 8 rounded squares + center circle. Corner radius scales with element.
- Three approved combinations only:
  1. Plum mark + Plum wordmark → on **light / white** backgrounds
  2. White mark + White wordmark → on **dark / plum / photo** backgrounds
  3. Lavender mark + White wordmark → on **dark / plum** backgrounds (accent)
- Never mix versions (no Lavender mark + Plum wordmark, etc.)
- Min full-logo width: 120px (1 inch print)
- Min logomark-only: 16px
- Clear space = width of one grid square on all sides
- Never: stretch, rotate, shadow, stroke, recolor outside palette, apply gradient/texture, recreate in other typefaces

## Logo usage per context

| Context                                | Variant                                   |
|----------------------------------------|-------------------------------------------|
| Website nav (white bg)                 | Plum mark + Plum wordmark                 |
| Website footer (if Plum bg retained)   | White mark + White wordmark               |
| Portal auth pages (white bg)           | Plum mark + Plum wordmark                 |
| Photography / dark imagery             | White mark + White wordmark               |
| Lavender / Mint accent block           | Plum mark + Plum wordmark                 |

## Photography

- Principles: Real, Confident, Precise. No stock-photo optimism.
- Overlays: 2pt stroke (digital); never across eyes/faces/hands. Opacity tuned per image.

## Contrast

All color pairings must meet WCAG 2.1 AA (4.5:1 for body text). Verified safe pairings on light bg: Plum on White ✅, Plum on Lavender ✅, Plum on Grey ✅, Plum on Mint ✅, White on Plum ✅, White on Iris ✅.

Unsafe: Iris text on White (≈3.9:1 — only use for large display text or as accent surface, not body).

## What NOT to touch

- `comply/` dashboard interiors
- `finops/` dashboard interiors
- Any portal dashboard interior (post-auth product UI)
