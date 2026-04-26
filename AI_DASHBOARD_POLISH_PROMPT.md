# AI Handoff — Comply / FinOps Dashboard Polish

> **Purpose:** make the Comply and FinOps dashboards feel like a production B2B SaaS, not a polished prototype. Brand colors are already in place; this work is about *restraint, hierarchy, and information design.*
>
> **Scope:** `comply/src/app/dashboard/**` and `finops/src/app/dashboard/**`. Do not touch `website/`, `portal/`, or backend `src/` unless a specific task below names a file there.
>
> **Branch:** `brand-identity`. Do not switch branches. Do not pull/merge other branches without asking.

---

## 0. Hard rules

1. **No new design system, no new component library.** Stay with whatever the existing dashboards use (inline styles + a small set of tokens — read 3-5 existing dashboard files before writing anything).
2. **Brand tokens are fixed.** Do not invent new colors. Allowed values:
   - Plum `#33063D` (ink/primary text, primary CTAs)
   - Iris `#8A63E6` (one role only — accents/active state)
   - Lavender `#DAC0FD` (subtle highlights/hover only)
   - Mint `#C8F6C0` (success accent)
   - White `#FFFFFF` (surfaces)
   - Neutral surface `#F8F7FA` (page background, card hover)
   - Border `rgba(51, 6, 61, 0.12)` (default), `rgba(51, 6, 61, 0.20)` (emphasis)
   - Muted text `rgba(51, 6, 61, 0.65)`
   - Status: red text `#B42318` on `#FEF3F2`; amber text `#B54708` on `#FFFAEB`; green text `#067647` on `#ECFDF3`.
3. **Reduce purple density.** Today everything is lavender-tinted. Default surfaces should be white on a near-white neutral, with Plum text. Iris is a *signal*, not a wallpaper.
4. **One uppercase eyebrow style only:** 11px, `letter-spacing: 0.08em`, weight 600, color = muted plum. Use it sparingly — section labels only, never inside cards.
5. **One spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48. Do not use any other gap, padding, or margin value.
6. **One radius scale:** 6 (chips), 12 (cards), 16 (large surfaces). Pick one per element type and stick with it.
7. **One type scale.** Existing scale in the dashboards is the source of truth — read first, then conform. Do not introduce new font sizes.
8. **No emojis in product UI.** Use icons (lucide-react is already installed; verify before importing).
9. **No layout pivots.** Sidebar + main column stays. Don't refactor routing or page structure.
10. **Verify visually.** This is dashboard work — every change must be checked in the browser preview. Do not report a task done from code alone. See "Verification" at the bottom.

---

## 1. Workflow per fix

For each task in section 3:

1. **Read existing files first.** Open the page you're touching plus 2 sibling pages to see the conventions in use.
2. **Plan with TodoWrite** — break the task into ≤5 sub-steps.
3. **Implement** — minimal diffs, no incidental refactors. If you find drift, leave a `// FIXME-polish:` note rather than fixing it now.
4. **Verify** — `npm run dev` in the relevant app, use the preview tools (`mcp__Claude_Preview__preview_*`) to load the page, snapshot, click through key interactions, and screenshot the final state.
5. **Commit message format:** `polish(comply|finops): <task id> — <short summary>`. Do not commit unless the user asks.
6. **Update this doc.** Move the task from "Open" to "Done" with a one-line file-pointer note.

Do **not** bundle multiple tasks into one commit unless they're literally one change (e.g., a token rename).

---

## 2. Tokens to introduce (one-time)

Before doing the per-task work, create or update **`comply/src/app/dashboard/_tokens.ts`** and **`finops/src/app/dashboard/_tokens.ts`** with the exact values from section 0 rule 2. If a tokens file already exists, **extend it, don't replace it** — and check what other files import from it before changing names.

Replace any inline hex literal in dashboard files with a token import. Do **not** rewrite files that don't already use inline hexes.

