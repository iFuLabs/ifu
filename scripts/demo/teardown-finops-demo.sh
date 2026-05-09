#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .ifu-finops-state.json ]; then
  echo "No .ifu-finops-state.json found. Nothing to tear down."; exit 1
fi

REGION=$(python3 -c "import json;print(json.load(open('.ifu-finops-state.json'))['region'])")

echo "==> Deleting EBS volumes"
for V in $(python3 -c "import json;print(' '.join(json.load(open('.ifu-finops-state.json'))['volumeIds']))"); do
  aws ec2 delete-volume --volume-id "$V" --region "$REGION" || true
done

echo "==> Releasing Elastic IPs"
for A in $(python3 -c "import json;print(' '.join(json.load(open('.ifu-finops-state.json'))['eipAllocations']))"); do
  aws ec2 release-address --allocation-id "$A" --region "$REGION" || true
done

ALB_ARN=$(python3 -c "import json;print(json.load(open('.ifu-finops-state.json'))['albArn'])")
TG_ARN=$(python3 -c "import json;print(json.load(open('.ifu-finops-state.json'))['tgArn'])")
SG_ID=$(python3 -c "import json;print(json.load(open('.ifu-finops-state.json'))['sgId'])")

if [ -n "$ALB_ARN" ]; then
  echo "==> Deleting ALB"
  aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN" --region "$REGION" || true
  echo "    waiting 30s for ALB to release SG..."
  sleep 30
  aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$REGION" || true
  aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION" || true
fi

rm -f .ifu-finops-state.json
echo "==> Teardown complete."
