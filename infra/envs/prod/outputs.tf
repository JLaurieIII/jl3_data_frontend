# =============================================================================
# OUTPUTS
# =============================================================================
# These outputs provide essential information needed after deployment:
#
# CRITICAL - AFTER DEPLOYMENT:
#   1. Copy the nameservers from 'route53_nameservers' output
#   2. Log into Namecheap > Domain > Nameservers
#   3. Select "Custom DNS" and enter all 4 nameservers
#   4. Wait for DNS propagation (can take up to 48 hours, usually faster)
#   5. Verify with: dig NS jameslaurieiii.com
#
# FILE UPLOAD:
#   aws s3 sync ./dist s3://<s3_bucket_name> --delete
#
# CACHE INVALIDATION:
#   aws cloudfront create-invalidation \
#     --distribution-id <cloudfront_distribution_id> \
#     --paths "/*"
# =============================================================================

# -----------------------------------------------------------------------------
# Route53 Nameservers (REQUIRED FOR DNS DELEGATION)
# -----------------------------------------------------------------------------
# These nameservers must be configured at your domain registrar (Namecheap)
# to delegate DNS authority to AWS Route53.
#
# Namecheap Steps:
#   1. Domain List > Manage (next to your domain)
#   2. Nameservers section > Custom DNS
#   3. Enter all 4 nameservers (one per line, without trailing dots)
# -----------------------------------------------------------------------------
output "route53_nameservers" {
  description = "Nameservers to configure at Namecheap for DNS delegation"
  value       = aws_route53_zone.main.name_servers
}

# -----------------------------------------------------------------------------
# CloudFront Distribution ID
# -----------------------------------------------------------------------------
# Used for cache invalidation when deploying new content:
#   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
# -----------------------------------------------------------------------------
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.static_site.id
}

# -----------------------------------------------------------------------------
# CloudFront Domain Name
# -----------------------------------------------------------------------------
# The *.cloudfront.net domain assigned to your distribution.
# Useful for testing before DNS propagation completes.
# Access via: https://<cloudfront_domain_name>
# -----------------------------------------------------------------------------
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name (*.cloudfront.net)"
  value       = aws_cloudfront_distribution.static_site.domain_name
}

# -----------------------------------------------------------------------------
# S3 Bucket Name
# -----------------------------------------------------------------------------
# Name of the S3 bucket where static content should be uploaded:
#   aws s3 sync ./dist s3://<bucket_name> --delete
# -----------------------------------------------------------------------------
output "s3_bucket_name" {
  description = "S3 bucket name for uploading static content"
  value       = aws_s3_bucket.static_site.id
}

# =============================================================================
# ADDITIONAL USEFUL OUTPUTS
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Bucket ARN
# -----------------------------------------------------------------------------
output "s3_bucket_arn" {
  description = "S3 bucket ARN for IAM policy references"
  value       = aws_s3_bucket.static_site.arn
}

# -----------------------------------------------------------------------------
# CloudFront Distribution ARN
# -----------------------------------------------------------------------------
output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.static_site.arn
}

# -----------------------------------------------------------------------------
# ACM Certificate ARN
# -----------------------------------------------------------------------------
output "acm_certificate_arn" {
  description = "ACM certificate ARN (in us-east-1)"
  value       = aws_acm_certificate.static_site.arn
}

# -----------------------------------------------------------------------------
# Route53 Hosted Zone ID
# -----------------------------------------------------------------------------
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

# -----------------------------------------------------------------------------
# Website URLs
# -----------------------------------------------------------------------------
output "website_url" {
  description = "Primary website URL (HTTPS)"
  value       = "https://${var.domain_name}"
}

output "website_url_www" {
  description = "WWW website URL (HTTPS)"
  value       = "https://www.${var.domain_name}"
}

# -----------------------------------------------------------------------------
# Deployment Commands (for reference)
# -----------------------------------------------------------------------------
output "deploy_commands" {
  description = "Helpful commands for deploying content"
  value = {
    sync_content = "aws s3 sync ./dist s3://${aws_s3_bucket.static_site.id} --delete"
    invalidate   = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.static_site.id} --paths '/*'"
    check_dns    = "dig NS ${var.domain_name}"
  }
}

# =============================================================================
# ANALYTICS PIPELINE OUTPUTS
# =============================================================================

# -----------------------------------------------------------------------------
# Analytics API Endpoint
# -----------------------------------------------------------------------------
# The URL for sending analytics events from the browser.
# Use this in analytics.js config.endpoint
# -----------------------------------------------------------------------------
output "analytics_api_endpoint" {
  description = "Analytics API Gateway endpoint URL for browser events"
  value       = "${aws_api_gateway_stage.v1.invoke_url}/events"
}

# -----------------------------------------------------------------------------
# Analytics S3 Bucket
# -----------------------------------------------------------------------------
output "analytics_bucket_name" {
  description = "S3 bucket for analytics data storage"
  value       = aws_s3_bucket.analytics.id
}

output "analytics_bucket_arn" {
  description = "S3 bucket ARN for analytics data"
  value       = aws_s3_bucket.analytics.arn
}

# -----------------------------------------------------------------------------
# Kinesis Stream (conditional)
# -----------------------------------------------------------------------------
output "kinesis_stream_enabled" {
  description = "Whether Kinesis streaming is enabled"
  value       = var.kinesis_stream_enabled
}

output "kinesis_stream_name" {
  description = "Kinesis Data Stream name (empty if disabled)"
  value       = var.kinesis_stream_enabled ? aws_kinesis_stream.analytics[0].name : ""
}

# -----------------------------------------------------------------------------
# Analytics Lambda
# -----------------------------------------------------------------------------
output "analytics_lambda_name" {
  description = "Analytics Lambda function name"
  value       = aws_lambda_function.analytics_ingest.function_name
}

output "analytics_lambda_log_group" {
  description = "CloudWatch log group for analytics Lambda"
  value       = aws_cloudwatch_log_group.analytics_lambda.name
}
