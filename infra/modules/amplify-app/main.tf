# Amplify App - Next.js SSR with WEB_COMPUTE platform
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
  EOT
  
  platform = "WEB_COMPUTE"

  environment_variables = var.environment_variables

  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/404"
  }
  
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  tags = {
    Name        = var.app_name
    Environment = var.environment
  }
}

# Branch
resource "aws_amplify_branch" "branch" {
  app_id      = aws_amplify_app.app.id
  branch_name = var.github_branch

  enable_auto_build = true

  environment_variables = var.environment_variables
}

# Custom Domain - Commented out since domain is managed on Hostinger
# You'll need to manually add CNAME records in Hostinger DNS pointing to the Amplify URL
# resource "aws_amplify_domain_association" "app" {
#   app_id      = aws_amplify_app.app.id
#   domain_name = var.domain_name
#
#   sub_domain {
#     branch_name = aws_amplify_branch.main.branch_name
#     prefix      = ""
#   }
#
#   wait_for_verification = false
# }
