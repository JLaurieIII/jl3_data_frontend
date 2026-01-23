# Deployment Guide

## Overview

This document describes the workflow for deploying the JL3 Data Engineering Consulting website from development to production.

## Architecture

- **Hosting**: AWS S3 (static site hosting)
- **CDN**: AWS CloudFront
- **DNS**: AWS Route53
- **SSL**: AWS Certificate Manager (ACM)
- **Domain**: jamesjlaurieiii.com

## Environments

### Local Development
- **URL**: http://localhost:8000
- **Purpose**: Local testing and content changes
- **Command**: `cd public && python -m http.server 8000`

### Production
- **URL**: https://jamesjlaurieiii.com
- **S3 Bucket**: jamesjlaurieiii.com
- **CloudFront Distribution ID**: EONN2KZRY6530
- **Managed by**: Terraform (infra/envs/prod/)

## Workflow: Dev to Prod

### Step 1: Make Changes Locally

```bash
# Start local server
cd public && python -m http.server 8000

# View at http://localhost:8000
# Make your changes to HTML/CSS/JS files
# Test thoroughly in your browser
```

### Step 2: Test Your Changes

- Check all modified pages in browser
- Test navigation between pages
- Verify responsive design (mobile/tablet/desktop)
- Test links (Calendly, email, social links)
- Check browser console for errors

### Step 3: Commit to Git

```bash
# Stage your changes
git add -A

# Commit with descriptive message
git commit -m "Description of changes

More details if needed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Push to remote (if you have a remote configured)
git push origin main
```

### Step 4: Deploy to Production

```bash
# From project root, run the deployment script
./infra/deploy_s3_cloudfront.sh

# This will:
# 1. Sync files to S3 with proper cache headers
# 2. Invalidate CloudFront cache for HTML files
# 3. Your changes go live in ~1-2 minutes
```

### Step 5: Verify Production

```bash
# Wait 1-2 minutes for CloudFront invalidation
# Then visit your live site
open https://jamesjlaurieiii.com

# Clear browser cache if you see old content
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Deployment Script Details

The `infra/deploy_s3_cloudfront.sh` script:

- **HTML files**: Short cache (5 min) - changes frequently
- **CSS/JS files**: Long cache (1 year) - versioned assets
- **Images**: Long cache (1 year) - static content
- **Sitemap/robots.txt**: Medium cache (24 hours)

After upload, it invalidates CloudFront cache for HTML files so changes are visible immediately.

## Configuration

The deployment script requires `infra/aws_config.env` with these values:

```bash
S3_BUCKET=jamesjlaurieiii.com
CLOUDFRONT_DISTRIBUTION_ID=EONN2KZRY6530
DOMAIN=jamesjlaurieiii.com
AWS_PROFILE=default  # or your AWS CLI profile name
AWS_REGION=us-east-1
```

These values come from your Terraform deployment (see `infra/envs/prod/terraform.tfstate`).

## Infrastructure Management

Infrastructure is managed with Terraform in `infra/envs/prod/`:

```bash
# To view current infrastructure
cd infra/envs/prod
terraform show

# To make infrastructure changes (DNS, SSL, CDN config)
terraform plan
terraform apply

# DON'T destroy unless you're sure!
# terraform destroy
```

## Quick Reference Commands

```bash
# Local development
cd public && python -m http.server 8000

# Deploy to production
./infra/deploy_s3_cloudfront.sh

# Manually invalidate CloudFront (if needed)
aws cloudfront create-invalidation \
  --distribution-id EONN2KZRY6530 \
  --paths "/*"

# Sync specific file to S3
aws s3 cp public/index.html s3://jamesjlaurieiii.com/index.html

# Check S3 bucket contents
aws s3 ls s3://jamesjlaurieiii.com/ --recursive

# Check DNS
dig jamesjlaurieiii.com
dig www.jamesjlaurieiii.com
```

## Troubleshooting

### Changes not visible after deployment?

1. Wait 1-2 minutes for CloudFront invalidation
2. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
3. Check CloudFront invalidation status:
   ```bash
   aws cloudfront list-invalidations --distribution-id EONN2KZRY6530
   ```
4. Try incognito/private browser window
5. Check S3 directly: https://jamesjlaurieiii.com.s3.amazonaws.com/index.html

### AWS credentials not working?

```bash
# Check your AWS configuration
aws sts get-caller-identity

# Configure AWS CLI if needed
aws configure

# Or use a specific profile
export AWS_PROFILE=your-profile-name
```

### Deployment script fails?

1. Ensure `infra/aws_config.env` exists and has correct values
2. Verify AWS credentials are configured
3. Check you have S3 and CloudFront permissions
4. Run with bash explicitly: `bash infra/deploy_s3_cloudfront.sh`

## Best Practices

1. **Always test locally first** - Never deploy untested changes
2. **Commit before deploying** - Git is your backup
3. **Descriptive commit messages** - Explain what and why
4. **Deploy during low traffic** - Early morning or late evening
5. **Check after deploy** - Verify changes on live site
6. **Keep backups** - Git history + S3 versioning enabled
7. **Small, frequent deploys** - Easier to debug issues

## Cost Tracking

Your current infrastructure costs (approximate):
- **S3 storage**: ~$0.50/month (for small site)
- **CloudFront**: ~$1-5/month (depends on traffic)
- **Route53 hosted zone**: $0.50/month
- **Total**: ~$2-6/month for low traffic

The infrastructure is designed to scale automatically with traffic.

## Emergency Rollback

If you deploy something broken:

```bash
# Find the commit before your bad deploy
git log --oneline

# Roll back to previous commit
git revert HEAD
# or
git reset --hard <previous-commit-sha>

# Re-deploy immediately
./infra/deploy_s3_cloudfront.sh
```

## Future Enhancements

Consider adding:
- GitHub Actions for automated deployment on push
- Staging environment for testing
- Automated testing (link checking, HTML validation)
- Analytics integration (Plausible or Google Analytics)
- Contact form backend (currently using Calendly + email)
