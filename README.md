# iFu Labs

Multi-tenant SaaS platform for compliance automation and cloud cost optimization.

## Products

- **Comply** — Automated compliance monitoring for SOC 2, ISO 27001, GDPR, HIPAA ($299-799/mo)
- **FinOps** — AWS cost optimization and waste detection ($199/mo)

## Quick Start

```bash
# Install dependencies
npm install
cd portal && npm install && cd ..
cd comply && npm install --legacy-peer-deps && cd ..
cd finops && npm install --legacy-peer-deps && cd ..
cd website && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env and set required variables (see Environment Setup below)

# Start services
docker-compose up -d        # PostgreSQL + Redis
npm run migrate             # Run database migrations
node src/db/seed.js         # Seed control definitions (optional)

# If migrations fail on existing database, run:
./scripts/fix-migrations.sh # Marks existing migrations as complete

# Start all apps
./scripts/start-all.sh

# Stop all apps
./scripts/stop-all.sh
```

## Architecture

| Service | Port | Purpose |
|---------|------|---------|
| API | 3000 | Fastify backend |
| Comply | 3001 | Compliance product dashboard |
| FinOps | 3002 | Cost optimization dashboard |
| Portal | 3003 | Onboarding, login & auth |
| Website | 3004 | Marketing site |

## Authentication

**Local JWT-based authentication** with bcrypt password hashing. Auth0 support is optional.

### User Flow
1. User visits website → clicks "Start free trial"
2. Redirects to Portal onboarding (4 steps):
   - **Step 1:** Sign up (name, email, password)
   - **Step 2:** Create organization
   - **Step 3:** Connect AWS account (optional)
   - **Step 4:** Confirmation
3. JWT token issued and stored in httpOnly cookie + localStorage
4. User redirected to product dashboard (Comply or FinOps)

### Login Flow
1. User visits `/login` on Portal
2. Enters email + password
3. Backend verifies credentials with bcrypt
4. JWT token issued (7-day expiration)
5. Redirects to dashboard

See [AUTH_FLOW.md](./AUTH_FLOW.md) for detailed authentication documentation.

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ifu_labs_dev

# Redis (required)
REDIS_URL=redis://localhost:6379

# JWT Secret (REQUIRED - generate with: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# Encryption Key (REQUIRED - generate with: openssl rand -hex 32)
ENCRYPTION_KEY=64-character-hex-string-for-aes-256-encryption

# AWS Account ID (your iFu Labs AWS account for cross-account role assumption)
AWS_ACCOUNT_ID=123456789012

# AWS Credentials (for Bedrock AI and Cost Explorer)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_REGION=us-east-1

# Auth0 (optional - only if using Auth0 instead of local auth)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.ifu-labs.io
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret

# Stripe (optional - for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# GitHub App (optional - for GitHub integration)
GITHUB_APP_ID=123456
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Resend Email Service (REQUIRED for emails)
# Get your API key from: https://resend.com/api-keys
# Free tier: 100 emails/day, 3,000/month
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@resend.dev
PORTAL_URL=http://localhost:3003
```

### Frontend Environment Variables

Each frontend app needs `.env.local`:

```bash
# Portal, Comply, FinOps, Website
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_URL=http://localhost:3003
NEXT_PUBLIC_COMPLY_URL=http://localhost:3001
NEXT_PUBLIC_FINOPS_URL=http://localhost:3002
```

## Database Migrations

```bash
# Run all migrations
npm run migrate

# Create new migration
npx drizzle-kit generate:pg

