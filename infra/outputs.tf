output "route53_nameservers" {
  description = "Update the domain registrar (Hostinger) to delegate the apex domain to these nameservers"
  value       = aws_route53_zone.main.name_servers
}

output "website_cloudfront_url" {
  description = "CloudFront distribution URL for website"
  value       = module.website.cloudfront_domain_name
}

output "website_s3_bucket" {
  description = "S3 bucket name for website"
  value       = module.website.s3_bucket_name
}

output "api_url" {
  description = "App Runner service URL"
  value       = module.api.service_url
}

output "portal_url" {
  description = "Amplify app URL for portal"
  value       = module.portal.default_domain
}

output "comply_url" {
  description = "Amplify app URL for comply"
  value       = module.comply.default_domain
}

output "finops_url" {
  description = "Amplify app URL for finops"
  value       = module.finops.default_domain
}

output "github_oidc_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC"
  value       = module.iam.github_actions_role_arn
}
