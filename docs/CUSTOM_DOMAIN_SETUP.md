# Setting Up info@ifulabs.com with Resend

## Step 1: Add Domain to Resend

1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `ifulabs.com`
4. Click **"Add"**

## Step 2: Add DNS Records

Resend will provide you with DNS records to add to your domain registrar (where you bought ifulabs.com). You'll need to add these records:

### Required Records:

1. **SPF Record** (TXT)
   ```
   Name: @
   Type: TXT
   Value: v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM Record** (TXT)
   ```
   Name: resend._domainkey
   Type: TXT
   Value: [Resend will provide this - it's a long string]
   ```

3. **DMARC Record** (TXT)
   ```
   Name: _dmarc
   Type: TXT
   Value: v=DMARC1; p=none; rua=mailto:info@ifulabs.com
   ```

### How to Add DNS Records:

The process depends on your domain registrar. Common ones:

**Namecheap:**
1. Go to Domain List → Manage → Advanced DNS
2. Add New Record → Select TXT
3. Enter the Name and Value from above

**GoDaddy:**
1. Go to My Products → DNS
2. Add → TXT
3. Enter the Name and Value

**Cloudflare:**
1. Go to DNS → Records
2. Add record → TXT
3. Enter the Name and Value

## Step 3: Wait for Verification

- DNS changes can take 5-60 minutes to propagate
- Check Resend dashboard for verification status
- Green checkmark = verified and ready to use

## Step 4: Update Environment Variables

Once verified, update your `.env` file:

```bash
# Change these lines:
EMAIL_DOMAIN=resend.dev
REPLY_TO_EMAIL=info@ifulabs.com

# To these:
EMAIL_DOMAIN=ifulabs.com
REPLY_TO_EMAIL=info@ifulabs.com
```

**How it works:**
- Emails are sent from addresses like `ifu-labs@ifulabs.com`, `ifu-labs-team@ifulabs.com`, etc.
- All replies go to `info@ifulabs.com` (your actual mailbox)
- You don't need to create mailboxes for the sending addresses

## Step 5: Restart Your Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Testing

Send a test email to verify it works:

```bash
node test-email.js
```

Or sign up for a new account and check if you receive the welcome email from `info@ifulabs.com`.

## Troubleshooting

### Domain not verifying?
- Wait 30-60 minutes for DNS propagation
- Double-check DNS records match exactly what Resend provided
- Use [DNS Checker](https://dnschecker.org) to verify records are live

### Emails still coming from resend.dev?
- Make sure you updated `.env` with `EMAIL_DOMAIN=ifulabs.com`
- Make sure `REPLY_TO_EMAIL=info@ifulabs.com` is set
- Restart your server after changing `.env`
- Check server logs for any errors

### Emails going to spam?
- Make sure all 3 DNS records (SPF, DKIM, DMARC) are verified
- Send a few test emails - reputation builds over time
- Avoid spam trigger words in subject lines

## Benefits of Custom Domain

✅ Professional appearance  
✅ Better email deliverability  
✅ Builds sender reputation  
✅ Recipients trust emails from your domain  
✅ No "via resend.dev" in email headers  

## Cost

- **Domain verification:** FREE
- **Sending emails:** FREE up to 3,000/month
- **Resend Pro:** $20/month for 50,000 emails (if you need more)

## Support

- Resend Docs: https://resend.com/docs/send-with-domains
- Resend Support: support@resend.com
- Check your Resend dashboard for specific DNS values
