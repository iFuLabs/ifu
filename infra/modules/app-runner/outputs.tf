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
