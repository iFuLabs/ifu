# Product-Specific Invitations - Implementation

## ✅ What Was Implemented

### Problem
Previously, all team invitations redirected to Comply after acceptance, regardless of which product (Comply or FinOps) sent the invitation.

### Solution
Added product tracking to invitations so users are redirected to the correct product after accepting.

---

## 🔄 Changes Made

### 1. Database Schema Update

**Added `product` column to `invitations` table:**
```sql
ALTER TABLE invitations ADD COLUMN product text DEFAULT 'comply';
```

**Schema definition:**
```javascript
product: text('product').default('comply'), // comply | finops
```

### 2. Backend API Updates

**File:** `src/routes/team.js`

#### Invite Schema
```javascript
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
  product: z.enum(['comply', 'finops']).optional().default('comply')
})
```

#### POST /api/v1/team/invite
- Now accepts `product` parameter in request body
- Stores product in database
- Defaults to 'comply' if not provided

#### GET /api/v1/team/invitation/:token
- Returns `product` field in response
- Used by frontend to know which product to redirect to

#### POST /api/v1/team/accept-invitation
- Returns `product` field in response
- Frontend uses this to redirect to correct product

### 3. Frontend Updates

#### Comply Team Page
**File:** `comply/src/app/dashboard/team/page.tsx`

```javascript
body: JSON.stringify({ 
  email: inviteEmail, 
  role: inviteRole,
  product: 'comply'  // ← Added
})
```

#### FinOps Team Page
**File:** `finops/src/app/dashboard/team/page.tsx`

```javascript
body: JSON.stringify({ 
  email: inviteEmail, 
  role: inviteRole,
  product: 'finops'  // ← Added
})
```

#### Invitation Accept Page
**File:** `portal/src/app/invite/[token]/page.tsx`

```typescript
// Redirect to the product that sent the invitation
const productUrl = data.product === 'finops' 
  ? (process.env.NEXT_PUBLIC_FINOPS_URL || 'http://localhost:3002')
  : (process.env.NEXT_PUBLIC_COMPLY_URL || 'http://localhost:3001')

router.push(productUrl)
```

---

## 🎯 How It Works Now

### Scenario 1: Comply Invitation

1. Admin in Comply invites user
   - POST `/api/v1/team/invite` with `product: 'comply'`
2. Invitation stored with `product = 'comply'`
3. Email sent with invitation link
4. User clicks link and accepts
5. **Redirected to Comply dashboard** ✅

### Scenario 2: FinOps Invitation

1. Admin in FinOps invites user
   - POST `/api/v1/team/invite` with `product: 'finops'`
2. Invitation stored with `product = 'finops'`
3. Email sent with invitation link
4. User clicks link and accepts
5. **Redirected to FinOps dashboard** ✅

---

## 🧪 Testing

### Test Comply Invitation

1. Start all services
2. Log into Comply: http://localhost:3001
3. Go to Team page
4. Invite a team member
5. Accept the invitation
6. **Should redirect to Comply** ✅

### Test FinOps Invitation

1. Log into FinOps: http://localhost:3002
2. Go to Team page
3. Invite a team member
4. Accept the invitation
5. **Should redirect to FinOps** ✅

---

## 📊 Database Migration

**Migration file:** `drizzle/0003_add_invitation_product.sql`

```sql
ALTER TABLE "invitations" ADD COLUMN "product" text DEFAULT 'comply';
```

**Applied via:**
```bash
docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev \
  -c "ALTER TABLE invitations ADD COLUMN IF NOT EXISTS product text DEFAULT 'comply';"
```

**Verify:**
```bash
docker exec ifu-labs-postgres psql -U postgres -d ifu_labs_dev -c "\d invitations"
```

---

## 🔒 Backward Compatibility

- Existing invitations without `product` field default to 'comply'
- Old invitation links still work
- No breaking changes to API

---

## 📝 API Changes

### POST /api/v1/team/invite

**Request body (updated):**
```json
{
  "email": "user@example.com",
  "role": "admin",
  "product": "comply"  // ← NEW (optional, defaults to 'comply')
}
```

### GET /api/v1/team/invitation/:token

**Response (updated):**
```json
{
  "email": "user@example.com",
  "role": "admin",
  "product": "comply",  // ← NEW
  "organization": { ... },
  "invitedBy": { ... },
  "expiresAt": "..."
}
```

### POST /api/v1/team/accept-invitation

**Response (updated):**
```json
{
  "token": "jwt_token",
  "user": { ... },
  "product": "comply",  // ← NEW
  "message": "Invitation accepted successfully"
}
```

---

## ✅ Benefits

1. **Better UX** - Users land in the right product
2. **Product-specific onboarding** - Can customize per product
3. **Clear intent** - Know which product the user was invited to
4. **Analytics** - Track which product drives more invitations

---

## 🚀 Future Enhancements

1. **Multi-product access**
   - Allow users to access both Comply and FinOps
   - Product switcher in UI

2. **Product-specific roles**
   - Different permissions per product
   - E.g., Admin in Comply, Member in FinOps

3. **Product-specific emails**
   - Different email templates per product
   - Product-specific branding

4. **Invitation analytics**
   - Track acceptance rate per product
   - Compare Comply vs FinOps invitations

---

## 📚 Files Modified

### Backend
- `src/db/schema.js` - Added product field
- `src/routes/team.js` - Updated invite/accept endpoints
- `drizzle/0003_add_invitation_product.sql` - Migration

### Frontend
- `comply/src/app/dashboard/team/page.tsx` - Send product='comply'
- `finops/src/app/dashboard/team/page.tsx` - Send product='finops'
- `portal/src/app/invite/[token]/page.tsx` - Redirect based on product

---

## 🎉 Result

Team invitations now work correctly for both Comply and FinOps! Users are automatically redirected to the product that invited them.
