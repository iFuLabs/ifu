# ECR Repository for API
resource "aws_ecr_repository" "api" {
  name                 = var.service_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Lifecycle policy: keep last 10 images
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# Role assumed by App Runner build/pull from ECR
resource "aws_iam_role" "apprunner_ecr" {
  name = "${var.service_name}-apprunner-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Instance role assumed by the running container — use this instead of
# static AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in env vars.
resource "aws_iam_role" "apprunner_instance" {
  name = "${var.service_name}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_instance" {
  for_each   = toset(var.instance_role_policy_arns)
  role       = aws_iam_role.apprunner_instance.name
  policy_arn = each.value
}

# Cap scaling to keep bills predictable on low traffic
resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = "${var.service_name}-asc"

  max_concurrency = 100
  min_size        = 1
  max_size        = 3
}

# App Runner Service
resource "aws_apprunner_service" "api" {
  service_name = var.service_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port                          = "3000"
        runtime_environment_variables = var.environment_variables
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.api.arn

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  # CI pipeline is the source of truth for image updates — don't re-diff on every apply.
  lifecycle {
    ignore_changes = [source_configuration[0].image_repository[0].image_identifier]
  }

  tags = {
    Name        = var.service_name
    Environment = var.environment
  }
}

# Custom Domain Association
resource "aws_apprunner_custom_domain_association" "api" {
  domain_name = var.domain_name
  service_arn = aws_apprunner_service.api.arn
}
