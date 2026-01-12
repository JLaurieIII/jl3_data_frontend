# =============================================================================
# PROVIDERS CONFIGURATION
# =============================================================================
# This file configures the required Terraform providers for the static site
# hosting stack. Two AWS providers are needed:
#   1. Default provider - for S3, CloudFront, Route53 (can be any region)
#   2. us-east-1 provider - REQUIRED for ACM certificates used with CloudFront
#
# ASSUMPTION: AWS credentials are configured via environment variables,
# AWS CLI profile, or IAM role. No credentials are hardcoded here.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ASSUMPTION: State is managed locally for initial setup.
  # For production, uncomment and configure remote backend:
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "prod/static-site/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

# -----------------------------------------------------------------------------
# Default AWS Provider
# -----------------------------------------------------------------------------
# Used for: S3 bucket, CloudFront distribution, Route53 hosted zone
# Region can be any valid AWS region; us-east-1 chosen for consistency
# -----------------------------------------------------------------------------
provider "aws" {
  region  = var.aws_region
  profile = "terraform-admin"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# AWS Provider for us-east-1 (ACM Certificates)
# -----------------------------------------------------------------------------
# CloudFront distributions REQUIRE ACM certificates to be in us-east-1.
# This is an AWS architectural constraint, not a Terraform limitation.
# All ACM certificate resources must use: provider = aws.us_east_1
# -----------------------------------------------------------------------------
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "terraform-admin"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
