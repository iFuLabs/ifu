terraform {
  backend "s3" {
    bucket         = "ifulabs-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ifulabs-terraform-locks"
  }
}
