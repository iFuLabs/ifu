# Authentication Flow

## Overview
iFu Labs uses Auth0 for authentication across all applications (Website, Portal, Comply, FinOps).

## User Journey

### First Time User
1. User clicks "Start free trial" on website (localhost:3004)
2. Redirects to Auth0 Universal Login
3. User signs up/logs in with Auth0
4. Auth0 redirects to `portal/auth/callback` (localhost:3003)
5. Portal checks if user is onboarded via `/api/v1/auth/me`
6. If not onboarded → Portal onboarding flow
7. User completes onboarding (creates org, optionally connects AWS)
8. Redirects to product dashboard (Comply or FinOps)

### Returning User
1. User visits website or goes directly to product URL
2. Auth0 client checks for existing session (localStorage)
3. If authenticated → Redirects to last used product dashboard
4. If not authenticated → Redirects to Auth0 login
5. After login → Redirects to product dashboard

## Environment Variables

### All Apps (.env.local)
```bash
NEXT_PUBLIC_AUTH0_DOMAIN=dev-test.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=test_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.ifu-labs.io
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_COMPLY_URL=http://localhost:3001
NEXT_PUBLIC_FINOPS_URL=http://localhost:3002
NEXT_PUBLIC_PORTAL_URL=http://localhost:3003
```

### API (.env)
```bash
AUTH0_DOMAIN=dev-test.auth0.com
AUTH0_AUDIENCE=https://api.ifu-labs.io
AUTH0_CLIENT_ID=test_client_id
AUTH0_CLIENT_SECRET=test_client_secret
```

## API Authentication

All API requests require `Authorization: Bearer <token>` header.

### Endpoints

#### GET /api/v1/auth/me
Returns current user + org status. Used to check if onboarding is complete.

**Response (not onboarded):**
```json
{
  "authenticated": true,
  "onboarded": false,
  "auth0Sub": "auth0|123",
  "email": "user@example.com"
}
```

**Response (onboarded):**
```json
{
  "authenticated": true,
  "onboarded": true,
  "user": { "id": "...", "email": "...", "role": "owner" },
  "organization": { "id": "...", "name": "...", "plan": "starter" }
}
```

#### POST /api/v1/auth/onboard
Creates organization and user record on first login.

**Request:**
```json
{
  "orgName": "Acme Corp",
  "orgDomain": "acme.com"
}
```

## Local Development

For local testing without real Auth0:
- Mock Auth0 credentials are in `.env`
- Frontend apps will fail to authenticate (expected)
- To test full flow, set up real Auth0 tenant or use development bypass

## Production Setup

1. Create Auth0 tenant
2. Create Auth0 SPA application
3. Configure callback URLs:
   - `https://portal.ifu-labs.io/auth/callback`
4. Update environment variables with real Auth0 credentials
5. Deploy all apps with updated env vars
