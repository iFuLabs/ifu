# Deployment Checklist

## Pre-Deployment

### AWS Setup
- [ ] AWS account created with admin access
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Terraform >= 1.5 installed (`terraform --version`)

### GitHub Setup
- [ ] Repository created (or using existing)
- [ ] Update `infra/environments/production.tfvars` with correct `github_repo`

### Secrets Preparation
Gather these values (you'll need them for Terraform and GitHub):
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Random secret (generate: `openssl rand -base64 32`)
- [ ] `RESEND_API_KEY` - From Resend dashboard
- [ ] `PAYSTACK_SECRET_KEY` - From Paystack dashboard
- [ ] `PAYSTACK_PUBLIC_KEY` - From Paystack dashboard
- [ ] `API_AWS_ACCESS_KEY_ID` - AWS access key for API service
- [ ] `API_AWS_SECRET_ACCESS_KEY` - AWS secret key for API service

## Deployment Steps

### 1. Create Terraform Backend
```bash
cd infra
./setup.sh
```

Or manually:
```bash
# Create S3 bucket
aws s3api create-bucket --bucket ifulabs-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket ifulabs-terraform-state --versioning-configuration Status=Enabled

# Create DynamoDB table
aws dynamodb create-table \
  --table-name ifulabs-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

- [ ] S3 bucket created
- [ ] DynamoDB table created
- [ ] Terraform initialized (`terraform init`)

### 2. Deploy Infrastructure
```bash
cd infra

# Export secrets as environment variables
export TF_VAR_database_url="postgresql://..."
export TF_VAR_jwt_secret="..."
export TF_VAR_resend_api_key="..."
export TF_VAR_paystack_secret_key="..."
export TF_VAR_paystack_public_key="..."
export TF_VAR_aws_access_key_id="..."
export TF_VAR_aws_secret_access_key="..."

# Plan
terraform plan \
  -var-file="environments/production.tfvars" \
  -var="github_repo=your-org/ifu-labs"

# Apply
terraform apply \
  -var-file="environments/production.tfvars" \
  -var="github_repo=your-org/ifu-labs"
```

- [ ] Terraform plan reviewed
- [ ] Terraform apply completed successfully
- [ ] Note the outputs (CloudFront URL, App Runner URL, etc.)

### 3. Configure DNS (Hostinger)

Get DNS records:
```bash
terraform output acm_validation_records
```

Add ACM validation CNAME records to Hostinger:
- [ ] `_xxx.www.ifulabs.com` → CNAME → `_xxx.acm-validations.aws`
- [ ] `_xxx.api.ifulabs.com` → CNAME → `_xxx.acm-validations.aws`
- [ ] `_xxx.portal.ifulabs.com` → CNAME → `_xxx.acm-validations.aws`
- [ ] `_xxx.comply.ifulabs.com` → CNAME → `_xxx.acm-validations.aws`
- [ ] `_xxx.finops.ifulabs.com` → CNAME → `_xxx.acm-validations.aws`

Wait 5-10 minutes for ACM validation, then add service endpoints:
```bash
terraform output website_cloudfront_url
terraform output api_url
terraform output portal_url
terraform output comply_url
terraform output finops_url
```

- [ ] `www.ifulabs.com` → CNAME → CloudFront domain
- [ ] `api.ifulabs.com` → CNAME → App Runner URL
- [ ] `portal.ifulabs.com` → CNAME → Amplify URL
- [ ] `comply.ifulabs.com` → CNAME → Amplify URL
- [ ] `finops.ifulabs.com` → CNAME → Amplify URL

### 4. Configure GitHub Secrets

Get IAM role ARN:
```bash
terraform output github_oidc_role_arn
```

Add secrets to GitHub (Settings → Secrets and variables → Actions):
- [ ] `AWS_ROLE_ARN` - From Terraform output
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `RESEND_API_KEY` - Resend API key
- [ ] `PAYSTACK_SECRET_KEY` - Paystack secret key
- [ ] `PAYSTACK_PUBLIC_KEY` - Paystack public key
- [ ] `API_AWS_ACCESS_KEY_ID` - AWS access key
- [ ] `API_AWS_SECRET_ACCESS_KEY` - AWS secret key

### 5. Initial Deployment

Push infrastructure to GitHub:
```bash
git add .
git commit -m "Add AWS infrastructure and CI/CD"
git push origin main
```

- [ ] GitHub Actions workflows triggered
- [ ] Website deployed to S3/CloudFront
- [ ] API deployed to App Runner
- [ ] Portal/Comply/Finops deployed to Amplify

### 6. Verify Deployments

Check each endpoint:
- [ ] https://www.ifulabs.com - Website loads
- [ ] https://api.ifulabs.com/health - Returns `{"status":"ok"}`
- [ ] https://portal.ifulabs.com - Portal loads
- [ ] https://comply.ifulabs.com - Comply loads
- [ ] https://finops.ifulabs.com - FinOps loads

Check SSL certificates:
- [ ] All endpoints use HTTPS
- [ ] No certificate warnings

### 7. Test Functionality

- [ ] User registration works
- [ ] User login works
- [ ] API endpoints respond correctly
- [ ] Database connections work
- [ ] Email sending works (Resend)
- [ ] Payment processing works (Paystack)

## Post-Deployment

### Monitoring Setup
- [ ] Set up CloudWatch alarms for App Runner
- [ ] Monitor S3/CloudFront costs
- [ ] Monitor Amplify build logs

### Documentation
- [ ] Update README.md with production URLs
- [ ] Document any custom configurations
- [ ] Share access with team members

### Backup Strategy
- [ ] Database backups configured
- [ ] S3 versioning enabled (already done by Terraform)
- [ ] Terraform state backed up

## Rollback Plan

If something goes wrong:

### Website
```bash
# Restore from S3 versioning
aws s3api list-object-versions --bucket ifulabs-website-production
```

### API
```bash
# Deploy previous Docker image
aws apprunner update-service --service-arn <arn> --source-configuration ...
```

### Infrastructure
```bash
# Revert Terraform changes
cd infra
git checkout <previous-commit>
terraform apply -var-file="environments/production.tfvars" ...
```

## Troubleshooting

### ACM Certificate Not Validating
- Check DNS records in Hostinger
- Wait up to 48 hours (usually 5-10 minutes)
- Verify with: `dig _xxx.acm-validations.aws.ifulabs.com`

### App Runner Health Check Failing
- Check logs: `aws logs tail /aws/apprunner/ifulabs-api --follow`
- Verify `/health` endpoint
- Check environment variables

### GitHub Actions Failing
- Check workflow logs in GitHub
- Verify AWS_ROLE_ARN secret
- Check IAM permissions

### Amplify Build Failing
- Check build logs in AWS Console
- Verify package.json scripts
- Check environment variables

## Cost Monitoring

Expected monthly costs:
- S3 + CloudFront: $1-5
- App Runner: $5-25
- Amplify: $15 (3 apps)
- Total: ~$21-45/month

Set up billing alerts:
```bash
aws budgets create-budget --account-id <account-id> --budget file://budget.json
```

## Security Checklist

- [ ] All endpoints use HTTPS
- [ ] S3 buckets are private
- [ ] IAM roles follow least privilege
- [ ] Secrets stored in GitHub Secrets
- [ ] No long-lived AWS credentials
- [ ] App Runner runs as non-root
- [ ] Database uses SSL
- [ ] CORS configured correctly

## Maintenance

### Weekly
- [ ] Check CloudWatch logs for errors
- [ ] Review AWS costs

### Monthly
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Backup verification

### Quarterly
- [ ] Review IAM permissions
- [ ] Update Terraform modules
- [ ] Disaster recovery test

---

## Quick Reference

### Useful Commands

```bash
# View Terraform outputs
cd infra && terraform output

# Check API logs
aws logs tail /aws/apprunner/ifulabs-api --follow

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"

# List App Runner services
aws apprunner list-services

# Check Amplify apps
aws amplify list-apps

# View GitHub Actions logs
gh run list
gh run view <run-id>
```

### Important URLs

- AWS Console: https://console.aws.amazon.com
- GitHub Actions: https://github.com/your-org/ifu-labs/actions
- Terraform Cloud: (if using)
- Hostinger DNS: https://hostinger.com

---

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Verified
