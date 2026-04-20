variable "service_name" {
  description = "Name of the App Runner service"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the service"
  type        = map(string)
  default     = {}
}

variable "image_tag" {
  description = "ECR image tag App Runner points at. On first apply this must exist — seed a bootstrap image or run the Deploy API workflow manually once before running terraform apply."
  type        = string
  default     = "latest"
}

variable "cpu" {
  description = "App Runner CPU (e.g. 256, 512, 1024, 2048, 4096)"
  type        = string
  default     = "1024"
}

variable "memory" {
  description = "App Runner memory in MB"
  type        = string
  default     = "2048"
}

variable "instance_role_policy_arns" {
  description = "IAM policy ARNs attached to the App Runner instance role (what the running API can call in AWS — Bedrock, Cost Explorer, SES, etc.)"
  type        = list(string)
  default     = []
}
