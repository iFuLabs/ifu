# Amplify App
resource "aws_amplify_app" "app" {
  name         = var.app_name
  repository   = "https://github.com/${var.github_repo}"
  access_token = var.github_access_token

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

  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  tags = {
    Name        = var.app_name
    Environment = var.environment
  }
}

# Branch
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.app.id
  branch_name = var.github_branch

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
