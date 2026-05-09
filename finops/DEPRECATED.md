# ⚠️ DEPRECATED — iFu Costless (FinOps)

This app has been superseded by **Ghara** (`ghara/`), the unified compliance + cost product.

- All cost features are now at `ghara/src/app/(app)/cost/`
- The unified dashboard is at `ghara/src/app/(app)/dashboard/`
- Backend routes remain at `src/routes/finops.js` (shared with Ghara)

**Do not add new features here.** All new work goes into `ghara/`.

This directory will be deleted 60 days after Ghara is confirmed stable in production.

---

Redirect mapping:
- `/dashboard` → Ghara `/dashboard`
- `/dashboard/allocation` → Ghara `/cost`
- `/dashboard/integrations` → Ghara `/integrations`
- `/dashboard/team` → Ghara `/team`
- `/dashboard/billing` → Ghara `/billing`
