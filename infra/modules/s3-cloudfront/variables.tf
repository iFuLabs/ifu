variable "domain_name" {
  description = "Domain name for the website"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
