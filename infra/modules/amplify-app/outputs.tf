output "app_id" {
  description = "ID of the Amplify app"
  value       = aws_amplify_app.app.id
}

output "default_domain" {
  description = "Default domain of the Amplify app"
  value       = aws_amplify_app.app.default_domain
}

output "custom_domain" {
  description = "Custom domain of the Amplify app"
  value       = var.domain_name
}
