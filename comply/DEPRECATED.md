# ⚠️ DEPRECATED — iFu Comply

This app has been superseded by **Ghara** (`ghara/`), the unified compliance + cost product.

- All compliance features are now at `ghara/src/app/(app)/compliance/`
- The unified dashboard is at `ghara/src/app/(app)/dashboard/`
- Backend routes remain at `src/routes/*` (shared with Ghara)

**Do not add new features here.** All new work goes into `ghara/`.

This directory will be deleted 60 days after Ghara is confirmed stable in production.

---

Redirect mapping:
- `/dashboard` → Ghara `/dashboard`
- `/dashboard/controls` → Ghara `/compliance`
- `/dashboard/integrations` → Ghara `/integrations`
- `/dashboard/evidence` → Ghara `/compliance`
- `/dashboard/vendors` → Ghara `/compliance`
- `/dashboard/team` → Ghara `/team`
- `/dashboard/billing` → Ghara `/billing`
