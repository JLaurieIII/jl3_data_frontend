# Deployment History

This file tracks all deployments to production (S3 + CloudFront).

## Deployment Format

```
### YYYY-MM-DD HH:MM - [Brief Description]
- **Commit**: [git commit hash]
- **CloudFront Invalidation ID**: [ID]
- **Deployed Files**: [list or count]
- **Changes**:
  - [Change 1]
  - [Change 2]
- **Status**: Success/Failed
- **Notes**: Any relevant notes
```

---

## Production Deployments

### 2026-01-23 15:16 - CloudFront Function for Directory Index
- **Type**: Infrastructure Change
- **Function ARN**: arn:aws:cloudfront::161231034279:function/jl3-directory-index-rewrite
- **Changes**:
  - Created CloudFront Function to rewrite directory URLs to index.html
  - Function runs on viewer-request (before CloudFront cache check)
  - Automatically rewrites `/services/` → `/services/index.html`
  - Automatically rewrites `/case-studies/` → `/case-studies/index.html`
  - Works for all future subdirectories
  - Maintains secure OAC (Origin Access Control) setup
  - Clean URLs without exposing index.html in browser
- **Status**: Success
- **Notes**: Professional long-term solution. No band-aids. Function runs at edge with no latency. Deployment takes 5-15 minutes to propagate globally.
- **Files Added**:
  - `infra/cloudfront-function-directory-index.js` (function code)

### 2026-01-23 14:46 - Standardize CTA Buttons
- **Commit**: 826d504
- **CloudFront Invalidation ID**: I6VUZOJF3GBJB6IH6SM1DU9Z9G
- **Deployed Files**: 24 HTML files updated
- **Changes**:
  - Replaced all "Book a 20-Min Call" with "Book a Call"
  - Replaced all "Book a 15-min Call" with "Book a Call"
  - Replaced all "Book a Free Call" with "Book a Call"
  - Consistent nav bar CTA across all pages
- **Status**: Success
- **Notes**: Standardized all call-to-action buttons for consistency

### 2026-01-23 14:31 - Navigation Fix
- **Commit**: ab45d50
- **CloudFront Invalidation ID**: IE3FIE7OFLCFD0ESDJXGO6A069
- **Deployed Files**:
  - index.html (navigation link fix)
  - sitemap.xml
  - robots.txt
- **Changes**:
  - Fixed broken navigation link in index.html (Process link was malformed)
- **Status**: Success
- **Notes**: Quick fix after initial redesign deployment

### 2026-01-23 ~14:15 - Complete Website Redesign
- **Commit**: ab45d50
- **CloudFront Invalidation ID**: I5Z6LXEJX0KRI3DHJPDFP2XWKZ (initial), IE3FIE7OFLCFD0ESDJXGO6A069 (fix)
- **Deployed Files**: 27 HTML files, CSS, JS, images
- **Changes**:
  - New homepage with "Data systems you can actually maintain" positioning
  - New About page with authentic story (sports betting app + Charter Schools USA)
  - New Process page emphasizing 4-phase handoff approach
  - Updated all Calendly links from /phone-call to /new-meeting
  - Removed Formspree form, replaced with direct Calendly/email CTAs
  - Changed navigation from "Solutions" to "Case Studies"
  - Cleaned case studies page: only HubSpot real project + 5 "coming soon" placeholders
  - Added HubSpot integration flowchart and detailed case study
  - Created HubSpot Power BI integration guide for SEO
  - Fixed deployment script (AWS profile, CloudFront invalidation paths)
- **Status**: Success
- **Notes**: Major redesign with authentic positioning. Emphasis on building for handoff, not dependency.

### 2026-01-21 ~Initial Deploy
- **Commit**: 6ebd903
- **CloudFront Invalidation ID**: Unknown
- **Deployed Files**: Initial site structure
- **Changes**:
  - Fixed domain name configuration
  - Added AWS profile configuration
  - Initial infrastructure setup (S3, CloudFront, Route53)
- **Status**: Success
- **Notes**: First production deployment with infrastructure

---

## Quick Deploy Command

```bash
# From project root
bash infra/deploy_s3_cloudfront.sh

# This will:
# 1. Sync public/ folder to S3
# 2. Invalidate CloudFront cache
# 3. Output deployment status
```

## Before Deploying

1. Test locally: `python -m http.server 8000 --directory public`
2. Review changes: `git status` and `git diff`
3. Commit changes: `git add -A && git commit -m "Description"`
4. Deploy: `bash infra/deploy_s3_cloudfront.sh`
5. Push to GitHub: `git push origin main`
6. Update this file with deployment details

## Rollback Procedure

If you need to rollback:

1. Find the previous commit: `git log --oneline`
2. Checkout that commit: `git checkout [commit-hash]`
3. Deploy: `bash infra/deploy_s3_cloudfront.sh`
4. If satisfied, create a new commit: `git commit -m "Rollback to [commit-hash]"`
5. Push to GitHub: `git push origin main`

## Infrastructure

- **S3 Bucket**: jamesjlaurieiii.com
- **CloudFront Distribution**: EONN2KZRY6530
- **AWS Profile**: terraform-admin
- **Domain**: https://jamesjlaurieiii.com
- **Region**: us-east-1

## Monitoring

- CloudFront Dashboard: https://console.aws.amazon.com/cloudfront/v3/home#/distributions/EONN2KZRY6530
- S3 Bucket: https://s3.console.aws.amazon.com/s3/buckets/jamesjlaurieiii.com
- CloudWatch: Monitor for 4xx/5xx errors, bandwidth usage
