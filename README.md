# iFu Labs

Multi-tenant SaaS platform for compliance automation and cloud cost optimization.

## Products

- **Comply** — Automated compliance monitoring for SOC 2, ISO 27001, GDPR ($299-799/mo)
- **FinOps** — AWS cost optimization and waste detection ($199/mo)

## Quick Start

```bash
# Install dependencies
npm install
cd portal && npm install && cd ..
cd comply && npm install --legacy-peer-deps && cd ..
cd finops && npm install --legacy-peer-deps && cd ..
cd website && npm install && cd ..

# Start services
docker-compose up -d        # PostgreSQL + Redis
npm run db:migrate          # Run migrations
npm run db:seed             # Seed control definitions

# Start all apps
./scripts/start-all.sh

# Stop all apps
./scripts/stop-all.sh
```

## Architecture

| Service | Port | Purpose |
|---------|------|---------|
| API | 3000 | Fastify backend |
| Comply | 3001 | Compliance product |
| FinOps | 3002 | Cost optimization product |
| Portal | 3003 | Onboarding & auth |
| Website | 3004 | Marketing site |

## Authentication

See [AUTH_FLOW.md](./AUTH_FLOW.md) for complete authentication documentation.

## Environment Setup

Copy `.env.example` to `.env` and configure database, Redis, Auth0, and AWS credentials.

Each frontend app also needs `.env.local` with Auth0 configuration (already created).

## Testing

```bash
npm test                    # Run all tests (15 passing)
```

## Tech Stack

**Backend:** Fastify, Drizzle ORM, PostgreSQL, Redis, BullMQ, AWS SDK, Amazon Bedrock  
**Frontend:** Next.js 14, Tailwind CSS, SWR, Recharts, Auth0

## Documentation

- [AUTH_FLOW.md](./AUTH_FLOW.md) - Authentication flow
- [docs/api-reference.html](./docs/api-reference.html) - API documentation
- API docs: http://localhost:3000/documentation

## License

Proprietary - iFu Labs © 2024
