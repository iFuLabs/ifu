# iFu Labs Infrastructure

Terraform configuration for deploying iFu Labs to AWS using:
- S3 + CloudFront (static website)
- App Runner (Fastify API)
- Amplify (3 Next.js SSR apps)
- ACM (SSL certificates)
- GitHub Actions OIDC (secure deployments)

## Prerequisites

1. AWS Account with admin access
2. Terraform >= 1.5
3. AWS CLI configured
4. Domain registered at Hostinger
5. GitHub repository

## Initial Setup

### 1. Create S3 Backend (one-time)

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket ifulabs-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket ifulabs-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket ifulabs-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name ifulabs-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
AWS_ROLE_ARN                  # Will be output by Terraform after first apply
DATABASE_URL                  # PostgreSQL connection string
JWT_SECRET                    # Random secret for JWT signing
RESEND_API_KEY               # Resend API key
PAYSTACK_SECRET_KEY          # Paystack secret key
PAYSTACK_PUBLIC_KEY          # Paystack public key
API_AWS_ACCESS_KEY_ID        # AWS access key for API service
API_AWS_SECRET_ACCESS_KEY    # AWS secret key for API service
```

### 3. Update Configuration

Edit `environments/production.tfvars`:
```hcl
github_repo = "your-org/ifu-labs"  # Update with your repo
```

### 4. Deploy Infrastructure

```bash
cd infra

# Initialize Terraform
terraform init

# Plan (review changes)
terraform plan \
  -var-file="environments/production.tfvars" \
  -var="github_repo=your-org/ifu-labs" \
  -var="database_url=$DATABASE_URL" \
  -var="jwt_secret=$JWT_SECRET" \
  -var="resend_api_key=$RESEND_API_KEY" \
  -var="paystack_secret_key=$PAYSTACK_SECRET_KEY" \
  -var="paystack_public_key=$PAYSTACK_PUBLIC_KEY" \
  -var="aws_access_key_id=$API_AWS_ACCESS_KEY_ID" \
  -var="aws_secret_access_key=$API_AWS_SECRET_ACCESS_KEY"

# Apply (create resources)
terraform apply \
  -var-file="environments/production.tfvars" \
  -var="github_repo=your-org/ifu-labs" \
  -var="database_url=$DATABASE_URL" \
  -var="jwt_secret=$JWT_SECRET" \
  -var="resend_api_key=$RESEND_API_KEY" \
  -var="paystack_secret_key=$PAYSTACK_SECRET_KEY" \
  -var="paystack_public_key=$PAYSTACK_PUBLIC_KEY" \
  -var="aws_access_key_id=$API_AWS_ACCESS_KEY_ID" \
  -var="aws_secret_access_key=$API_AWS_SECRET_ACCESS_KEY"
```

### 5. Configure DNS at Hostinger

After Terraform completes, it will output DNS records. Add these to Hostinger:

```bash
# Get DNS records
terraform output acm_validation_records
```

Add the CNAME records for ACM validation (format: `_xxx.acm-validations.aws`).

Wait 5-10 minutes for validation, then add service endpoints:

```
www.ifulabs.com    → CNAME → [cloudfront_domain from output]
api.ifulabs.com    → CNAME → [app_runner_url from output]
portal.ifulabs.com → CNAME → [amplify_url from output]
comply.ifulabs.com → CNAME → [amplify_url from output]
finops.ifulabs.com → CNAME → [amplify_url from output]
```

### 6. Configure GitHub Actions

Get the IAM role ARN:
```bash
terraform output github_oidc_role_arn
```

Add this as `AWS_ROLE_ARN` secret in GitHub.

### 7. Initial Deployments

Push to `main` branch to trigger deployments:

```bash
git add .
git commit -m "Add infrastructure"
git push origin main
```

GitHub Actions will:
- Build and deploy website to S3/CloudFront
- Build Docker image and deploy API to App Runner
- Amplify will auto-deploy portal/comply/finops

## Architecture

```
ifulabs.com (Hostinger DNS)
├── www.ifulabs.com → CloudFront → S3 (static website)
├── api.ifulabs.com → App Runner (Fastify API)
├── portal.ifulabs.com → Amplify (Next.js SSR)
├── comply.ifulabs.com → Amplify (Next.js SSR)
└── finops.ifulabs.com → Amplify (Next.js SSR)
```

## Deployment Workflows

### Website (Static)
- Trigger: Push to `main` with changes in `website/`
- Process: Build → S3 sync → CloudFront invalidation
- Time: ~2-3 minutes

### API (Docker)
- Trigger: Push to `main` with changes in `src/` or `Dockerfile`
- Process: Docker build → ECR push → App Runner deploy
- Time: ~5-7 minutes

### Portal/Comply/Finops (SSR)
- Trigger: Push to `main` (Amplify webhook)
- Process: Amplify builds and deploys automatically
- Time: ~3-5 minutes per app

## Cost Estimate

Monthly costs (approximate):
- S3 + CloudFront: $1-5
- App Runner: $5-25 (1 vCPU, 2GB RAM)
- Amplify: $15 (3 apps × $5)
- ACM: Free
- Total: ~$21-45/month

## Maintenance

### Update Infrastructure
```bash
cd infra
terraform plan -var-file="environments/production.tfvars" ...
terraform apply -var-file="environments/production.tfvars" ...
```

### View Logs
```bash
# API logs
aws logs tail /aws/apprunner/ifulabs-api --follow

# Amplify logs (via AWS Console)
```

### Rollback
```bash
# API: Deploy previous image
aws apprunner update-service \
  --service-arn <service-arn> \
  --source-configuration ImageRepository={ImageIdentifier=<previous-tag>}

# Website: Restore from S3 versioning
aws s3api list-object-versions --bucket ifulabs-website-production
```

## Troubleshooting

### ACM Certificate Stuck in "Pending Validation"
- Verify CNAME records are correct in Hostinger
- DNS propagation can take up to 48 hours (usually 5-10 minutes)
- Check: `dig _xxx.acm-validations.aws.ifulabs.com`

### App Runner Health Check Failing
- Check `/health` endpoint returns 200
- Verify environment variables are set correctly
- Check logs: `aws logs tail /aws/apprunner/ifulabs-api`

### Amplify Build Failing
- Check build logs in AWS Console
- Verify `package.json` scripts exist
- Check environment variables

### GitHub Actions OIDC Errors
- Verify `AWS_ROLE_ARN` secret is set
- Check IAM role trust policy includes your repo
- Ensure OIDC provider thumbprints are current

## Security Notes

- No long-lived AWS credentials in GitHub
- All secrets stored in GitHub Secrets (encrypted)
- S3 buckets are private (CloudFront OAC only)
- HTTPS enforced on all endpoints
- App Runner runs as non-root user

## Support

For issues, check:
1. Terraform outputs: `terraform output`
2. AWS Console logs
3. GitHub Actions logs
4. DNS propagation: `dig <domain>`
 
