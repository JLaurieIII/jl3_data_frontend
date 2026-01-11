# =============================================================================
# INPUT VARIABLES
# =============================================================================
# All configurable values for the static site hosting stack.
# Default values are set for the jameslaurieiii.com domain.
#
# USAGE: Override defaults via terraform.tfvars or -var flags:
#   terraform plan -var="domain_name=example.com"
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Project identifier used for resource naming and tagging"
  type        = string
  default     = "jl3-static-site"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "Primary AWS region for resources (S3, CloudFront, Route53)"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = <<-EOT
    Root domain name for the static site (without www prefix).
    DNS authority will be delegated from Namecheap to Route53.
    After terraform apply, update Namecheap nameservers with Route53 NS values.
  EOT
  type        = string
  default     = "jameslaurieiii.com"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid root domain (e.g., example.com)."
  }
}

# -----------------------------------------------------------------------------
# CloudFront Configuration
# -----------------------------------------------------------------------------

variable "cloudfront_price_class" {
  description = <<-EOT
    CloudFront price class determines edge location distribution.
    Options:
      - PriceClass_100: US, Canada, Europe (lowest cost)
      - PriceClass_200: + Asia, Middle East, Africa
      - PriceClass_All: All edge locations (highest performance)
  EOT
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "cloudfront_default_root_object" {
  description = "Default object served when accessing the root URL"
  type        = string
  default     = "index.html"
}

variable "cloudfront_error_page_path" {
  description = "Path to custom 404 error page in S3 bucket"
  type        = string
  default     = "/404.html"
}

variable "cloudfront_min_ttl" {
  description = "Minimum TTL for cached objects (seconds)"
  type        = number
  default     = 0
}

variable "cloudfront_default_ttl" {
  description = "Default TTL for cached objects when no Cache-Control header (seconds)"
  type        = number
  default     = 86400 # 24 hours
}

variable "cloudfront_max_ttl" {
  description = "Maximum TTL for cached objects (seconds)"
  type        = number
  default     = 31536000 # 1 year
}

# -----------------------------------------------------------------------------
# S3 Configuration
# -----------------------------------------------------------------------------

variable "s3_force_destroy" {
  description = <<-EOT
    Allow S3 bucket deletion even when not empty.
    Set to true for dev/testing; false recommended for production.
    WARNING: Setting to true will delete all objects when bucket is destroyed.
  EOT
  type        = bool
  default     = false
}
