#!/bin/bash
set -e

echo "🚀 iFu Labs Infrastructure Setup"
echo "================================"
echo ""

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not installed"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform not installed"; exit 1; }

echo "✅ Prerequisites check passed"
echo ""

# Create S3 backend
echo "📦 Creating S3 backend for Terraform state..."
aws s3api create-bucket \
  --bucket ifulabs-terraform-state \
  --region us-east-1 2>/dev/null || echo "Bucket already exists"

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

echo "✅ S3 backend created"
echo ""

# Create DynamoDB table
echo "🔒 Creating DynamoDB table for state locking..."
aws dynamodb create-table \
  --table-name ifulabs-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 2>/dev/null || echo "Table already exists"

echo "✅ DynamoDB table created"
echo ""

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update infra/environments/production.tfvars with your GitHub repo"
echo "2. Set environment variables for secrets (DATABASE_URL, JWT_SECRET, etc.)"
echo "3. Run: terraform plan -var-file=environments/production.tfvars ..."
echo "4. Run: terraform apply -var-file=environments/production.tfvars ..."
echo "5. Add DNS records to Hostinger (from terraform output)"
echo "6. Configure GitHub secrets with AWS_ROLE_ARN"
echo ""
echo "See README.md for detailed instructions"
