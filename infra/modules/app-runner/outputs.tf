output "service_url" {
  description = "URL of the App Runner service"
  value       = aws_apprunner_service.api.service_url
}

output "service_arn" {
  description = "ARN of the App Runner service"
  value       = aws_apprunner_service.api.arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.api.repository_url
}

output "custom_domain_dns_target" {
  description = "App Runner DNS target for the custom domain CNAME"
  value       = aws_apprunner_custom_domain_association.api.dns_target
}

output "custom_domain_validation_records" {
  description = "Certificate validation CNAME records for the custom domain"
  value       = aws_apprunner_custom_domain_association.api.certificate_validation_records
}