If both apps' tokens drift, that's fine for this pass — do not consolidate into a shared package.

---

## 3. Tasks (open)

### T1 — Integration-error banner (Critical)
**Why:** Three "Integration not found" rows in Recent Scans is an outage masquerading as log noise. Today the dashboard looks broken before the user reads it.

**Where:** `comply/src/app/dashboard/page.tsx` (Overview).

**Do:**
- Add a top-of-page banner that renders only when any integration has `status === 'error'` or `status === 'disconnected'`.
- Banner content: warning icon · "AWS integration is disconnected. Reconnect to resume scans." · "Reconnect" button → `/dashboard/integrations`.
- Style: amber text `#B54708` on `#FFFAEB` background, 1px border `#FEDF89`, radius 12, padding 12/16, full width, sits above the "Overview" h1.
- Dismissible per session (sessionStorage key `comply.banner.integrations-dismissed`); reappears on page reload after a real error.
- API source: existing `GET /api/v1/integrations` — do not add a new endpoint.

**Verify:** disconnect AWS in dev DB, reload dashboard, banner shows. Click Reconnect — routes correctly.

---

### T2 — Donut becomes a "next action" card (Critical)
**Why:** The 6% donut is a label. Users want to know what to do.

**Where:** `comply/src/app/dashboard/page.tsx` overall-score card.

**Do:**
- Keep the donut + percentage. Below the percentage replace the static "At Risk" pill with **two lines**:
  - Line 1 (sm muted): "6 controls failing"
  - Line 2 (button-styled link): "Fix top critical →" → `/dashboard/controls?status=fail&severity=critical`
- If failing count = 0, show "All controls passing" with a green check, no CTA.
- The whole card becomes `role="link"` keyboard-focusable; on Enter/click it routes to the failing-controls list.
- Drop the standalone "At Risk" red pill.

**Verify:** with seeded fail data, click the card → navigates with the right query string. Tab key reaches the card with a visible focus ring.

---

### T3 — Reduce purple density (Critical)
**Why:** Lavender on lavender on lavender flattens hierarchy. Vanta/Drata are ~80% neutral, ~20% accent — that's the target.

**Where:** all of `comply/src/app/dashboard/**` and `finops/src/app/dashboard/**`.

**Do:**
- Page background: `#F8F7FA` (neutral) — not lavender.
- Card surfaces: `#FFFFFF` with the default border token. No lavender card fills.
- Hover state on cards: background `#FAFAFB`, no color shift.
- Lavender (`#DAC0FD`) is allowed **only** as: (a) sidebar active-item background tint, (b) thin dividers, (c) progress-bar track. Nothing else.
- Iris (`#8A63E6`) is allowed **only** as: (a) primary CTA fill, (b) progress-bar fill, (c) active link, (d) the donut stroke. Nothing else.
- Headings and body copy: Plum `#33063D`. Muted: `rgba(51, 6, 61, 0.65)`.

**Verify:** screenshot side-by-side before/after. The "after" should read mostly white/neutral with purple accents, not a purple page.

---

### T4 — Status pills get an icon (color + shape, not color alone) (Moderate)
**Why:** Color-only signaling fails for color-blind users and on tinted monitors.

**Where:** every status pill in both dashboards (Pass/Fail/Review/Failed/Connected/Error).

**Do:**
- Pass / Connected: lucide `CheckCircle2`, green text on green tint.
- Fail / Error / Critical: lucide `AlertCircle`, red text on red tint.
- Review / Pending: lucide `Clock`, amber text on amber tint.
- Snoozed: lucide `MoonStar`, muted plum on neutral.
- Pill height: 24, padding-x: 8, gap-x: 6, icon: 14, radius: 6, weight: 500. No uppercase.

**Verify:** every list page (Controls, Vendors, Scans, Recommendations) shows the new pills. Run a Lighthouse a11y check on Controls page — no color-contrast warnings on pills.

---

