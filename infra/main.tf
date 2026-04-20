# ── IAM & OIDC ────────────────────────────────────────────────────────────
module "iam" {
  source = "./modules/iam"

  github_repo = var.github_repo
}

# ── Route 53 hosted zone ──────────────────────────────────────────────────
# After apply, update the registrar (Hostinger) to point ifulabs.com
# nameservers at the values in the `route53_nameservers` output.
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Environment = var.environment
  }
}

# ── ACM certificates (DNS-validated via Route 53) ─────────────────────────
# One cert covering both apex and www so CloudFront can serve both.
module "acm_website" {
  source = "./modules/acm"

  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  zone_id                   = aws_route53_zone.main.zone_id
  environment               = var.environment
}

# App Runner + Amplify issue and manage their own certs per custom domain —
# only the CloudFront website needs an ACM cert.

# ── S3 + CloudFront (Website) ──────────────────────────────────────────────
module "website" {
  source = "./modules/s3-cloudfront"

  domain_name     = "www.${var.domain_name}"
  aliases         = [var.domain_name, "www.${var.domain_name}"]
  certificate_arn = module.acm_website.certificate_arn
  environment     = var.environment
}

# ── App Runner (API) ───────────────────────────────────────────────────────
module "api" {
  source = "./modules/app-runner"

  service_name = "ifulabs-api"
  domain_name  = "api.${var.domain_name}"
  environment  = var.environment

  # The API calls AWS services (Bedrock, Cost Explorer, CloudWatch, EC2, S3…)
  # via the instance role — no static access keys needed.
  instance_role_policy_arns = var.api_instance_role_policy_arns

  environment_variables = {
    NODE_ENV                     = "production"
    PORT                         = "3000"
    DATABASE_URL                 = var.database_url
    REDIS_URL                    = var.redis_url
    JWT_SECRET                   = var.jwt_secret
    ENCRYPTION_KEY               = var.encryption_key
    RESEND_API_KEY               = var.resend_api_key
    EMAIL_DOMAIN                 = var.domain_name
    REPLY_TO_EMAIL               = "info@${var.domain_name}"
    PAYSTACK_SECRET_KEY          = var.paystack_secret_key
    PAYSTACK_PUBLIC_KEY          = var.paystack_public_key
    PAYSTACK_COMPLY_STARTER_PLAN = "PLN_aso3noim7t5xbhb"
    PAYSTACK_COMPLY_GROWTH_PLAN  = "PLN_vp2ewdsg7qmhx6p"
    PAYSTACK_FINOPS_PLAN         = "PLN_qt95xanjmunr5ds"
    AWS_REGION                   = var.aws_region
    BEDROCK_REGION               = var.aws_region
    AWS_ACCOUNT_ID               = data.aws_caller_identity.current.account_id
    IFU_LABS_AWS_ACCOUNT_ID      = data.aws_caller_identity.current.account_id
    PORTAL_URL                   = "https://portal.${var.domain_name}"
    COMPLY_URL                   = "https://comply.${var.domain_name}"
    FINOPS_URL                   = "https://finops.${var.domain_name}"
    WEBSITE_URL                  = "https://www.${var.domain_name}"
    ALLOWED_ORIGINS              = "https://portal.${var.domain_name},https://comply.${var.domain_name},https://finops.${var.domain_name}"
  }
}

# ── Amplify Apps ───────────────────────────────────────────────────────────
module "portal" {
  source = "./modules/amplify-app"

  app_name            = "ifulabs-portal"
  domain_name         = "portal.${var.domain_name}"
  github_repo         = var.github_repo
  github_access_token = var.github_access_token
  github_branch       = var.github_branch
  root_directory      = "portal"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL        = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL     = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL     = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL     = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL    = "https://www.${var.domain_name}"
    NEXT_PUBLIC_AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
  }
}

module "comply" {
  source = "./modules/amplify-app"

  app_name            = "ifulabs-comply"
  domain_name         = "comply.${var.domain_name}"
  github_repo         = var.github_repo
  github_access_token = var.github_access_token
  github_branch       = var.github_branch
  root_directory      = "comply"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL        = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL     = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL     = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL     = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL    = "https://www.${var.domain_name}"
    NEXT_PUBLIC_AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
  }
}

module "finops" {
  source = "./modules/amplify-app"

  app_name            = "ifulabs-finops"
  domain_name         = "finops.${var.domain_name}"
  github_repo         = var.github_repo
  github_access_token = var.github_access_token
  github_branch       = var.github_branch
  root_directory      = "finops"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL        = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL     = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL     = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL     = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL    = "https://www.${var.domain_name}"
    NEXT_PUBLIC_AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
  }
}

# ── Route 53 DNS records ──────────────────────────────────────────────────

# Apex + www → CloudFront website (alias; no IPs to track).
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.website.cloudfront_domain_name
    zone_id                = module.website.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = module.website.cloudfront_domain_name
    zone_id                = module.website.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.website.cloudfront_domain_name
    zone_id                = module.website.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = module.website.cloudfront_domain_name
    zone_id                = module.website.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# api → App Runner (CNAME + certificate validation CNAMEs).
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [module.api.custom_domain_dns_target]
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for r in module.api.custom_domain_validation_records : r.name => r
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.value]
  allow_overwrite = true
}

# Amplify subdomains (portal/comply/finops). Each Amplify app emits two
# CNAME strings ("<name> CNAME <value>") — one for the subdomain alias and
# one for cert verification. Parse both and create matching records.
locals {
  amplify_apps = {
    portal = module.portal
    comply = module.comply
    finops = module.finops
  }

  # Flatten sub_domain records from every app into {key => {name, value}}
  amplify_subdomain_records = merge([
    for app_key, app in local.amplify_apps : {
      for idx, raw in app.subdomain_dns_record :
      "${app_key}-${idx}" => {
        name  = trimsuffix(split(" ", raw)[0], ".")
        value = trimsuffix(split(" ", raw)[2], ".")
      }
    }
  ]...)

  amplify_cert_records = {
    for app_key, app in local.amplify_apps :
    app_key => {
      name  = trimsuffix(split(" ", app.certificate_verification_dns_record)[0], ".")
      value = trimsuffix(split(" ", app.certificate_verification_dns_record)[2], ".")
    }
    if app.certificate_verification_dns_record != ""
  }
}

resource "aws_route53_record" "amplify_subdomain" {
  for_each = local.amplify_subdomain_records

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = "CNAME"
  ttl             = 300
  records         = [each.value.value]
  allow_overwrite = true
}

resource "aws_route53_record" "amplify_cert" {
  for_each = local.amplify_cert_records

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = "CNAME"
  ttl             = 300
  records         = [each.value.value]
  allow_overwrite = true
}
