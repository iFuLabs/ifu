variable "domain_name" {
  description = "Primary domain name for the website (used for S3 bucket naming)"
  type        = string
}

variable "aliases" {
  description = "All domain aliases the CloudFront distribution should serve (must all be covered by the ACM cert)"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
