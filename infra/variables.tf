variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "ifulabs.com"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo)"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "github_access_token" {
  description = "GitHub personal access token (repo scope) so Amplify can install its webhook"
  type        = string
  sensitive   = true
}

# Database
variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

# API secrets
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key for emails"
  type        = string
  sensitive   = true
}

variable "paystack_secret_key" {
  description = "Paystack secret key"
  type        = string
  sensitive   = true
}

variable "paystack_public_key" {
  description = "Paystack public key"
  type        = string
}

# AWS credentials for API (S3, SES)
variable "aws_access_key_id" {
  description = "AWS access key for API service"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret key for API service"
  type        = string
  sensitive   = true
}

# Redis
variable "redis_url" {
  description = "Redis connection URL"
  type        = string
  sensitive   = true
}

# Encryption
variable "encryption_key" {
  description = "AES-256 encryption key (64 hex chars)"
  type        = string
  sensitive   = true
}
