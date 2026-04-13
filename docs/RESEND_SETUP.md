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
FROM_EMAIL=onboarding@resend.dev
PORTAL_URL=http://localhost:3003
```

### 4. Test It!
Start your API server and test:

```bash
npm run dev
```

Then sign up or invite a team member - you should receive an email!

---

## Development vs Production

### Development (Free Tier)
- Use `onboarding@resend.dev` as FROM_EMAIL
- 100 emails/day, 3,000/month
- No domain verification needed
- Perfect for testing

### Production (Requires Domain)
1. Add your domain in Resend dashboard
2. Add DNS records (MX, TXT, CNAME)
3. Wait for verification (~5 minutes)
4. Update FROM_EMAIL to `noreply@yourdomain.com`

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
