# Claude Code Prompt — Update iFU Labs Consultancy Website for Ghara Launch

> Paste this into Claude Code at the iFU Labs repo root. Read `CLAUDE.md` first. This is a scoped, narrow update — only touch the `website/` directory. Do NOT touch `ghara/`, `ghara-marketing/`, `src/`, or any backend code.

---

## Context

The iFU Labs consultancy website at `ifulabs.com` (built from `website/`) is still positioned around the old product structure where Comply and FinOps were separate offerings. Now that **Ghara by iFU Labs** has launched as the unified product (live at `ghara.ifulabs.com` and `app.ghara.ifulabs.com`), the consultancy site needs updating.

**The new positioning:** iFU Labs is an AWS engineering consultancy that helps startups with cost, compliance, migration, containers, and DevOps. Ghara is the product iFU Labs built — featured on the site, but secondary to the consulting story. Customers who want a tool buy Ghara; customers who want hands-on engineering help hire iFU Labs.

The consultancy keeps its existing voice (advisory, expert, relationship-driven). Ghara has its own voice and brand on its own site — don't duplicate that here. Just refer to it.

---

## Operating rules

1. **Branch:** Create a new branch `git checkout -b ifulabs-website-ghara-update` before any changes.
2. **Scope:** Only files under `website/`. Nothing else.
3. **Don't redesign.** Keep the existing layout, brand colors (plum/lavender per `brand.md`), typography, and component structure. This is a copy + linking update, not a rebuild.
4. **Preserve all SEO metadata structure** — update copy, but don't strip canonical tags, OG tags, etc.
5. **Run `npm run build` in `website/` after every meaningful change** to catch broken imports.
6. **Show diffs at the end** — the human will review before merge.
7. **Don't delete the old demo pages outright.** Replace them with redirects (see below) so anyone with the old URL bookmarked doesn't 404.

---

## Phase 0 — Discovery (read-only)

Before changing anything, produce a short report covering:

1. List every file under `website/` that mentions `comply`, `costless`, `finops`, `Comply`, `FinOps`, or `Costless` (case-sensitive search).
2. The current homepage hero copy and how it positions iFU Labs.
3. The current navigation structure in `website/src/components/SiteNav.tsx`.
4. The current sitemap entries in `website/src/app/sitemap.ts`.
5. The structure of `website/src/lib/services.ts` and which services reference the old products.
6. What's on `/demo/comply` and `/demo/costless` today.

Output the report. **Wait for approval before continuing.**

--- PHASE GATE 0 ---

## Phase 1 — Add a Ghara product callout to the homepage

The homepage stays primarily a consultancy pitch. We're adding a clear "Our product: Ghara" section so visitors know about the product without the consultancy story being buried.

1. **Add a `GHARA_URL` constant** at the top of `website/src/app/HomePageClient.tsx`:
   ```ts
   const GHARA_URL = process.env.NEXT_PUBLIC_GHARA_URL || 'https://ghara.ifulabs.com'
   ```
   And update `.env.example` (and any prod env config) accordingly.

2. **Add a new section to the homepage** between the existing services section and the footer. Section structure:
   - Eyebrow tag: "Our product"
   - H2: "We built **Ghara** so you don't need us forever."
   - Paragraph: *"Most of our consulting clients eventually want a tool that watches their AWS continuously — without the consulting bill. So we built one. Ghara is the cloud operations dashboard for compliance and cost, available as a self-serve product. Same engineering rigor, productized."*
   - Two-column feature row showing: "Compliance that auto-renews — SOC 2, ISO, GDPR, HIPAA, PCI" / "Cost waste, found and ranked — AWS + Kubernetes via OpenCost"
   - Two CTAs: primary "Try Ghara free for 7 days →" linking to `${GHARA_URL}/signup`, secondary ghost "Learn more about Ghara →" linking to `${GHARA_URL}`
   - Subline: *"Already a customer of our consultancy? You can keep your existing pricing — we grandfathered every existing Comply and FinOps subscription into Ghara."*
   - Use existing brand styling (plum/lavender, MintCard or BrandPattern components if appropriate).

3. **Update the hero card stack** (lines 76–80 area) — the third item currently says "+ SaaS tool" alongside SOC 2 Compliance, implying the old Comply product. Change that card to reference Ghara explicitly:
   ```
   { title: 'Compliance, automated', desc: 'Ghara watches your AWS for SOC 2 drift', badge: 'Product' }
   ```