# View database schema
npx drizzle-kit studio
```

### Migration History
- `0000_broad_sister_grimm.sql` - Initial schema
- `0001_add_password_auth.sql` - Added passwordHash column for local auth
- `0002_add_invitations.sql` - Added team invitations table

## Features

### ✅ Implemented

#### Authentication & Authorization
- Local JWT-based authentication with bcrypt
- Email/password login and signup
- httpOnly cookies + localStorage token storage
- Role-based access control (Owner, Admin, Member)
- 7-day token expiration
- Welcome emails on signup (Resend)

#### Team Management
- Invite team members by email ✅ WITH EMAIL
- Pending invitation tracking
- Role assignment (Admin, Member)
- Remove team members
- Invitation expiration (7 days)
- Automated invitation emails via Resend

#### Compliance (Comply)
- Multi-framework support (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS)
- Automated control checks via AWS integration
- Control status tracking (pass, fail, review, pending)
- Evidence collection and storage
- PDF evidence export
- AI-powered gap explanations (Amazon Bedrock)
- Manual control notes

#### Integrations
- AWS cross-account role assumption
- GitHub App integration
- Dynamic AWS setup info endpoint
- Integration status monitoring
- Manual sync triggers

#### FinOps
- AWS cost analysis
- Waste detection (idle resources)
- Rightsizing recommendations
- Reserved Instance coverage analysis
- Savings Plans coverage analysis
- Cost forecasting
- Real-time scan streaming (SSE)

#### Vendor Management
- Vendor risk tracking
- SOC 2 / ISO 27001 certificate expiration monitoring
- Risk level categorization

#### Dashboard Features
- Compliance score overview
- Recent scans history
- Team member management
- Billing page (UI ready, Stripe integration pending)
- Working navigation and logout

### 🚧 TODO

1. **~~Email Service Integration~~** ✅ IMPLEMENTED (Resend)
   - Welcome emails on signup
   - Team invitation emails
   - See [docs/RESEND_SETUP.md](./docs/RESEND_SETUP.md) for setup

2. **~~Team Invitation Accept Flow~~** ✅ IMPLEMENTED
   - Invitation accept page with account creation
   - Token validation and expiry checking
   - Automatic user account creation
   - See [INVITATION_FLOW.md](./INVITATION_FLOW.md) for details

3. **Stripe Billing**
   - Checkout session creation
   - Customer portal
   - Webhook handling (subscription events)
   - Location: `src/routes/billing.js`

4. **GitHub Webhook Handler**
   - Signature verification
   - Event processing (push, member changes, installation)
   - Location: `src/routes/integrations.js` line 238

5. **Production Environment**
   - Replace placeholder AWS_ACCOUNT_ID
   - Generate production JWT_SECRET and ENCRYPTION_KEY
   - Configure real AWS credentials
   - Set up SSL/TLS certificates

## API Endpoints

### Authentication
- `POST /api/v1/auth/onboard` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Current user info
- `PATCH /api/v1/auth/me` - Update profile

### Team Management
- `GET /api/v1/team/members` - List team members
- `GET /api/v1/team/invitations` - List pending invitations
- `POST /api/v1/team/invite` - Invite team member
- `DELETE /api/v1/team/members/:id` - Remove member
- `DELETE /api/v1/team/invitations/:id` - Cancel invitation
- `GET /api/v1/team/invitation/:token` - Get invitation details (public)
- `POST /api/v1/team/accept-invitation` - Accept invitation (public)

### Controls
- `GET /api/v1/controls` - List controls (with filters)
- `GET /api/v1/controls/score` - Compliance score
- `GET /api/v1/controls/:controlId` - Control details
- `PATCH /api/v1/controls/:controlId/notes` - Add notes

### Evidence
- `GET /api/v1/evidence` - List evidence
- `POST /api/v1/evidence` - Add manual evidence
- `DELETE /api/v1/evidence/:id` - Delete evidence
- `GET /api/v1/evidence/export/pdf` - Export PDF

### Integrations
- `GET /api/v1/integrations` - List integrations
- `GET /api/v1/integrations/aws/setup-info` - AWS setup info
- `POST /api/v1/integrations/aws` - Connect AWS
- `POST /api/v1/integrations/github` - Connect GitHub
- `DELETE /api/v1/integrations/:id` - Disconnect
- `POST /api/v1/integrations/:id/sync` - Manual sync

### FinOps
- `GET /api/v1/finops` - FinOps findings (cached)
- `GET /api/v1/finops/stream` - Real-time scan (SSE)
- `GET /api/v1/finops/summary` - Dashboard summary

### Vendors
- `GET /api/v1/vendors` - List vendors
- `POST /api/v1/vendors` - Create vendor
- `PATCH /api/v1/vendors/:id` - Update vendor
- `DELETE /api/v1/vendors/:id` - Delete vendor

### AI
- `POST /api/v1/ai/explain/:controlId` - AI explanation
- `GET /api/v1/ai/explain/:controlId/stream` - Streaming explanation
- `GET /api/v1/ai/summary` - Compliance summary

### Scans
- `GET /api/v1/scans` - List scans
- `GET /api/v1/scans/:id` - Scan details

Full API documentation: http://localhost:3000/docs (development only)

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/routes/auth.test.js

# Run with coverage
npm test -- --coverage
```

## Tech Stack

**Backend:**
- Fastify (web framework)
- Drizzle ORM (database)
- PostgreSQL (database)
- Redis (caching)
- BullMQ (job queue)
- AWS SDK (integrations)
- Amazon Bedrock (AI)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)
- zod (validation)

**Frontend:**
- Next.js 14 (React framework)
- Tailwind CSS (styling)
- SWR (data fetching)
- Recharts (charts)
- date-fns (date formatting)
- Lucide React (icons)

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- httpOnly cookies for token storage
- AES-256-GCM encryption for stored credentials
- CORS protection
- Rate limiting (100 req/min)
- Helmet security headers
- SQL injection protection (parameterized queries)
- Input validation with Zod

## Documentation

- [AUTH_FLOW.md](./AUTH_FLOW.md) - Authentication flow details
- [TESTING.md](./TESTING.md) - Testing guide
- [docs/api-reference.html](./docs/api-reference.html) - API reference
- API docs: http://localhost:3000/docs (Swagger UI)

## Troubleshooting

### Database connection fails
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker logs ifu-labs-postgres
```

### Redis connection fails
```bash
# Check if Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis
```

### Migration fails
```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d
npm run migrate
```

### Frontend can't connect to API
- Verify API is running on port 3000
- Check NEXT_PUBLIC_API_URL in frontend .env.local
- Check CORS settings in src/index.js

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: your feature"`
3. Push branch: `git push origin feature/your-feature`
4. Create pull request

## License

Proprietary - iFu Labs © 2024
