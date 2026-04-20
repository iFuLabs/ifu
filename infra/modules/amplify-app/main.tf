# IAM service role so Amplify can provision the SSR Lambda + CloudWatch logs
resource "aws_iam_role" "amplify_ssr" {
  name = "${var.app_name}-amplify-ssr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "amplify.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "amplify_ssr" {
  role       = aws_iam_role.amplify_ssr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AdministratorAccess-Amplify"
}

# Amplify App (Next.js SSR via WEB_COMPUTE platform)
resource "aws_amplify_app" "app" {
  name                 = var.app_name
  repository           = "https://github.com/${var.github_repo}"
  access_token         = var.github_access_token
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify_ssr.arn

  build_spec = <<-EOT
    version: 1
    applications:
      - appRoot: ${var.root_directory}
        frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: .next
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
              - .next/cache/**/*
  EOT

  environment_variables = var.environment_variables

  tags = {
    Name        = var.app_name
    Environment = var.environment
  }
}

# Branch
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.app.id
  branch_name = var.github_branch
  framework   = "Next.js - SSR"

  enable_auto_build = true

  environment_variables = var.environment_variables
}

# Custom Domain
resource "aws_amplify_domain_association" "app" {
  app_id      = aws_amplify_app.app.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  wait_for_verification = false
}
