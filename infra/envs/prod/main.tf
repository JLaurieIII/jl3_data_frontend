# =============================================================================
# MAIN INFRASTRUCTURE - AWS STATIC SITE HOSTING STACK
# =============================================================================
# This file defines all AWS resources for a production-grade static site:
#
# ARCHITECTURE OVERVIEW:
#   User Request → Route53 → CloudFront → S3 (via OAC)
#
# SECURITY MODEL:
#   - S3 bucket is completely private (Block Public Access ON)
#   - CloudFront uses Origin Access Control (OAC) to access S3
#   - All traffic is HTTPS-only (HTTP redirects to HTTPS)
#   - No public S3 bucket policies or ACLs
#
# DNS DELEGATION:
#   After applying this configuration, you must manually update Namecheap
#   nameservers with the Route53 NS records output by this configuration.
#
# =============================================================================

# -----------------------------------------------------------------------------
# DATA SOURCES
# -----------------------------------------------------------------------------

# Get current AWS account ID for constructing ARNs
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}

# =============================================================================
# S3 BUCKET - STATIC CONTENT STORAGE
# =============================================================================
# The S3 bucket stores all static website files (HTML, CSS, JS, images, etc.)
# It is configured as a private bucket with NO public access.
# CloudFront accesses it via Origin Access Control (OAC).
# =============================================================================

# -----------------------------------------------------------------------------
# Primary S3 Bucket
# -----------------------------------------------------------------------------
# NAMING: Uses domain name for easy identification
# NOTE: S3 bucket names are globally unique; if this fails, the name is taken
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "static_site" {
  bucket = var.domain_name

  # force_destroy allows bucket deletion when not empty (for dev/testing)
  # Set to false in production to prevent accidental data loss
  force_destroy = var.s3_force_destroy

  tags = {
    Name = "${var.project_name}-static-content"
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket Versioning
# -----------------------------------------------------------------------------
# Enables object versioning for:
#   - Accidental deletion protection
#   - Easy rollback to previous versions
#   - Audit trail of changes
# COST NOTE: Versioning increases storage costs; implement lifecycle rules
# for old versions if cost is a concern.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_versioning" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  versioning_configuration {
    status = "Enabled"
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket Server-Side Encryption (SSE)
# -----------------------------------------------------------------------------
# Encrypts all objects at rest with SSE-S3 (AES256).
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_server_side_encryption_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# -----------------------------------------------------------------------------
# S3 Lifecycle Policy - control version sprawl and cleanup multipart uploads
# -----------------------------------------------------------------------------
# - Expire noncurrent versions after 90 days to control storage costs
# - Abort incomplete multipart uploads after 7 days
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_lifecycle_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    id     = "cleanup-noncurrent"
    status = "Enabled"

    # Apply to all objects
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.static_site]
}

# -----------------------------------------------------------------------------
# S3 Bucket Ownership Controls
# -----------------------------------------------------------------------------
# Enforces bucket owner ownership for all objects.
# This is required when Block Public Access is enabled and ensures
# consistent permissions model. ACLs are disabled with this setting.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_ownership_controls" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  rule {
    # BucketOwnerEnforced disables ACLs; bucket owner owns all objects
    # This is the recommended setting for new buckets (AWS default as of 2023)
    object_ownership = "BucketOwnerEnforced"
  }
}

# -----------------------------------------------------------------------------
# S3 Block Public Access
# -----------------------------------------------------------------------------
# Enables ALL four Block Public Access settings to ensure the bucket
# cannot be made public through any means. This is critical for security
# when using CloudFront OAC as the only access path.
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_public_access_block" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  # Block public ACLs from being set on objects
  block_public_acls = true

  # Block public bucket policies
  block_public_policy = true

  # Ignore any public ACLs that might exist
  ignore_public_acls = true

  # Restrict public bucket policies (prevents cross-account public access)
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# S3 Bucket Policy - CloudFront OAC Access Only
# -----------------------------------------------------------------------------
# This policy grants read access ONLY to the specific CloudFront distribution
# using the distribution ARN as the SourceArn condition. This is more secure
# than OAI as it:
#   - Uses standard IAM policy conditions
#   - Ties access to a specific distribution ARN
#   - Follows AWS-recommended best practices (OAI is deprecated)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  # Ensure public access block is in place before applying policy
  depends_on = [aws_s3_bucket_public_access_block.static_site]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            # SourceArn ensures only THIS specific CloudFront distribution can access
            # This is the key security control - not just any CloudFront distribution
            "AWS:SourceArn"     = aws_cloudfront_distribution.static_site.arn
            # SourceAccount adds defense-in-depth against cross-account misuse
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# =============================================================================
# ROUTE53 HOSTED ZONE - DNS MANAGEMENT
# =============================================================================
# Creates a public hosted zone for the domain. After creation, you must
# update your domain registrar (Namecheap) with the NS records output
# by this configuration to delegate DNS authority to Route53.
# =============================================================================

resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed by Terraform - ${var.project_name}"

  tags = {
    Name = "${var.project_name}-hosted-zone"
  }
}

# =============================================================================
# ACM CERTIFICATE - SSL/TLS
# =============================================================================
# Creates an SSL certificate for HTTPS. CRITICAL: Must be in us-east-1
# for CloudFront compatibility. Uses DNS validation via Route53.
# =============================================================================