### T5 — Unify card padding and remove "two systems" feel (Moderate)
**Why:** Donut card has ~3× the vertical padding of metric tiles. Looks like the page was assembled from two different design systems.

**Where:** `comply/src/app/dashboard/page.tsx`, `finops/src/app/dashboard/page.tsx`.

**Do:**
- All overview cards (donut, framework, metric tile, list card) get the same outer padding: 24.
- Inner spacing rhythm: 16 between major blocks, 8 between label and value.
- Card headers: eyebrow label (uppercase per section 0 rule 4), then either a number (large) or a list. Never both styles in the same card.

**Verify:** measure two adjacent cards in browser devtools — same `padding-top` on each.

---

### T6 — One "hero number" rule (Moderate)
**Why:** "6%" is huge, "48", "3", "6", "1" are also large — the eye doesn't know what's important.

**Where:** Overview dashboards, both apps.

**Do:**
- Hero number (donut percentage / monthly cost / total savings): 48px, weight 600, Plum.
- Metric-tile numbers (Passing / Failing / Total Controls / waste counts etc.): 24px, weight 600, Plum.
- Sub-labels and pending counts: 13px, muted.
- Framework progress percentage (e.g., "12%"): 16px, weight 600, **right-aligned**, sits at the end of the bar's row — not as a separate hero.

**Verify:** on overview, only one number per page is at 48px. The eye lands there first.

---

### T7 — Reconcile "48 Total Controls" with framework totals (Moderate)
**Why:** SOC 2 (25) + ISO (30) + GDPR (20) + HIPAA (15) = 90, but page shows 48 Total. The math is silently wrong.

**Where:** `comply/src/app/dashboard/page.tsx` plus the API the metric tiles read from.

**Do:**
- Either: show "48 automated · 90 total" on the Total Controls tile (preferred — explains the gap).
- Or: filter the framework cards to those the org has actually subscribed/seeded so the totals reconcile.
- Decide based on what the existing API returns. If it returns subscribed frameworks only, this is a data-not-design issue — flag in the doc and stop.

**Verify:** the four metric tiles' counts add up to the sum of the failing/passing/review breakdowns.

---

### T8 — One uppercase eyebrow style (Minor)
**Why:** "OVERVIEW SCORE" / "SOC 2" / "Passing" / "Failing Controls" use uppercase tracking at different sizes — feels like four different label systems.

**Where:** all dashboard pages, both apps.

**Do:**
- Single eyebrow style: 11px, weight 600, `letter-spacing: 0.08em`, color `rgba(51, 6, 61, 0.65)`, no underline.
- Use **only** as a section label above a number or a list. Never inside a card title. Never on framework names ("SOC 2") — those are titles, not eyebrows.
- Card titles ("Failing Controls", "Recent Scans") are sentence-case, 16px, weight 600, Plum.

**Verify:** grep for `textTransform: 'uppercase'` and `letter-spacing` — every match conforms or is intentionally not an eyebrow (e.g., in a tag).

---

### T9 — Sidebar selection state (Minor)
**Why:** Selected vs hover is too subtle.

**Where:** `comply/src/app/dashboard/layout.tsx`, `finops/src/app/dashboard/layout.tsx`.

**Do:**
- Selected item: lavender background `#DAC0FD`, Plum text, weight 600, plus a 3px Iris bar on the left edge (or a leading dot — pick one and apply to both apps).
- Hover (non-selected): background `#F4F0FB`, no font-weight change.
- Default: transparent background, muted-plum text.
- Icon color matches text color in all three states.

**Verify:** keyboard-tab through the sidebar; focus ring visible on each item; selected item is unambiguously distinct from hover.

---

### T10 — Recent Scans deserves a real empty/error state (Minor)
**Why:** Three identical failure rows is what surfaces today. After T1 the banner handles the disconnection; the list itself should show "No recent scans" or filter out the disconnected-source noise.

**Where:** `comply/src/app/dashboard/page.tsx` Recent Scans section.

