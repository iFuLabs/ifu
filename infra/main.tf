# ── IAM & OIDC ────────────────────────────────────────────────────────────
# GitHub OIDC for secure deployments
module "iam" {
  source = "./modules/iam"

  github_repo = var.github_repo
}

# ── ACM Certificates ───────────────────────────────────────────────────────
module "acm_website" {
  source = "./modules/acm"

  domain_name = "www.${var.domain_name}"
  environment = var.environment
}

module "acm_api" {
  source = "./modules/acm"

  domain_name = "api.${var.domain_name}"
  environment = var.environment
}

module "acm_portal" {
  source = "./modules/acm"

  domain_name = "portal.${var.domain_name}"
  environment = var.environment
}

module "acm_comply" {
  source = "./modules/acm"

  domain_name = "comply.${var.domain_name}"
  environment = var.environment
}

module "acm_finops" {
  source = "./modules/acm"

  domain_name = "finops.${var.domain_name}"
  environment = var.environment
}

# ── S3 + CloudFront (Website) ──────────────────────────────────────────────
module "website" {
  source = "./modules/s3-cloudfront"

  domain_name     = "www.${var.domain_name}"
  certificate_arn = module.acm_website.certificate_arn
  environment     = var.environment
}

# ── App Runner (API) ───────────────────────────────────────────────────────
module "api" {
  source = "./modules/app-runner"

  service_name    = "ifulabs-api"
  domain_name     = "api.${var.domain_name}"
  certificate_arn = module.acm_api.certificate_arn
  github_repo     = var.github_repo
  github_branch   = var.github_branch
  environment     = var.environment

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
    AWS_ACCESS_KEY_ID            = var.aws_access_key_id
    AWS_SECRET_ACCESS_KEY        = var.aws_secret_access_key
    BEDROCK_REGION               = var.aws_region
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
  certificate_arn     = module.acm_portal.certificate_arn
  github_repo         = var.github_repo
  github_branch       = var.github_branch
  github_access_token = var.github_access_token
  root_directory      = "portal"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL     = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL  = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL  = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL  = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL = "https://www.${var.domain_name}"
  }
}

module "comply" {
  source = "./modules/amplify-app"

  app_name            = "ifulabs-comply"
  domain_name         = "comply.${var.domain_name}"
  certificate_arn     = module.acm_comply.certificate_arn
  github_repo         = var.github_repo
  github_branch       = var.github_branch
  github_access_token = var.github_access_token
  root_directory      = "comply"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL     = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL  = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL  = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL  = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL = "https://www.${var.domain_name}"
  }
}

module "finops" {
  source = "./modules/amplify-app"

  app_name            = "ifulabs-finops"
  domain_name         = "finops.${var.domain_name}"
  certificate_arn     = module.acm_finops.certificate_arn
  github_repo         = var.github_repo
  github_branch       = var.github_branch
  github_access_token = var.github_access_token
  root_directory      = "finops"
  environment         = var.environment

  environment_variables = {
    NEXT_PUBLIC_API_URL     = "https://api.${var.domain_name}"
    NEXT_PUBLIC_PORTAL_URL  = "https://portal.${var.domain_name}"
    NEXT_PUBLIC_COMPLY_URL  = "https://comply.${var.domain_name}"
    NEXT_PUBLIC_FINOPS_URL  = "https://finops.${var.domain_name}"
    NEXT_PUBLIC_WEBSITE_URL = "https://www.${var.domain_name}"
  }
}
