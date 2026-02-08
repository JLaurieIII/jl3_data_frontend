# ============================================================================
# GITHUB ACTIONS IAM USER
# ============================================================================
#
# WHAT IS THIS FILE?
# ==================
# This creates an IAM (Identity and Access Management) user specifically
# for GitHub Actions to deploy your website.
#
# WHY A SEPARATE USER?
# ====================
# Your "terraform-admin" user has LOTS of permissions - it can create
# databases, spin up servers, delete everything. That's dangerous.
#
# This user can ONLY:
#   1. Upload files to your specific S3 bucket
#   2. Invalidate your specific CloudFront distribution
#
# If these credentials leak, the attacker can only mess with your static
# site - not your entire AWS account.
#
# SECURITY PRINCIPLE: "Least Privilege"
# =====================================
# Give every user/service the MINIMUM permissions needed to do their job.
# Nothing more.
#
# Football Analogy:
# -----------------
# The water boy gets access to the sideline and locker room.
# He does NOT get the playbook, the team credit card, or keys to the owner's box.
# If the water boy goes rogue, damage is limited.
#
# ============================================================================

# ----------------------------------------------------------------------------
# THE IAM USER
# ----------------------------------------------------------------------------
#
# This creates the "identity" - like creating a new employee badge.
# The badge exists, but has no permissions yet.

resource "aws_iam_user" "github_actions_deploy" {
  name = "github-actions-deploy"
  path = "/automation/"  # Organizes users into folders in AWS console

  tags = {
    Purpose     = "GitHub Actions CI/CD"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# ----------------------------------------------------------------------------
# THE IAM POLICY (The Rulebook)
# ----------------------------------------------------------------------------
#
# A "policy" defines WHAT ACTIONS are allowed on WHICH RESOURCES.
#
# Structure:
#   {
#     "Effect": "Allow" or "Deny"
#     "Action": ["what they can do"]
#     "Resource": ["which things they can do it to"]
#   }
#
# We're creating a CUSTOM policy because AWS's pre-built policies are
# too broad. "AmazonS3FullAccess" would let this user access ALL buckets
# in your account - we only want ONE bucket.

resource "aws_iam_policy" "github_actions_deploy" {
  name        = "GitHubActionsDeployPolicy"
  description = "Allows GitHub Actions to deploy static site to S3 and invalidate CloudFront"

  # The policy document (JSON format)
  policy = jsonencode({
    Version = "2012-10-17"  # This is always "2012-10-17" - it's the policy language version

    Statement = [
      # ------------------------------------------------------------------
      # STATEMENT 1: S3 Bucket-Level Permissions
      # ------------------------------------------------------------------
      # These actions apply to the BUCKET ITSELF, not the objects inside.
      # - ListBucket: See what files exist (needed for sync --delete)
      #
      {
        Sid    = "S3BucketAccess"  # Statement ID - just a label
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::${var.domain_name}"
        # ^^^ ARN = Amazon Resource Name - unique ID for any AWS resource
        # Format: arn:aws:service:region:account:resource
        # For S3 buckets, it's: arn:aws:s3:::bucket-name
      },

      # ------------------------------------------------------------------
      # STATEMENT 2: S3 Object-Level Permissions
      # ------------------------------------------------------------------
      # These actions apply to the FILES inside the bucket.
      # - PutObject: Upload files
      # - DeleteObject: Remove files (needed for sync --delete)
      # - GetObject: Download files (needed for sync to compare)
      #
      {
        Sid    = "S3ObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::${var.domain_name}/*"
        # ^^^ Note the /* at the end - this means "all objects in the bucket"
        # Without /*, you'd only have permission on the bucket itself
      },

      # ------------------------------------------------------------------
      # STATEMENT 3: CloudFront Invalidation Permission
      # ------------------------------------------------------------------
      # This allows creating cache invalidations.
      # We scope it to your specific distribution only.
      #
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.static_site.arn
        # ^^^ We reference the CloudFront distribution created in main.tf
        # This is better than hardcoding - if you recreate the distribution,
        # this automatically points to the new one.
      }
    ]
  })
}

# ----------------------------------------------------------------------------
# ATTACH THE POLICY TO THE USER
# ----------------------------------------------------------------------------
#
# Creating a policy and creating a user are separate.
# This "attachment" links them together.
#
# Analogy: The employee badge (user) exists. The rulebook (policy) exists.
# This step says "this employee must follow this rulebook."

resource "aws_iam_user_policy_attachment" "github_actions_deploy" {
  user       = aws_iam_user.github_actions_deploy.name
  policy_arn = aws_iam_policy.github_actions_deploy.arn
}

# ----------------------------------------------------------------------------
# ACCESS KEYS (The Password)
# ----------------------------------------------------------------------------
#
# IAM users can authenticate in two ways:
#   1. Username + password (for AWS Console login)
#   2. Access Key ID + Secret Access Key (for CLI/API access)
#
# GitHub Actions uses method 2. These are the credentials you'll add
# as secrets in GitHub.
#
# SECURITY WARNING:
# -----------------
# The secret key is shown ONCE when created and stored in Terraform state.
# Your state file is local (not in Git), so this is okay for now.
# In production, you'd use a secrets manager.

resource "aws_iam_access_key" "github_actions_deploy" {
  user = aws_iam_user.github_actions_deploy.name
}

# ----------------------------------------------------------------------------
# OUTPUTS (Show us the credentials)
# ----------------------------------------------------------------------------
#
# After running terraform apply, these values will be printed.
# You'll copy them into GitHub Secrets.
#
# The secret key is marked "sensitive" so Terraform doesn't print it
# directly in logs. You'll need to run a special command to see it.

output "github_actions_access_key_id" {
  description = "Access Key ID for GitHub Actions (add to GitHub Secrets as AWS_ACCESS_KEY_ID)"
  value       = aws_iam_access_key.github_actions_deploy.id
}

output "github_actions_secret_access_key" {
  description = "Secret Access Key for GitHub Actions (add to GitHub Secrets as AWS_SECRET_ACCESS_KEY)"
  value       = aws_iam_access_key.github_actions_deploy.secret
  sensitive   = true  # Won't show in normal output, but stored in state
}

# ============================================================================
# AFTER RUNNING TERRAFORM APPLY
# ============================================================================
#
# 1. Run: terraform apply
#    → Creates the user, policy, and access keys
#
# 2. Get the access key ID:
#    → It will print after apply
#
# 3. Get the secret key (hidden by default):
#    → Run: terraform output -raw github_actions_secret_access_key
#
# 4. Add both to GitHub:
#    → Repo Settings → Secrets → Actions → New repository secret
#    → AWS_ACCESS_KEY_ID = the access key id
#    → AWS_SECRET_ACCESS_KEY = the secret key
#
# 5. Also add:
#    → CLOUDFRONT_DISTRIBUTION_ID = your distribution ID
#
# ============================================================================
