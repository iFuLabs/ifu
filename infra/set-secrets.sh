#!/bin/bash
# Helper script to set Terraform variables from your .env file
# Usage: source infra/set-secrets.sh

# Load from parent .env file
if [ -f "../.env" ]; then
  export TF_VAR_database_url="postgresql://neondb_owner:npg_zCdeU9aMF1Qs@ep-falling-cherry-aj1a9209-pooler.c-3.us-east-2.aws.neon.tech/ifu_labs_dev?sslmode=require"
  
  # Generate JWT secret if not set
  if [ -z "$JWT_SECRET" ]; then
    echo "Generating new JWT_SECRET..."
    export TF_VAR_jwt_secret=$(openssl rand -base64 32)
    echo "JWT_SECRET generated. Add this to your .env file:"
    echo "JWT_SECRET=$TF_VAR_jwt_secret"
  else
    export TF_VAR_jwt_secret="$JWT_SECRET"
  fi
  
  export TF_VAR_resend_api_key="re_GCYR1sUC_EgbxZ6yt5nSznKzxc2igtb5k"
  export TF_VAR_paystack_secret_key="sk_test_ecc04cf10ed95cb7bfd5792531fbd052e008d4d5"
  export TF_VAR_paystack_public_key="pk_test_4c86c2b7f1d971fb3c86122577933ce9fd4ee644"
  
  # These need to be set manually
  if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "⚠️  AWS_ACCESS_KEY_ID not set in .env"
  else
    export TF_VAR_aws_access_key_id="$AWS_ACCESS_KEY_ID"
  fi
  
  if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "⚠️  AWS_SECRET_ACCESS_KEY not set in .env"
  else
    export TF_VAR_aws_secret_access_key="$AWS_SECRET_ACCESS_KEY"
  fi
  
  echo "✅ Terraform variables set"
  echo ""
  echo "Ready to run:"
  echo "  terraform apply -var-file=environments/production.tfvars -var='github_repo=your-org/ifu-labs'"
else
  echo "❌ .env file not found in parent directory"
  exit 1
fi
