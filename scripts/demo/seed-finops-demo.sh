#!/usr/bin/env bash
set -euo pipefail

# Seeds an AWS account with waste resources iFU FinOps will detect.
# Free-tier-light. Tear down within 24h to keep costs under $2.
# Detections triggered: unattached EBS, unused Elastic IPs, idle ALB (optional).

REGION="${AWS_REGION:-us-east-1}"
SUFFIX="ifu-finops-$(date +%s)"

echo "==> Region: $REGION   Suffix: $SUFFIX"

############################################
# Unattached EBS volumes (3, varied sizes)
############################################
echo "==> Creating 3 unattached EBS volumes"
AZ=$(aws ec2 describe-availability-zones --region "$REGION" \
  --query 'AvailabilityZones[0].ZoneName' --output text)

VOL_IDS=()
for SIZE in 10 50 100; do
  VID=$(aws ec2 create-volume \
    --availability-zone "$AZ" \
    --size "$SIZE" --volume-type gp3 \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=ifu-demo-${SUFFIX}-${SIZE}gb}]" \
    --query VolumeId --output text --region "$REGION")
  VOL_IDS+=("$VID")
  echo "    created $VID (${SIZE}GB)"
done

############################################
# Unused Elastic IPs (2)
############################################
echo "==> Allocating 2 unused Elastic IPs"
EIP_ALLOCS=()
for i in 1 2; do
  ALLOC=$(aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=ifu-demo-${SUFFIX}-eip-${i}}]" \
    --query AllocationId --output text --region "$REGION")
  EIP_ALLOCS+=("$ALLOC")
  echo "    allocated $ALLOC"
done

############################################
# Idle ALB (no targets) — optional, $0.54/day
############################################
read -p "==> Create an idle ALB too? Costs ~\$0.54/day (y/N) " ANS
ALB_ARN=""
TG_ARN=""
SG_ID=""
if [[ "$ANS" =~ ^[Yy]$ ]]; then
  echo "==> Creating idle ALB"
  DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
    --query 'Vpcs[0].VpcId' --output text --region "$REGION")
  SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$DEFAULT_VPC" \
    --query 'Subnets[].SubnetId' --output text --region "$REGION")

  SG_ID=$(aws ec2 create-security-group \
    --group-name "ifu-demo-alb-${SUFFIX}" \
    --description "iFU demo idle ALB SG" \
    --vpc-id "$DEFAULT_VPC" \
    --query GroupId --output text --region "$REGION")

  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "ifu-demo-alb-$(date +%s | tail -c 6)" \
    --subnets $SUBNETS \
    --security-groups "$SG_ID" \
    --type application \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text --region "$REGION")

  TG_ARN=$(aws elbv2 create-target-group \
    --name "ifu-demo-tg-$(date +%s | tail -c 6)" \
    --protocol HTTP --port 80 \
    --vpc-id "$DEFAULT_VPC" \
    --query 'TargetGroups[0].TargetGroupArn' --output text --region "$REGION")

  echo "    ALB created (no targets attached → idle)"
fi

############################################
# Save state for teardown
############################################
cat > .ifu-finops-state.json <<EOF
{
  "region": "$REGION",
  "suffix": "$SUFFIX",
  "volumeIds": $(printf '%s\n' "${VOL_IDS[@]}" | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))'),
  "eipAllocations": $(printf '%s\n' "${EIP_ALLOCS[@]}" | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))'),
  "albArn": "$ALB_ARN",
  "tgArn": "$TG_ARN",
  "sgId": "$SG_ID"
}
EOF

echo
echo "==> Done. FinOps demo data seeded."
echo "==> Connect this AWS account to iFU FinOps and run a scan."
if [ -n "$ALB_ARN" ]; then
  echo "==> Expected findings: 3 unattached EBS, 2 unused EIPs, 1 idle ALB."
else
  echo "==> Expected findings: 3 unattached EBS, 2 unused EIPs."
fi
echo "==> Daily cost while running: <\$2."
echo "==> State saved to .ifu-finops-state.json — RUN TEARDOWN AFTER DEMO."
