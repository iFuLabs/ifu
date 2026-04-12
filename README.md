# iFu Labs

AWS cloud consultancy and SaaS products for engineering teams.

> **Website:** ifu-labs.io · **App:** app.ifu-labs.io · **Contact:** hello@ifu-labs.io

---

## Repo Structure

```
ifu-labs/
│
├── website/                  ← ifu-labs.io (marketing site, port 3004)
│   ├── src/app/
│   │   ├── page.tsx          ← Homepage
│   │   ├── layout.tsx        ← Metadata
│   │   └── globals.css       ← Site styles
│   └── package.json
│
├── portal/                   ← app.ifu-labs.io (product selector, port 3003)
│   └── src/app/
│       └── page.tsx          ← Choose Comply or FinOps
│
├── comply/                   ← comply.ifu-labs.io (Comply SaaS, port 3001)
│   └── src/app/
│       ├── onboarding/       ← New user setup wizard
│       ├── auth/callback/    ← Post-Auth0 redirect
│       └── dashboard/
│           ├── page.tsx      ← Overview + AI insights
│           ├── controls/     ← Compliance controls
│           ├── integrations/ ← AWS + GitHub connectors
│           ├── evidence/     ← Evidence library + PDF
│           └── vendors/      ← Vendor risk tracker
│
├── finops/                   ← finops.ifu-labs.io (FinOps SaaS, port 3002)
│   └── src/app/
│       └── dashboard/
│           └── page.tsx      ← Cost analysis dashboard
│
├── src/                      ← api.ifu-labs.io (Fastify API, port 3000)
│   ├── routes/               ← auth, controls, integrations,
│   │                            evidence, vendors, ai, finops
│   ├── connectors/
│   │   ├── aws/checks/       ← 20 SOC 2 control checks
│   │   ├── github/           ← 6 GitHub controls
│   │   └── finops/           ← Cost Explorer + waste detection
│   ├── jobs/                 ← BullMQ workers + daily scheduler
│   └── services/             ← AI, PDF, encryption, audit
│
├── tests/                    ← Jest test suite
├── package.json
├── .env.example
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for PostgreSQL & Redis)

### 1. Clone & Install
```bash
git clone https://github.com/iFuLabs/ifu.git
cd ifu-labs

# Install root dependencies
npm install

# Install frontend dependencies
cd portal && npm install && cd ..
cd comply && npm install --legacy-peer-deps && cd ..
cd finops && npm install --legacy-peer-deps && cd ..
cd website && npm install && cd ..
```

### 2. Start Local Services
```bash
./scripts/test-local.sh
```

This will:
- Start PostgreSQL and Redis in Docker
- Run database migrations
- Seed the database with test data

### 3. Start All Applications
```bash
# Option 1: Start everything at once
./scripts/start-all.sh

# Option 2: Start individually
npm run dev              # API (port 3000)
cd portal && npm run dev # Portal (port 3003)
cd comply && npm run dev # Comply (port 3001)
cd finops && npm run dev # FinOps (port 3002)
cd website && npm run dev # Website (port 3004)
```

### 4. Access the Applications
- Portal: http://localhost:3003 (choose your product)
- Comply: http://localhost:3001 (compliance dashboard)
- FinOps: http://localhost:3002 (cost optimization)
- Website: http://localhost:3004 (marketing site)
- API Docs: http://localhost:3000/docs

### 5. Stop All Services
```bash
./scripts/stop-all.sh
```

---

## Running Tests

```bash
npm test
```

Test coverage:
- ✅ Encryption service (AES-256-GCM)
- ✅ Auth middleware (JWT validation, role checks)
- ✅ AWS connector structure
- ✅ AI service structure

---

## Frontend Development

Each product runs as a separate Next.js application:

**Portal** (port 3003) - Product selector
```bash
cd portal
npm install
npm run dev
```

**Comply Dashboard** (port 3001) - Compliance automation
```bash
cd comply
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