# -----------------------------------------------------------------------------
# ACM Certificate Request
# -----------------------------------------------------------------------------
# Requests a certificate for both root domain and www subdomain.
# Uses DNS validation (recommended over email validation for automation).
# -----------------------------------------------------------------------------
resource "aws_acm_certificate" "static_site" {
  # CRITICAL: CloudFront requires certificates in us-east-1
  provider = aws.us_east_1

  domain_name = var.domain_name

  # Subject Alternative Names (SANs) - additional domains on same cert
  subject_alternative_names = [
    "www.${var.domain_name}"
  ]

  # DNS validation creates CNAME records to prove domain ownership
  # This is automatable (unlike email validation) and recommended
  validation_method = "DNS"

  # Create new cert before destroying old one during replacement
  # Prevents downtime during certificate renewal/changes
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-certificate"
  }
}

# -----------------------------------------------------------------------------
# Route53 DNS Validation Records
# -----------------------------------------------------------------------------
# Creates the CNAME records required for ACM DNS validation.
# ACM checks these records to verify domain ownership.
# Uses for_each to handle multiple domains (root + www).
# -----------------------------------------------------------------------------
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.static_site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

# -----------------------------------------------------------------------------
# ACM Certificate Validation
# -----------------------------------------------------------------------------
# Waits for ACM to validate the certificate via DNS records.
# This resource blocks until validation completes (usually 5-30 minutes).
# CloudFront distribution depends on this to ensure valid cert.
# -----------------------------------------------------------------------------
resource "aws_acm_certificate_validation" "static_site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.static_site.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# =============================================================================
# CLOUDFRONT DISTRIBUTION - CDN & EDGE CACHING
# =============================================================================
# CloudFront provides:
#   - Global edge caching for low latency
#   - HTTPS termination
#   - DDoS protection (AWS Shield Standard)
#   - HTTP to HTTPS redirect
#   - Custom error pages
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control (OAC)
# -----------------------------------------------------------------------------
# OAC is the modern replacement for Origin Access Identity (OAI).
# It uses IAM-based signing to authenticate requests to S3.
# Benefits over OAI:
#   - Supports all S3 features (including SSE-KMS)
#   - Uses standard AWS Signature Version 4
#   - More secure and maintainable
# -----------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "static_site" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.domain_name} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CloudFront Distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "static_site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} - ${var.domain_name}"
  default_root_object = var.cloudfront_default_root_object
  price_class         = var.cloudfront_price_class

  # Domains this distribution responds to
  aliases = [
    var.domain_name,
    "www.${var.domain_name}"
  ]

  # ---------------------------------------------------------------------------
  # Origin Configuration - S3 Bucket
  # ---------------------------------------------------------------------------
  origin {
    # Use the S3 bucket's regional domain name (not the website endpoint)
    # Format: bucket-name.s3.region.amazonaws.com
    domain_name = aws_s3_bucket.static_site.bucket_regional_domain_name
    origin_id   = "S3-${var.domain_name}"

    # Associate the OAC with this origin
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site.id

    # CloudFront requires one of s3_origin_config/custom_origin_config.
    # OAC handles auth, so OAI stays empty.
    s3_origin_config {
      origin_access_identity = ""
    }
  }

  # ---------------------------------------------------------------------------
  # Default Cache Behavior
  # ---------------------------------------------------------------------------
  default_cache_behavior {
    target_origin_id       = "S3-${var.domain_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Cache key settings - minimal forwarding for maximum cache efficiency
    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    # TTL settings (in seconds)
    min_ttl     = var.cloudfront_min_ttl
    default_ttl = var.cloudfront_default_ttl
    max_ttl     = var.cloudfront_max_ttl
  }

  # ---------------------------------------------------------------------------
  # Custom Error Response - 404 Page
  # ---------------------------------------------------------------------------
  # When S3 returns 404, serve custom error page instead
  # Response code 404 ensures browsers handle it as a real 404
  custom_error_response {
    error_code            = 404
    error_caching_min_ttl = 300
    response_code         = 404
    response_page_path    = var.cloudfront_error_page_path
  }

  # ---------------------------------------------------------------------------
  # Custom Error Response - 403 to 404 Mapping
  # ---------------------------------------------------------------------------
  # S3 returns 403 for non-existent objects when using OAC (access denied)
  # Map this to 404 for better user experience
  custom_error_response {
    error_code            = 403
    error_caching_min_ttl = 300
    response_code         = 404
    response_page_path    = var.cloudfront_error_page_path
  }

  # ---------------------------------------------------------------------------
  # SSL/TLS Configuration
  # ---------------------------------------------------------------------------
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.static_site.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # ---------------------------------------------------------------------------
  # Geo Restrictions
  # ---------------------------------------------------------------------------
  # No geographic restrictions - site accessible globally
  # Modify if you need to restrict access to specific countries
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Wait for certificate validation before creating distribution
  depends_on = [aws_acm_certificate_validation.static_site]

  tags = {
    Name = "${var.project_name}-distribution"
  }
}

# =============================================================================
# ROUTE53 DNS RECORDS - DOMAIN ROUTING
# =============================================================================
# Creates A and AAAA (IPv6) records pointing to CloudFront.
# Uses alias records (AWS-specific) for efficient routing without TTL.
# =============================================================================

# -----------------------------------------------------------------------------
# Root Domain A Record (IPv4)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "root_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# Root Domain AAAA Record (IPv6)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "root_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# WWW Subdomain A Record (IPv4)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------
# WWW Subdomain AAAA Record (IPv6)
# -----------------------------------------------------------------------------
resource "aws_route53_record" "www_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.static_site.domain_name
    zone_id                = aws_cloudfront_distribution.static_site.hosted_zone_id
    evaluate_target_health = false
  }
}