**Do:**
- If all recent scans for an integration failed because the integration is errored, collapse them into one row: "AWS scans paused — integration disconnected".
- If list is empty after filtering: empty-state with icon, "No scans yet", and a "Run scan" link.
- Otherwise: leave as-is but apply the unified pill style from T4.

**Verify:** seed three failed scans → see one collapsed row. Delete them → see empty state. Run a scan → see normal list.

---

### T11 — "Last updated <relative>" affordance (Minor)
**Why:** Tiny muted text under "Overview" — hard to read, not actionable.

**Where:** Overview header in both apps.

**Do:**
- 13px muted Plum, paired with a refresh icon (lucide `RefreshCw`) clickable to re-run the data fetch.
- On click: spinner state, button disabled, then the timestamp updates.
- Title block: H1 ("Overview") on top, "Last updated 2 minutes ago · Refresh" below — single line.

**Verify:** click Refresh → network panel shows the relevant `GET` requests fire → timestamp updates.

---

### T12 — Add absolute counts to framework cards (Minor)
**Why:** "12%" alone hides scale; "12% · 3 of 25" tells the user where they are.

**Where:** `comply/src/app/dashboard/page.tsx` framework cards (SOC 2 / ISO / GDPR / HIPAA / PCI DSS).

**Do:**
- Below the progress bar, second line: `↑ 3 ↓ 6 · 15 pending · 3 of 25 passing`.
- Same row, end-aligned: small "View →" link to `/dashboard/controls?framework=soc2`.
- Drop the existing "↑ 3 ↓ 6 15 pending" line if those counts are duplicated.

**Verify:** click "View" → controls list filtered to SOC 2.

---

## 4. Verification (mandatory)

Backend changes don't apply here — every task in section 3 changes the rendered UI.

For each task:
1. Start dev server: `cd comply && npm run dev` (and/or `cd finops && npm run dev`).
2. Use the preview tools to open the affected page.
3. `preview_snapshot` before/after for visible diff.
4. `preview_console_logs` — no new errors introduced.
5. `preview_resize` to 1280 and 1440 — both should look balanced.
6. `preview_screenshot` of the final state — share with the user when reporting completion.

If a task can't be visually verified (e.g., depends on real customer data), say so explicitly in the report. Do not claim success.

---

## 5. Order of operations (recommended)

Do **T2** before T3 — the donut redesign is easier when the page isn't lavender-soup.
Do **T3** before T4/T5/T8 — once the canvas is neutral, the smaller fixes settle in cleanly.
Do **T1** any time — it's self-contained.
Save **T7** for last unless the data audit is quick — it might surface a backend issue that's out of scope here.

Approximate effort: T1 (1h), T2 (1h), T3 (3h — touches many files), T4 (1.5h), T5 (1h), T6 (1h), T7 (1h + investigation), T8 (45m), T9 (45m), T10 (1h), T11 (45m), T12 (45m).

---

## 6. When to stop and ask

- A task requires backend schema or API changes that aren't already shipped.
- The "right" answer would mean removing/relocating an existing feature.
- Two adjacent tasks conflict (e.g., T9 wants a leading bar, T8's eyebrow style happens to use the same space).
- You'd need to introduce a new dependency (animation lib, chart lib, etc.).

Stop silently when all 12 tasks are in section 7 ("Done").

---

## 7. Done

*(empty — fill in as tasks complete: `T1 — banner — comply/src/app/dashboard/page.tsx — verified 2026-04-26`)*

---

## 8. Non-goals (explicitly out of scope)

- New pages, new sections, new API endpoints.
- Mobile redesign (do-no-harm only — don't break it, don't optimize it now).
- Dark mode toggle.
- Animations and motion polish.
- i18n / RTL.
- Touching `portal/` or `website/`.
- Anything in the AI handoff documents (`AI_HANDOFF_PROMPT.md`, `CLAUDE.md` "Pending suggestions") — those are product features, not polish.
