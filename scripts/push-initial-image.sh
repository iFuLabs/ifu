#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Pushing initial Docker image to ECR...${NC}"

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="385936845264"
ECR_REPOSITORY="ifulabs-api"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Login to ECR
echo -e "${YELLOW}📝 Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${ECR_REPOSITORY}:latest .

# Tag image
echo -e "${YELLOW}🏷️  Tagging image...${NC}"
docker tag ${ECR_REPOSITORY}:latest ${ECR_URI}:latest
docker tag ${ECR_REPOSITORY}:latest ${ECR_URI}:initial

# Push image
echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:initial

echo -e "${GREEN}✅ Successfully pushed Docker image to ECR!${NC}"
echo -e "${GREEN}   Image URI: ${ECR_URI}:latest${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run Terraform apply again to create the App Runner service"
echo -e "2. Get the App Runner URL from Terraform outputs"
echo -e "3. Add the CNAME record in Hostinger DNS"
