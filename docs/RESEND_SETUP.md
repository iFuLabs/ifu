# Resend Email Setup Guide

## Quick Setup (5 minutes)

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up with your email (no credit card required)
3. Verify your email

### 2. Get API Key
1. Go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it: `iFu Labs Development`
4. Copy the API key (starts with `re_`)

### 3. Configure Environment
Add to your `.env` file:

```bash
RESEND_API_KEY=re_your_actual_api_key_here

# For Development (no domain setup needed)
FROM_EMAIL=onboarding@resend.dev

# For Production (requires domain verification - see below)
# FROM_EMAIL=hello@ifu-labs.io

PORTAL_URL=http://localhost:3003
```

**About FROM_EMAIL:**
- `onboarding@resend.dev` - Resend's test address, works immediately
- `yourname@resend.dev` - Quick option using Resend's domain
- `hello@yourdomain.com` - Professional option (requires domain setup)

### 4. Test It!
Start your API server and test:

```bash
npm run dev
```

Then sign up or invite a team member - you should receive an email!

---

## Development vs Production

### Development (Current Setup)
- **FROM_EMAIL:** `onboarding@resend.dev`
- **Benefits:** Works immediately, no setup required
- **Limits:** 100 emails/day, 3,000/month (free tier)
- **Drawback:** Emails show as from "onboarding@resend.dev" (not your brand)

### Production (Recommended)
To use your own domain (e.g., `hello@ifu-labs.io`):

1. **Add Domain in Resend:**
   - Go to [Resend Dashboard → Domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter your domain: `ifu-labs.io`

2. **Add DNS Records:**
   Resend will provide DNS records to add to your domain registrar:
   - **SPF Record** (TXT) - Prevents spoofing
   - **DKIM Record** (TXT) - Email authentication
   - **DMARC Record** (TXT) - Email policy
   - **MX Record** (optional) - For receiving emails

3. **Wait for Verification:**
   - Usually takes 5-10 minutes
   - Check status in Resend dashboard
   - Green checkmark = verified

4. **Update Environment:**
   ```bash
   FROM_EMAIL=hello@ifu-labs.io
   # or team@ifu-labs.io, noreply@ifu-labs.io, etc.
   ```

**Benefits of Using Your Domain:**
- Professional appearance
- Better deliverability
- Builds sender reputation
- Recipients trust emails from your domain

---

## Email Templates

### Welcome Email
- Sent after user signs up
- Includes: Welcome message, trial info, dashboard link

### Team Invitation
- Sent when admin invites team member
- Includes: Invitation link, role, expiry date

### Password Reset (Future)
- Template ready, endpoint not implemented yet
- Includes: Reset link with 1-hour expiry

---

## Troubleshooting

### "Invalid API key"
- Check your API key in `.env`
- Make sure it starts with `re_`
- No quotes around the key

### "Email not sent"
- Check server logs for error details
- Verify RESEND_API_KEY is set
- Check Resend dashboard for delivery status

### "Rate limit exceeded"
- Free tier: 100 emails/day
- Wait 24 hours or upgrade plan
- Check [Resend dashboard](https://resend.com/emails) for usage

---

## Monitoring

View sent emails in [Resend Dashboard](https://resend.com/emails):
- Delivery status
- Open rates (if tracking enabled)
- Bounce/complaint rates
- Email content preview

---

## Upgrade Path

When you need more:
- **Pro Plan:** $20/month for 50,000 emails
- **Custom domain:** Free with any plan
- **Remove branding:** Included in all plans
- **Email analytics:** Included in all plans

---

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- iFu Labs: Check `src/services/email.js` for implementation
