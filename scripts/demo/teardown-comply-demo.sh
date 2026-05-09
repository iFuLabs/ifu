#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .ifu-comply-state.json ]; then
  echo "No .ifu-comply-state.json found. Nothing to tear down."; exit 1
fi

REGION=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['region'])")
TRAIL_BUCKET=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['trailBucket'])")
ENC_BUCKET=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['encryptedBucket'])")
UNENC_BUCKET=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['unencryptedBucket'])")
FAIL_USER=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['failUser'])")
SG_ID=$(python3 -c "import json;print(json.load(open('.ifu-comply-state.json'))['sgId'])")

echo "==> Stopping CloudTrail"
aws cloudtrail stop-logging --name "ifu-demo-trail" --region "$REGION" || true
aws cloudtrail delete-trail --name "ifu-demo-trail" --region "$REGION" || true

echo "==> Emptying + deleting buckets"
for B in "$TRAIL_BUCKET" "$ENC_BUCKET" "$UNENC_BUCKET"; do
  aws s3 rm "s3://$B" --recursive || true
  aws s3api delete-bucket --bucket "$B" --region "$REGION" || true
done

echo "==> Deleting security group"
aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION" || true

echo "==> Deleting IAM user"
aws iam delete-user --user-name "$FAIL_USER" || true

echo "==> Removing password policy"
aws iam delete-account-password-policy || true

rm -f .ifu-comply-state.json
echo "==> Teardown complete."
