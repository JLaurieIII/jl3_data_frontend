# =============================================================================
# ANALYTICS PIPELINE VARIABLES
# =============================================================================
# Variables for the real-time analytics pipeline.
#
# COST CONTROL:
# The main cost toggle is `kinesis_stream_enabled`:
#   - true:  Full pipeline active (~$11-15/month for Kinesis + Firehose)
#   - false: Lambda + S3 only, Kinesis destroyed (~$1/month)
#
# USAGE:
#   # Enable full pipeline (for demos/production)
#   terraform apply -var="kinesis_stream_enabled=true"
#
#   # Disable expensive parts (for development/idle periods)
#   terraform apply -var="kinesis_stream_enabled=false"
# =============================================================================

# -----------------------------------------------------------------------------
# Cost Toggle: Kinesis Stream Enabled
# -----------------------------------------------------------------------------
# When false:
#   - Kinesis Data Streams is NOT created
#   - Kinesis Firehose is NOT created
#   - Lambda logs events to CloudWatch only
#   - S3 bucket still exists (for future use)
#   - API Gateway + Lambda still work (for testing)
#
# When true:
#   - Full pipeline: API → Lambda → Kinesis → Firehose → S3
# -----------------------------------------------------------------------------
variable "kinesis_stream_enabled" {
  description = "Enable Kinesis Data Streams (costs ~$11/month). Set to false to disable expensive streaming."
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Analytics S3 Bucket Name
# -----------------------------------------------------------------------------
variable "analytics_bucket_name" {
  description = "Name of the S3 bucket for analytics data storage"
  type        = string
  default     = "jl3-static-site-analytics-data"
}

# -----------------------------------------------------------------------------
# Analytics Data Retention
# -----------------------------------------------------------------------------
variable "analytics_retention_days" {
  description = "Number of days to retain analytics data in S3 before expiration"
  type        = number
  default     = 90
}

# -----------------------------------------------------------------------------
# Kinesis Stream Configuration
# -----------------------------------------------------------------------------
variable "kinesis_shard_count" {
  description = "Number of shards for Kinesis Data Streams (1 shard = ~$11/month)"
  type        = number
  default     = 1
}

variable "kinesis_retention_hours" {
  description = "Hours to retain data in Kinesis stream (24-8760)"
  type        = number
  default     = 24
}

# -----------------------------------------------------------------------------
# Firehose Buffer Configuration
# -----------------------------------------------------------------------------
variable "firehose_buffer_size_mb" {
  description = "Buffer size in MB before Firehose delivers to S3 (1-128)"
  type        = number
  default     = 128
}

variable "firehose_buffer_interval_seconds" {
  description = "Buffer interval in seconds before Firehose delivers to S3 (60-900)"
  type        = number
  default     = 300
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
variable "analytics_allowed_origins" {
  description = "Comma-separated list of allowed origins for CORS"
  type        = string
  default     = "https://jamesjlaurieiii.com,https://www.jamesjlaurieiii.com"
}