4. **Update homepage metadata** in `website/src/app/page.tsx`:
   - Title stays consultancy-focused but add Ghara mention: *"Expert AWS engineering for startups — and Ghara, our cloud ops platform"*
   - Description add a closing line: *"And when you outgrow consulting, switch to Ghara, our self-serve cloud ops platform."*

**Acceptance:**
- Homepage builds (`npm run build` in `website/`)
- Ghara section renders correctly with both CTAs working
- Hero stack no longer says "+ SaaS tool"
- No layout regressions

--- PHASE GATE 1 ---

## Phase 2 — Replace the two demo pages with Ghara redirects

The pages `/demo/comply` and `/demo/costless` are now stale. Anyone landing there should be redirected to the Ghara product or marketing site.

1. **`website/src/app/demo/comply/page.tsx`**:
   Replace contents with a server-side redirect to `${GHARA_URL}/compliance` (the Ghara marketing site's compliance page):
   ```ts
   import { redirect } from 'next/navigation'
   export default function Page() {
     redirect(process.env.NEXT_PUBLIC_GHARA_URL || 'https://ghara.ifulabs.com/compliance')
   }
   ```
   Delete `ComplyDemoPageClient.tsx` — it's no longer reachable.

2. **`website/src/app/demo/costless/page.tsx`**:
   Same pattern, redirecting to `${GHARA_URL}/cost`. Delete `CostlessDemoPageClient.tsx`.

3. **`next.config.ts` permanent redirects** (preferred over Next.js `redirect()` for SEO):
   Add to the `redirects()` config:
   ```ts
   { source: '/demo/comply', destination: 'https://ghara.ifulabs.com/compliance', permanent: true },
   { source: '/demo/costless', destination: 'https://ghara.ifulabs.com/cost', permanent: true },
   ```
   If `next.config.ts` doesn't have a `redirects` function yet, add one. The `redirect()` calls in the page files become a fallback in case the config isn't picked up.

**Acceptance:**
- Visiting `/demo/comply` 301s to `https://ghara.ifulabs.com/compliance`
- Visiting `/demo/costless` 301s to `https://ghara.ifulabs.com/cost`
- The old client components are deleted (not just unreferenced)

--- PHASE GATE 2 ---

## Phase 3 — Update services, for-startups, and lib/services.ts

The services pages and the for-startups page reference Comply and FinOps as service offerings. These should mention Ghara as the productized version where relevant, but the consulting service offerings themselves stay (clients still pay for engineering help).

1. **`website/src/lib/services.ts`** — review every service entry:
   - If a service is named after a product (e.g., "FinOps" or "Comply") rename to the underlying capability ("Cost optimisation", "SOC 2 compliance").
   - Where service descriptions mention Comply or FinOps as a tool, replace with Ghara: *"...delivered alongside Ghara, our compliance + cost platform"* or *"...we use our own product, Ghara, to monitor your account continuously after the engagement."*
   - Don't change service IDs/slugs (keep the URLs stable for SEO). Just update display names and descriptions.

2. **`website/src/app/services/page.tsx` and `[slug]/page.tsx`** — copy updates only:
   - Hero copy stays advisory-focused
   - Each service detail page that previously mentioned Comply/FinOps as a deliverable now mentions Ghara: *"Engagement deliverables include a Ghara workspace pre-configured for your account, so you keep visibility after we leave."*
   - Add a sidebar / footer card on each service detail page: *"Want to skip the consulting? Try Ghara →"* linking to `${GHARA_URL}`.

3. **`website/src/app/for-startups/ForStartupsPageClient.tsx`** — substantial rewrite needed:
   - Replace any "Comply" / "FinOps" mentions with Ghara
   - Add a "two paths" section: *"Hire us. Or use our product."* — explaining that startups can either engage iFU Labs for hands-on work, or self-serve with Ghara, or both.
   - Don't delete the page or strip the consulting content — just integrate Ghara as the productized alternative.

4. **`website/src/app/for-startups/page-minimal.tsx`** — same pattern, lighter touch since it's the minimal version.

**Acceptance:**
- No remaining references to "Comply" or "FinOps" or "Costless" as customer-facing product names anywhere in `website/src/app/services/` or `website/src/app/for-startups/`
- Service slugs are unchanged (no broken inbound links)
- Each services page has a clear "Or use Ghara" CTA

--- PHASE GATE 3 ---

## Phase 4 — Update SiteNav + Footer

1. **`website/src/components/SiteNav.tsx`**:
   - Add a top-level nav item: **"Product"** linking to `https://ghara.ifulabs.com` (external — opens in new tab with `rel="noopener noreferrer"`).
   - Order suggestion: Home / About / Services / **Product** / For Startups / Contact (or however the existing nav is laid out — just add Product).
   - Mobile drawer: same addition.
   - Remove any references to `/demo/comply` or `/demo/costless` if present.

2. **`website/src/components/Footer.tsx`** (and `SiteFooter.tsx` if both exist):
   - Add a "Product" column with links: "Ghara homepage", "Ghara pricing", "Try free for 7 days" — all linking to the appropriate Ghara URLs.
   - Keep the existing footer columns (Services, Company, Legal).

**Acceptance:**
- "Product" link visible in main nav and footer
- Clicking it opens `ghara.ifulabs.com` in a new tab
- No broken links, no stale demo links

--- PHASE GATE 4 ---

## Phase 5 — Update sitemap, legal pages, and metadata

1. **`website/src/app/sitemap.ts`**:
   - Remove `/demo/comply` and `/demo/costless` entries (they redirect now, shouldn't be indexed).
   - Add nothing for Ghara — Ghara has its own sitemap on its own domain.

2. **`website/src/app/robots.ts`** (if it exists):
   - No changes needed unless it explicitly disallows the demo paths.

3. **Legal pages** — `privacy/PrivacyPageClient.tsx`, `terms/TermsPageClient.tsx`, `acceptable-use/AcceptableUsePageClient.tsx`:
   - Find references to "Comply" and "FinOps" as service/product names.
   - Decide per-occurrence:
     - If the legal text covers the consultancy services → leave as "iFU Labs Services" (generic).
     - If the legal text covers the product → replace with "Ghara" and add a note: *"Ghara has its own Terms of Service available at https://ghara.ifulabs.com/terms"* (assuming Ghara has its own legal pages — if not, this can wait).
   - **Important:** legal language is sensitive. Don't paraphrase entire clauses. Only replace product names. If a clause's meaning would change, leave it and surface it in the final report for human review.

4. **`website/src/app/about/AboutPageClient.tsx`**:
   - Add a paragraph mentioning Ghara as a product the team built: *"In 2026 we launched Ghara, the productized version of our compliance and cost work — making the same insights available to teams that don't need full consulting engagements."*

**Acceptance:**
- Sitemap is clean, no stale demo URLs
- No `Comply`/`FinOps`/`Costless` references remain in customer-facing copy on the consultancy site
- Legal pages reviewed; any ambiguous changes flagged for human review

--- PHASE GATE 5 ---

## Phase 6 — Final pass and report

1. **Search for stragglers:**
   ```
   grep -rn -i "comply\|costless\|finops" website/src
   ```
   Any remaining hits should be either (a) intentional historical references in legal/about pages, or (b) variable names in code that aren't customer-facing. Report all hits with explanations.

2. **Build the site:** `npm run build` in `website/`. Must succeed with zero errors.

3. **Run a link check** if a tool is available, or list all internal `<Link>` and `<a>` hrefs and confirm none of them are broken (no 404s for moved pages).

4. **Update CLAUDE.md** under a new section "iFU Labs website update (May 2026)":
   - One paragraph noting the homepage now features Ghara, demo pages redirect, services updated, nav has Product link.
   - List of remaining `Comply`/`FinOps` references with reasons.

5. **Commit and push the branch.** Open a PR titled "Update iFU Labs site for Ghara launch" with a short summary linking to each phase's changes.

--- PHASE GATE 6 ---

---

## Out of scope for this prompt

- No changes to `ghara/` or `ghara-marketing/`
- No changes to `src/` (backend)
- No new pages on the iFU Labs site
- No design/visual rebuild
- No new components beyond the Ghara callout section on the homepage
- No new languages / i18n
- No analytics changes
- No A/B testing setup

If you discover any of these are blocking, STOP and surface it.

---

## Final note

The goal: a visitor lands on `ifulabs.com`, immediately understands "this is an AWS consultancy that built a product called Ghara," and can choose either path (hire us, or use Ghara). Don't let either story drown out the other. Consultancy is the front door, Ghara is the prominently-featured product underneath.

Begin with Phase 0.
