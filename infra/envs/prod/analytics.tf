# =============================================================================
# ANALYTICS PIPELINE
# =============================================================================
# Real-time analytics pipeline with cost controls.
#
# Architecture:
#   Browser → API Gateway → Lambda → Kinesis Data Streams → Firehose → S3
#
# Cost Control:
#   Set kinesis_stream_enabled=false to tear down Kinesis (~$11/mo savings)
#   while keeping Lambda + S3 (~$1/mo).
#
# Data Path in S3:
#   s3://jl3-static-site-analytics-data/raw/year=YYYY/month=MM/day=DD/hour=HH/
# =============================================================================

# =============================================================================
# S3 BUCKET FOR ANALYTICS DATA
# =============================================================================
# Always created (cheap storage). Firehose writes here when enabled.
# Hive-style partitioning for Athena/Snowflake compatibility.

resource "aws_s3_bucket" "analytics" {
  bucket = var.analytics_bucket_name

  tags = {
    Name        = "Analytics Data"
    Environment = "prod"
    Project     = "jl3-analytics"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "analytics" {
  bucket = aws_s3_bucket.analytics.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for data protection
resource "aws_s3_bucket_versioning" "analytics" {
  bucket = aws_s3_bucket.analytics.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "analytics" {
  bucket = aws_s3_bucket.analytics.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle policy - expire old data
resource "aws_s3_bucket_lifecycle_configuration" "analytics" {
  bucket = aws_s3_bucket.analytics.id

  rule {
    id     = "expire-old-data"
    status = "Enabled"

    filter {
      prefix = "raw/"
    }

    expiration {
      days = var.analytics_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "expire-error-data"
    status = "Enabled"

    filter {
      prefix = "errors/"
    }

    expiration {
      days = 30
    }
  }
}

# =============================================================================
# LAMBDA FUNCTION FOR EVENT INGESTION
# =============================================================================

# Package Lambda code
data "archive_file" "analytics_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/analytics_ingest"
  output_path = "${path.module}/../../lambda/analytics_ingest.zip"
}

# Lambda execution role
resource "aws_iam_role" "analytics_lambda" {
  name = "jl3-analytics-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "Analytics Lambda Role"
    Environment = "prod"
  }
}

# Lambda basic execution policy (CloudWatch logs)
resource "aws_iam_role_policy_attachment" "analytics_lambda_basic" {
  role       = aws_iam_role.analytics_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Kinesis write policy (only when enabled)
resource "aws_iam_role_policy" "analytics_lambda_kinesis" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name = "kinesis-write-policy"
  role = aws_iam_role.analytics_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_stream.analytics[0].arn
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "analytics_ingest" {
  filename         = data.archive_file.analytics_lambda.output_path
  function_name    = "jl3-analytics-ingest"
  role             = aws_iam_role.analytics_lambda.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.analytics_lambda.output_base64sha256
  runtime          = "python3.11"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      KINESIS_STREAM_NAME = var.kinesis_stream_enabled ? aws_kinesis_stream.analytics[0].name : ""
      KINESIS_ENABLED     = var.kinesis_stream_enabled ? "true" : "false"
      ALLOWED_ORIGINS     = var.analytics_allowed_origins
    }
  }

  tags = {
    Name        = "Analytics Ingest Lambda"
    Environment = "prod"
  }
}

# CloudWatch log group for Lambda
resource "aws_cloudwatch_log_group" "analytics_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.analytics_ingest.function_name}"
  retention_in_days = 14

  tags = {
    Name        = "Analytics Lambda Logs"
    Environment = "prod"
  }
}

# =============================================================================
# API GATEWAY (REST API)
# =============================================================================

resource "aws_api_gateway_rest_api" "analytics" {
  name        = "jl3-analytics-api"
  description = "Analytics events ingestion API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "Analytics API"
    Environment = "prod"
  }
}

# /events resource
resource "aws_api_gateway_resource" "events" {
  rest_api_id = aws_api_gateway_rest_api.analytics.id
  parent_id   = aws_api_gateway_rest_api.analytics.root_resource_id
  path_part   = "events"
}

# POST /events method
resource "aws_api_gateway_method" "events_post" {
  rest_api_id   = aws_api_gateway_rest_api.analytics.id
  resource_id   = aws_api_gateway_resource.events.id
  http_method   = "POST"
  authorization = "NONE"
}

# POST /events integration with Lambda
resource "aws_api_gateway_integration" "events_post" {
  rest_api_id             = aws_api_gateway_rest_api.analytics.id
  resource_id             = aws_api_gateway_resource.events.id
  http_method             = aws_api_gateway_method.events_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.analytics_ingest.invoke_arn
}

# OPTIONS /events method (CORS preflight)
resource "aws_api_gateway_method" "events_options" {
  rest_api_id   = aws_api_gateway_rest_api.analytics.id
  resource_id   = aws_api_gateway_resource.events.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS /events integration with Lambda (handles CORS)
resource "aws_api_gateway_integration" "events_options" {
  rest_api_id             = aws_api_gateway_rest_api.analytics.id
  resource_id             = aws_api_gateway_resource.events.id
  http_method             = aws_api_gateway_method.events_options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.analytics_ingest.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analytics_ingest.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.analytics.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "analytics" {
  rest_api_id = aws_api_gateway_rest_api.analytics.id

  depends_on = [
    aws_api_gateway_integration.events_post,
    aws_api_gateway_integration.events_options
  ]

  # Force new deployment when resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.events.id,
      aws_api_gateway_method.events_post.id,
      aws_api_gateway_method.events_options.id,
      aws_api_gateway_integration.events_post.id,
      aws_api_gateway_integration.events_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "v1" {
  deployment_id = aws_api_gateway_deployment.analytics.id
  rest_api_id   = aws_api_gateway_rest_api.analytics.id
  stage_name    = "v1"

  tags = {
    Name        = "Analytics API v1"
    Environment = "prod"
  }
}

# =============================================================================
# KINESIS DATA STREAMS (CONDITIONAL - COST TOGGLE)
# =============================================================================
# Only created when kinesis_stream_enabled = true
# Cost: ~$11/month per shard

resource "aws_kinesis_stream" "analytics" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name             = "jl3-analytics-stream"
  shard_count      = var.kinesis_shard_count
  retention_period = var.kinesis_retention_hours

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = {
    Name        = "Analytics Stream"
    Environment = "prod"
  }
}

# =============================================================================
# KINESIS FIREHOSE (CONDITIONAL - COST TOGGLE)
# =============================================================================
# Only created when kinesis_stream_enabled = true
# Reads from Kinesis Data Streams, writes to S3

# Firehose IAM role
resource "aws_iam_role" "firehose" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name = "jl3-analytics-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "Analytics Firehose Role"
    Environment = "prod"
  }
}

# Firehose policy - read from Kinesis, write to S3
resource "aws_iam_role_policy" "firehose" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name = "firehose-delivery-policy"
  role = aws_iam_role.firehose[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.analytics[0].arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.analytics.arn,
          "${aws_s3_bucket.analytics.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch log group for Firehose errors
resource "aws_cloudwatch_log_group" "firehose" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name              = "/aws/kinesisfirehose/jl3-analytics-firehose"
  retention_in_days = 14

  tags = {
    Name        = "Analytics Firehose Logs"
    Environment = "prod"
  }
}

resource "aws_cloudwatch_log_stream" "firehose_s3" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name           = "S3Delivery"
  log_group_name = aws_cloudwatch_log_group.firehose[0].name
}

# Firehose delivery stream
resource "aws_kinesis_firehose_delivery_stream" "analytics" {
  count = var.kinesis_stream_enabled ? 1 : 0

  name        = "jl3-analytics-firehose"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.analytics[0].arn
    role_arn           = aws_iam_role.firehose[0].arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose[0].arn
    bucket_arn = aws_s3_bucket.analytics.arn

    # Buffer configuration
    buffering_size     = var.firehose_buffer_size_mb
    buffering_interval = var.firehose_buffer_interval_seconds

    # Compression
    compression_format = "GZIP"

    # Hive-style partitioning prefix
    prefix              = "raw/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
    error_output_prefix = "errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    # CloudWatch logging
    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose[0].name
      log_stream_name = aws_cloudwatch_log_stream.firehose_s3[0].name
    }
  }

  tags = {
    Name        = "Analytics Firehose"
    Environment = "prod"
  }
}
