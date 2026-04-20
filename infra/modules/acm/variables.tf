variable "domain_name" {
  description = "Primary domain name for the certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional SANs on the certificate"
  type        = list(string)
  default     = []
}

variable "zone_id" {
  description = "Route 53 hosted zone ID to create DNS validation records in"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