**FinOps Dashboard** (port 3002) - Cost optimization
```bash
cd finops
npm install --legacy-peer-deps
npm run dev
```

**Marketing Website** (port 3004)
```bash
cd website
npm install
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

**Required for local development:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ENCRYPTION_KEY` - 64-character hex string for credential encryption

**Required for production:**
- `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` - Auth0 configuration
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `BEDROCK_REGION` - AWS Bedrock region for AI features
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` - GitHub App credentials

---

## Products

| Product | Price |
|---------|-------|
| Comply — SOC 2 / ISO 27001 / GDPR automation | $299–$799/mo |
| FinOps — Cost optimisation & waste detection | $199/mo |

---

## Architecture

```
ifu-labs.io (website, port 3004)
    │ "Start free trial" button
    ▼
app.ifu-labs.io (portal, port 3003)
    │ Choose product: Comply or FinOps
    ├─▶ comply.ifu-labs.io (port 3001)
    │       │ Compliance automation dashboard
    │       └─▶ api.ifu-labs.io/api/v1/controls
    │
    └─▶ finops.ifu-labs.io (port 3002)
            │ Cost optimization dashboard
            └─▶ api.ifu-labs.io/api/v1/finops
                    │
                    ▼
            AWS account (read-only IAM role)
            GitHub org  (GitHub App installation)
```

**Product Separation:**
- Comply and FinOps are separate products with independent subscriptions
- Each has its own subdomain and dedicated dashboard
- Portal acts as the entry point for customers to access their products
- Shared backend API serves both products

---

## Tech Stack

**Backend:**
- Fastify - Fast web framework
- Drizzle ORM - Type-safe SQL
- PostgreSQL - Primary database
- Redis - Caching & job queue
- BullMQ - Background job processing
- AWS SDK - Cloud resource scanning
- Amazon Bedrock - AI-powered insights

**Frontend:**
- Next.js 14 - React framework
- Tailwind CSS - Styling
- SWR - Data fetching
- Recharts - Data visualization
- Auth0 - Authentication

---

## Development Commands

```bash
# Backend API
npm run dev          # Start dev server with hot reload
npm test             # Run test suite
npm run migrate      # Run database migrations

# Docker services
docker-compose up -d    # Start PostgreSQL & Redis
docker-compose down     # Stop services
docker-compose logs     # View logs

# Database
node src/db/seed.js     # Seed test data
npx drizzle-kit studio  # Open database GUI
```

---

---

## Testing

### Run Tests
```bash
npm test
```

**Results:** 15/15 tests passing ✅
- Encryption service (5 tests)
- Auth middleware (6 tests)  
- AWS connector (2 tests)
- AI service (2 tests)

### Test Endpoints
```bash
# API health
curl http://localhost:3000/health

# API auth (should return 401)
curl http://localhost:3000/api/v1/controls

# Portal
open http://localhost:3003

# Comply dashboard
open http://localhost:3001

# FinOps dashboard
open http://localhost:3002

# Website
open http://localhost:3004

# API docs
open http://localhost:3000/docs
```

---

## Authentication Flow

**Local Development:**
- Auth is bypassed for easier testing
- Portal accessible at http://localhost:3003
- Comply dashboard accessible at http://localhost:3001/dashboard
- FinOps dashboard accessible at http://localhost:3002/dashboard

**Production:**
- Auth0 handles authentication
- Users sign up/login at the portal
- Portal redirects to appropriate product dashboard based on subscription
- Middleware protects all `/dashboard` routes
- Onboarding flow for new users

---

## Still to Build
- ✅ Test suite (15 tests passing)
- ✅ Docker Compose for local development
- ⏳ Stripe billing integration
- ⏳ Email notifications
- ⏳ Production deployment (Docker + ECS)
- ⏳ CI/CD pipeline
- ⏳ Monitoring & alerting

---

## License

Proprietary - iFu Labs © 2024
