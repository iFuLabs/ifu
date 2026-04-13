# Paystack Billing Integration - Setup Complete ✅

## Overview

Paystack billing is fully integrated and ready to use. All plans are configured in ZAR (South African Rand).

---

## ✅ What's Configured

### API Keys
- **Secret Key:** `sk_test_ecc04cf10ed95cb7bfd5792531fbd052e008d4d5`
- **Public Key:** `pk_test_4c86c2b7f1d971fb3c86122577933ce9fd4ee644`
- **Environment:** Test mode

### Plans

| Product | Plan Name | Price | Plan Code |
|---------|-----------|-------|-----------|
| Comply | Starter | ZAR 4,915.00/month | `PLN_aso3noim7t5xbhb` |
| Comply | Growth | ZAR 13,129.89/month | `PLN_vp2ewdsg7qmhx6p` |
| FinOps | Standard | ZAR 3,270.15/month | `PLN_qt95xanjmunr5ds` |

### Database Schema
- `paystackCustomerCode` - Customer identifier
- `paystackSubscriptionCode` - Subscription identifier  
- `paystackAuthCode` - Payment authorization token
- `trialEndsAt` - Trial expiration date

---

## 🔄 How It Works

### 1. User Signs Up
- User creates account via onboarding
- Organization created with 3-day trial
- No payment required yet

### 2. User Subscribes
- User goes to Billing page
- Clicks "Subscribe" and selects plan
- API call: `POST /api/v1/billing/initialize`
- Returns Paystack checkout URL

### 3. Payment Flow
```
User → Paystack Checkout → Enter Card → Payment Success → Redirect Back
```

### 4. Verification
- User redirected to: `/billing/callback?reference=xxx`
- Frontend calls: `GET /api/v1/billing/verify?reference=xxx`
- Backend verifies payment with Paystack
- Creates subscription with 3-day trial
- Updates organization with Paystack details

### 5. Subscription Active
- Trial period: 3 days from payment
- First charge: After trial ends
- Recurring: Monthly automatic charges

---

## 🧪 Testing the Integration

### Test 1: Check API Connection
```bash
node test-paystack.js
```

Expected output: ✅ All plans verified

### Test 2: Initialize Checkout (Manual)

Start your API server:
```bash
npm run dev
```

Make API call:
```bash
curl -X POST http://localhost:3000/api/v1/billing/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "plan": "comply-starter"
  }'
```

Expected response:
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "xxx",
  "accessCode": "xxx"
}
```

### Test 3: Full Flow (Browser)

1. Start all services:
   ```bash
   ./scripts/start-all.sh
   ```

2. Sign up at http://localhost:3003

3. Go to Billing page in dashboard

4. Click "Subscribe" → Select plan

5. Complete payment on Paystack checkout

6. Verify subscription is active

### Test Cards (Paystack Test Mode)

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4084084084084081 | 408 | Any future date | Success |
| 5060666666666666666 | 123 | Any future date | Success |
| 4084080000000409 | 408 | Any future date | Declined |

---

## 📡 API Endpoints

### GET /api/v1/billing
Get current subscription status

**Response:**
```json
{
  "plan": "starter",
  "status": "trialing",
  "trialEndsAt": "2026-04-20T00:00:00.000Z",
  "trialDaysLeft": 3,
  "hasPaymentMethod": true,
  "subscription": {
    "code": "SUB_xxx",
    "status": "active",
    "nextPaymentDate": "2026-04-20",
    "planName": "Comply Starter",
    "amount": 491500,
    "currency": "ZAR"
  }
}
```

### POST /api/v1/billing/initialize
Start checkout flow

**Request:**
```json
{
  "plan": "comply-starter" | "comply-growth" | "finops"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "xxx",
  "accessCode": "xxx"
}
```

### GET /api/v1/billing/verify?reference=xxx
Verify payment and create subscription

**Response:**
```json
{
  "status": "success",
  "plan": "starter",
  "planName": "Comply Starter",
  "trialEndsAt": "2026-04-20T00:00:00.000Z",
  "subscription": {
    "code": "SUB_xxx",
    "nextPaymentDate": "2026-04-20"
  }
}
```

### POST /api/v1/billing/cancel
Cancel subscription

**Response:**
```json
{
  "status": "cancelled",
  "message": "Subscription has been cancelled"
}
```

### POST /api/v1/billing/webhook
Receive Paystack webhook events (production only)

**Events handled:**
- `subscription.create` - New subscription created
- `charge.success` - Payment received
- `subscription.disable` - Subscription cancelled
- `subscription.not_renew` - Subscription won't renew
- `invoice.payment_failed` - Payment failed

---

## 🚀 Production Deployment

### 1. Switch to Live Mode

In Paystack Dashboard:
- Go to Settings → API Keys
- Copy **Live Secret Key** (starts with `sk_live_`)
- Copy **Live Public Key** (starts with `pk_live_`)

Update `.env`:
```bash
PAYSTACK_SECRET_KEY=sk_live_your_live_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_live_key_here
```

### 2. Set Up Webhook

In Paystack Dashboard:
- Go to Settings → Webhooks
- Add webhook URL: `https://api.yourdomain.com/api/v1/billing/webhook`
- Copy webhook secret

Update `.env`:
```bash
PAYSTACK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Update Callback URL

Update in your production `.env`:
```bash
PORTAL_URL=https://portal.yourdomain.com
```

### 4. Test in Production

Use real card (will be charged):
- Any valid Visa/Mastercard
- Real CVV and expiry date
- Charges will be processed

---

## 💰 Pricing Summary

### Current Pricing (ZAR)

| Product | Tier | Monthly Price | USD Equivalent* |
|---------|------|---------------|-----------------|
| Comply | Starter | ZAR 4,915.00 | ~$270 |
| Comply | Growth | ZAR 13,129.89 | ~$720 |
| FinOps | Standard | ZAR 3,270.15 | ~$180 |

*USD equivalent at ~18.2 ZAR/USD exchange rate

### Trial Period
- **Duration:** 3 days (currently)
- **Credit card:** Required upfront
- **First charge:** After trial ends
- **Can be changed to:** 7 days (as discussed)

---

## 🔧 Troubleshooting

### "PAYSTACK_SECRET_KEY is not configured"
- Check `.env` file has the secret key
- Restart your API server after updating `.env`

### "Invalid plan or plan not configured"
- Verify plan codes in `.env` match Paystack dashboard
- Run `node test-paystack.js` to verify

### "Payment verification failed"
- Check if using test cards in test mode
- Verify reference parameter is correct
- Check Paystack dashboard for transaction status

### Webhook not receiving events
- Webhooks only work with public URLs (not localhost)
- Verify webhook URL is correct in Paystack dashboard
- Check webhook secret matches `.env`

---

## 📚 Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Paystack Dashboard](https://dashboard.paystack.com)
- [Paystack API Reference](https://paystack.com/docs/api)

---

## ✅ Next Steps

1. **Test the full flow** in browser
2. **Update trial period** from 3 to 7 days (if needed)
3. **Update frontend** to show ZAR pricing
4. **Deploy to production** and switch to live keys
5. **Set up webhooks** for production

---

**Status:** ✅ Ready for testing
**Last Updated:** April 13, 2026
