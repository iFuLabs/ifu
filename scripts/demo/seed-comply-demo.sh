#!/usr/bin/env bash
set -euo pipefail

# Seeds an AWS account with a realistic mix of compliant and non-compliant
# resources for the iFU Comply demo. Free-tier safe. Run teardown after demo.

REGION="${AWS_REGION:-us-east-1}"
SUFFIX="ifu-demo-$(date +%s)"
TRAIL_BUCKET="ifu-demo-trail-${SUFFIX}"
ENCRYPTED_BUCKET="ifu-demo-encrypted-${SUFFIX}"
UNENCRYPTED_BUCKET="ifu-demo-unencrypted-${SUFFIX}"
FAIL_USER="ifu-demo-nomfa-user"
SG_OPEN_NAME="ifu-demo-open-sg"

echo "==> Region: $REGION   Suffix: $SUFFIX"

############################################
# IAM — Pass: strong password policy
############################################
echo "==> Setting strong IAM password policy (PASS for CC6.2)"
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols --require-numbers \
  --require-uppercase-characters --require-lowercase-characters \
  --max-password-age 90 \
  --password-reuse-prevention 24 || true

############################################
# IAM — Fail: user without MFA
############################################
echo "==> Creating IAM user without MFA (FAIL for CC6.1)"
aws iam create-user --user-name "$FAIL_USER" || true

############################################
# S3 — Pass: encrypted + versioned + public-access blocked
############################################
echo "==> Creating compliant S3 bucket (PASS)"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$ENCRYPTED_BUCKET" --region "$REGION"
else
  aws s3api create-bucket --bucket "$ENCRYPTED_BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

aws s3api put-bucket-encryption --bucket "$ENCRYPTED_BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-bucket-versioning --bucket "$ENCRYPTED_BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-public-access-block --bucket "$ENCRYPTED_BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

############################################
# S3 — Fail: unencrypted, no versioning
############################################
echo "==> Creating non-compliant S3 bucket (FAIL)"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$UNENCRYPTED_BUCKET" --region "$REGION"
else
  aws s3api create-bucket --bucket "$UNENCRYPTED_BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi
# Leave default — no encryption, no versioning, no public-access block

############################################
# CloudTrail — Pass: multi-region trail
############################################
echo "==> Creating CloudTrail (PASS for audit logging)"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$TRAIL_BUCKET" --region "$REGION"
else
  aws s3api create-bucket --bucket "$TRAIL_BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws s3api put-bucket-policy --bucket "$TRAIL_BUCKET" --policy "$(cat <<EOF
{
  "Version":"2012-10-17",
  "Statement":[
    {"Sid":"AWSCloudTrailAclCheck","Effect":"Allow","Principal":{"Service":"cloudtrail.amazonaws.com"},"Action":"s3:GetBucketAcl","Resource":"arn:aws:s3:::${TRAIL_BUCKET}"},
    {"Sid":"AWSCloudTrailWrite","Effect":"Allow","Principal":{"Service":"cloudtrail.amazonaws.com"},"Action":"s3:PutObject","Resource":"arn:aws:s3:::${TRAIL_BUCKET}/AWSLogs/${ACCOUNT_ID}/*","Condition":{"StringEquals":{"s3:x-amz-acl":"bucket-owner-full-control"}}}
  ]
}
EOF
)"

aws cloudtrail create-trail --name "ifu-demo-trail" \
  --s3-bucket-name "$TRAIL_BUCKET" \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --region "$REGION" || true

aws cloudtrail start-logging --name "ifu-demo-trail" --region "$REGION" || true

############################################
# EC2 — Fail: security group open to 0.0.0.0/0:22
############################################
echo "==> Creating security group with open SSH (FAIL)"
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION")

SG_ID=$(aws ec2 create-security-group \
  --group-name "$SG_OPEN_NAME" \
  --description "iFU demo open SG (FAIL)" \
  --vpc-id "$DEFAULT_VPC" \
  --query GroupId --output text --region "$REGION")

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 \
  --region "$REGION" || true

############################################
# Save state for teardown
############################################
cat > .ifu-comply-state.json <<EOF
{
  "region": "$REGION",
  "suffix": "$SUFFIX",
  "trailBucket": "$TRAIL_BUCKET",
  "encryptedBucket": "$ENCRYPTED_BUCKET",
  "unencryptedBucket": "$UNENCRYPTED_BUCKET",
  "failUser": "$FAIL_USER",
  "sgId": "$SG_ID",
  "sgName": "$SG_OPEN_NAME"
}
EOF

echo
echo "==> Done. Comply demo data seeded."
echo "==> Connect this AWS account to iFU Comply and run a scan."
echo "==> Expected dashboard: ~5 PASS, ~4 FAIL — realistic mix."
echo "==> State saved to .ifu-comply-state.json for teardown."
