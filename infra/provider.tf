terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "iFu Labs"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Resolved from the caller's OIDC identity — used so we never hardcode the
# account ID that customers trust for cross-account role assumption.
data "aws_caller_identity" "current" {}
