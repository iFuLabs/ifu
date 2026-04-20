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

# Each is a string formatted "<name> CNAME <value>" — parse in the root module to
# create matching Route 53 records.
output "subdomain_dns_record" {
  description = "Amplify sub_domain DNS record (CNAME pointing custom domain to Amplify)"
  value       = aws_amplify_domain_association.app.sub_domain[*].dns_record
}

output "certificate_verification_dns_record" {
  description = "Amplify certificate verification DNS record"
  value       = aws_amplify_domain_association.app.certificate_verification_dns_record
}
