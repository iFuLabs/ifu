# iFu Labs

AWS cloud consultancy and SaaS products for engineering teams.

> **Website:** ifu-labs.io · **App:** app.ifu-labs.io · **Contact:** hello@ifu-labs.io

---

## Repo Structure

```
ifu-labs/
│
├── website/                  ← ifu-labs.io (marketing site)
│   ├── src/app/
│   │   ├── page.tsx          ← Homepage
│   │   ├── layout.tsx        ← Metadata
│   │   └── globals.css       ← Site styles
│   └── package.json
│
├── frontend/                 ← app.ifu-labs.io (SaaS dashboard)
│   └── src/app/
│       ├── onboarding/       ← New user setup wizard
│       ├── auth/callback/    ← Post-Auth0 redirect
│       └── dashboard/
│           ├── page.tsx      ← Overview + AI insights
│           ├── controls/     ← Compliance controls
│           ├── integrations/ ← AWS + GitHub connectors
│           ├── evidence/     ← Evidence library + PDF
│           ├── vendors/      ← Vendor risk tracker
│           └── finops/       ← Cost optimisation
│
├── src/                      ← api.ifu-labs.io (Fastify API)
│   ├── routes/               ← auth, controls, integrations,
│   │                            evidence, vendors, ai, finops
│   ├── connectors/
│   │   ├── aws/checks/       ← 20 SOC 2 control checks
│   │   ├── github/           ← 6 GitHub controls
│   │   └── finops/           ← Cost Explorer + waste detection
│   ├── jobs/                 ← BullMQ workers + daily scheduler
│   └── services/             ← AI, PDF, encryption, audit
│
├── package.json
├── .env.example
└── README.md
```

---

## How the Three Parts Connect

```
ifu-labs.io (website)
    │ "Start free trial" button
    ▼
app.ifu-labs.io/onboarding (frontend)
    │ creates org, connects AWS/GitHub
    ▼
app.ifu-labs.io/dashboard (frontend)
    │ fetches all data from
    ▼
api.ifu-labs.io (src)
    │ reads from customer's
    ▼
AWS account (read-only IAM role)
GitHub org  (GitHub App installation)
```

---

## Running Locally

**Backend API** (port 3000)
```bash
npm install && cp .env.example .env
node src/db/seed.js
npm run dev
```

**Frontend Dashboard** (port 3001)
```bash
cd frontend && npm install && cp .env.example .env && npm run dev
```

**Marketing Website** (port 3002)
```bash
cd website && npm install && npm run dev
```

---

## Products Built

| Product | Price |
|---------|-------|
| Comply — SOC 2 / ISO 27001 / GDPR automation | $299–$799/mo |
| FinOps — Cost optimisation & waste detection | $199/mo |

## Still to Build
- Stripe billing
- Email notifications
- Deployment (Docker + ECS)
- Docs site
