# Password Reset Feature Implementation

## Status: Ready to Implement

### What's Done
✅ Database schema added (`passwordResetTokens` table)  
✅ Migration file created (`drizzle/0008_add_password_reset_tokens.sql`)  
✅ Email template ready (`sendPasswordResetEmail()` in `src/services/email.js`)

### What's Needed

#### 1. Backend API Routes (`src/routes/auth.js`)

```javascript
// POST /api/v1/auth/forgot-password
// Request: { email: string }
// Response: { message: "If email exists, reset link sent" }
// - Find user by email
// - Generate secure random token (crypto.randomBytes)
// - Store token in password_reset_tokens table (expires in 1 hour)
// - Send email with reset link
// - Always return success (don't reveal if email exists)

// POST /api/v1/auth/reset-password
// Request: { token: string, newPassword: string }
// Response: { message: "Password reset successful" }
// - Validate token exists and not expired
// - Validate token not already used
// - Hash new password with bcrypt
// - Update user password
// - Mark token as used
// - Return success
```

#### 2. Frontend Pages

**Portal (`portal/src/app/forgot-password/page.tsx`)**
- Form with email input
- Submit to `/api/v1/auth/forgot-password`
- Show success message
- Link back to login

**Portal (`portal/src/app/reset-password/[token]/page.tsx`)**
- Form with new password + confirm password
- Submit to `/api/v1/auth/reset-password`
- Validate passwords match
- Show success and redirect to login

**Comply & FinOps**
- Add "Forgot Password?" link on login pages
- Redirect to portal forgot-password page
- After reset, redirect back to respective dashboard

#### 3. Security Considerations

- ✅ Tokens expire after 1 hour
- ✅ Tokens can only be used once
- ✅ Don't reveal if email exists (always show success)
- ✅ Rate limit forgot-password endpoint (max 3 requests per hour per IP)
- ✅ Password must meet requirements (min 8 chars)
- ✅ Tokens are cryptographically random
- ✅ Old tokens are cleaned up (cron job or on-demand)

#### 4. Testing

Create tests for:
- Token generation and validation
- Expired token rejection
- Used token rejection
- Invalid token rejection
- Password requirements
- Email sending
- Rate limiting

#### 5. Database Migration

Run the migration:
```bash
# Apply migration
psql $DATABASE_URL < drizzle/0008_add_password_reset_tokens.sql

# Or use Drizzle Kit
npx drizzle-kit push:pg
```

### Implementation Steps

1. **Run database migration** ✅ (file created, needs to be applied)
2. **Add API routes** (15-20 min)
3. **Add portal pages** (20-30 min)
4. **Update login pages** (5 min)
5. **Add tests** (15-20 min)
6. **Test end-to-end** (10 min)

**Total Time:** ~1-1.5 hours

### Files to Create/Modify

**New Files:**
- `portal/src/app/forgot-password/page.tsx`
- `portal/src/app/reset-password/[token]/page.tsx`
- `tests/routes/password-reset.test.js`

**Modified Files:**
- `src/routes/auth.js` (add 2 new endpoints)
- `src/db/schema.js` ✅ (done)
- `portal/src/app/login/page.tsx` (add "Forgot Password?" link)
- `comply/src/app/auth/callback/page.tsx` (add link)
- `finops/src/app/dashboard/layout.tsx` (add link if needed)

### Email Flow

1. User clicks "Forgot Password?"
2. User enters email
3. System generates token and sends email from `security@ifulabs.com`
4. User clicks link in email → goes to `/reset-password/[token]`
5. User enters new password
6. System validates and updates password
7. User redirected to login with success message

### Notes

- Tokens are single-use and expire in 1 hour
- All replies go to `info@ifulabs.com`
- Email template already styled and ready
- Works across all dashboards (portal, comply, finops)

### Ready to Implement?

Run this command to apply the database migration:
```bash
psql $DATABASE_URL < drizzle/0008_add_password_reset_tokens.sql
```

Then we can implement the API routes and frontend pages.
