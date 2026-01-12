# JL3 Static Site Infrastructure Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Setup Journey & Troubleshooting](#setup-journey--troubleshooting)
4. [Cost Analysis](#cost-analysis)
5. [Scalability Analysis](#scalability-analysis)
6. [Deployment Guide](#deployment-guide)
7. [Maintenance & Operations](#maintenance--operations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER REQUEST                                    │
│                         https://jamesjlaurieiii.com                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NAMECHEAP (Registrar)                           │
│                                                                             │
│  Domain: jamesjlaurieiii.com                                                │
│  Nameservers: Delegated to Route53                                          │
│    - ns-1055.awsdns-03.org                                                  │
│    - ns-146.awsdns-18.com                                                   │
│    - ns-1739.awsdns-25.co.uk                                                │
│    - ns-585.awsdns-09.net                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AWS ROUTE53                                      │
│                                                                             │
│  Hosted Zone: jamesjlaurieiii.com                                           │
│  Records:                                                                   │
│    - A (root) ──────────► CloudFront                                        │
│    - AAAA (root) ───────► CloudFront (IPv6)                                 │
│    - A (www) ───────────► CloudFront                                        │
│    - AAAA (www) ────────► CloudFront (IPv6)                                 │
│    - CNAME (ACM validation records)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS CLOUDFRONT (CDN)                               │
│                                                                             │
│  Features:                                                                  │
│    - Global edge caching (US, Canada, Europe - PriceClass_100)              │
│    - HTTPS termination with ACM certificate                                 │
│    - HTTP → HTTPS redirect                                                  │
│    - Gzip/Brotli compression                                                │
│    - Custom error pages (404.html)                                          │
│    - DDoS protection (AWS Shield Standard - included)                       │
│                                                                             │
│  Cache Settings:                                                            │
│    - Default TTL: 24 hours                                                  │
│    - Min TTL: 0 seconds                                                     │
│    - Max TTL: 1 year                                                        │
│                                                                             │
│  SSL/TLS:                                                                   │
│    - TLS 1.2+ only                                                          │
│    - SNI-based certificate                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Origin Access Control (OAC)
                                      │ (Signed requests using SigV4)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS S3 BUCKET                                  │
│                                                                             │
│  Bucket: jamesjlaurieiii.com                                                │
│  Region: us-east-1                                                          │
│                                                                             │
│  Security:                                                                  │
│    - Block ALL public access (enabled)                                      │
│    - Bucket policy: CloudFront OAC only                                     │
│    - Server-side encryption: AES-256 (SSE-S3)                               │
│    - Versioning: Enabled                                                    │
│                                                                             │
│  Lifecycle Rules:                                                           │
│    - Expire noncurrent versions: 90 days                                    │
│    - Abort incomplete multipart uploads: 7 days                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AWS ACM CERTIFICATE                               │
│                                                                             │
│  Region: us-east-1 (required for CloudFront)                                │
│  Domains covered:                                                           │
│    - jamesjlaurieiii.com                                                    │
│    - www.jamesjlaurieiii.com                                                │
│  Validation: DNS (automated via Route53)                                    │
│  Auto-renewal: Yes (managed by AWS)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Components

### 1. Domain Registration (Namecheap)
- **Domain**: jamesjlaurieiii.com
- **Role**: Domain registrar only (DNS delegated to AWS)
- **Configuration**: Custom nameservers pointing to Route53

### 2. Route53 Hosted Zone
- **Purpose**: DNS management for the domain
- **Records Created**:
  - NS records (automatically created)
  - SOA record (automatically created)
  - A/AAAA records for root and www (alias to CloudFront)
  - CNAME records for ACM certificate validation

### 3. ACM Certificate
- **Purpose**: SSL/TLS encryption for HTTPS
- **Validation Method**: DNS (automatic with Route53)
- **Coverage**: Root domain + www subdomain
- **Region**: Must be us-east-1 for CloudFront compatibility

### 4. CloudFront Distribution
- **Purpose**: Content delivery network (CDN)
- **Features**:
  - Edge caching reduces latency globally
  - HTTPS termination
  - Automatic compression
  - DDoS protection included

### 5. S3 Bucket
- **Purpose**: Static file storage (origin)
- **Access**: Private (CloudFront only via OAC)
- **Contents**: HTML, CSS, JS, images

### 6. Origin Access Control (OAC)
- **Purpose**: Secure connection between CloudFront and S3
- **Method**: AWS Signature Version 4 signing
- **Replaces**: Legacy Origin Access Identity (OAI)

---

## Setup Journey & Troubleshooting

### Initial Problem
The Terraform configuration was set up for `jameslaurieiii.com` but the actual domain registered at Namecheap was `jamesjlaurieiii.com` (note the extra "j" in "jamesj").

### Symptoms
- ACM certificate validation stuck at "PENDING_VALIDATION" for days
- Terraform apply timing out after 75+ minutes
- `nslookup` returning "Non-existent domain"

### Root Cause Analysis

```
CONFIGURED DOMAIN          ACTUAL DOMAIN
jameslaurieiii.com    vs   jamesjlaurieiii.com
       ↑                          ↑
   Missing "j"              Correct spelling
```

1. Terraform created Route53 zone for wrong domain
2. ACM requested certificate for wrong domain
3. Validation CNAME records created in Route53 (wrong domain)
4. Namecheap nameservers pointed to Route53 zone (correct domain nameservers, wrong zone)
5. When ACM tried to validate, it couldn't find the CNAME records because DNS queries went to Namecheap's view of the domain, not the Route53 zone

### Resolution Steps

1. **Fixed domain name in Terraform**
   ```hcl
   # variables.tf
   default = "jamesjlaurieiii.com"  # Changed from jameslaurieiii.com
   ```

2. **Added AWS profile to providers**
   ```hcl
   # providers.tf
   provider "aws" {
     region  = var.aws_region
     profile = "terraform-admin"
   }
   ```

3. **Ran terraform apply** to recreate resources with correct domain

4. **Emptied old S3 bucket** (had versioned objects preventing deletion)
   ```bash
   aws s3 rm s3://jameslaurieiii.com --recursive --profile terraform-admin
   # Also had to delete version markers with "null" VersionId
   ```

5. **Updated Namecheap nameservers** with NEW Route53 nameservers
   - Old (deleted): ns-1089, ns-1637, ns-242, ns-861
   - New (current): ns-1055, ns-146, ns-1739, ns-585

### Lessons Learned

1. **Always verify domain spelling** - typos in domain names cause cascading failures
2. **DNS delegation must match** - nameservers at registrar must point to the correct Route53 zone
3. **ACM validation requires working DNS** - certificate validation won't complete until DNS is properly configured
4. **S3 versioning complicates deletion** - delete markers and versions must all be removed
5. **Route53 zones have unique nameservers** - destroying and recreating a zone gives you new nameservers

---

## Cost Analysis

### Monthly Cost Breakdown (Estimated)

| Service | Usage Assumption | Estimated Cost |
|---------|------------------|----------------|
| **Route53 Hosted Zone** | 1 zone | $0.50/month |
| **Route53 Queries** | 1M queries | $0.40/month |
| **S3 Storage** | 1 GB | $0.023/month |
| **S3 Requests** | 100K GET, 1K PUT | $0.05/month |
| **CloudFront Data Transfer** | 10 GB | $0.85/month |
| **CloudFront Requests** | 100K | $0.01/month |
| **ACM Certificate** | 1 certificate | **FREE** |

### **Total Estimated Monthly Cost: ~$2-5/month**

### Cost Optimization Tips

1. **CloudFront Price Class**: Currently using `PriceClass_100` (US, Canada, Europe only)
   - Cheapest option while covering primary audience
   - Upgrade to `PriceClass_200` or `PriceClass_All` if you need global reach

2. **S3 Lifecycle Rules**: Already configured
   - Noncurrent versions expire after 90 days
   - Prevents storage cost bloat from versioning

3. **Caching Strategy**:
   - Long cache TTLs for static assets reduce origin requests
   - HTML cached for 5 minutes (via deploy script)
   - CSS/JS/images cached for 1 year

### Cost Scaling Examples

| Traffic Level | Monthly Visitors | Est. Monthly Cost |
|---------------|------------------|-------------------|
| Low | 1,000 | $2-3 |
| Medium | 10,000 | $3-5 |
| High | 100,000 | $10-20 |
| Very High | 1,000,000 | $50-100 |

### Free Tier Benefits (First 12 months of AWS account)

- S3: 5 GB storage, 20K GET, 2K PUT
- CloudFront: 1 TB data transfer, 10M requests
- **First year could be nearly free for low-traffic sites**

---

## Scalability Analysis

### Current Architecture Scalability

| Component | Scalability | Limits |
|-----------|-------------|--------|
| **S3** | Virtually unlimited | 5TB max object size |
| **CloudFront** | Auto-scales globally | 250,000 requests/second |
| **Route53** | Highly available | 10,000 records per zone |
| **ACM** | N/A | Certificates auto-renew |

### Traffic Handling

```
                    CloudFront Edge Locations
                    ┌─────────────────────────┐
                    │  PriceClass_100 covers: │
                    │  - North America        │
                    │  - Europe               │
                    │                         │
User ──────────────►│  Edge Cache Hit?        │
                    │  ├─ YES: Serve from edge│ (< 50ms latency)
                    │  └─ NO: Fetch from S3   │ (+ ~100ms)
                    └─────────────────────────┘
```

### Scalability Characteristics

1. **Static Content = Infinite Scale**
   - No servers to scale
   - CloudFront handles traffic spikes automatically
   - S3 has 99.999999999% (11 9's) durability

2. **Global Performance**
   - Content cached at edge locations
   - Users served from nearest edge
   - Typical latency: 10-50ms

3. **Cost Scales Linearly**
   - Pay only for what you use
   - No fixed infrastructure costs
   - No capacity planning needed

### Upgrade Paths (If Needed)

1. **More Global Reach**: Change `cloudfront_price_class` to `PriceClass_All`
2. **Dynamic Content**: Add Lambda@Edge or CloudFront Functions
3. **API Backend**: Add API Gateway + Lambda
4. **Database**: Add DynamoDB for serverless data storage

### Comparison with Traditional Hosting

| Metric | This Architecture | Traditional VPS |
|--------|-------------------|-----------------|
| Max concurrent users | 250,000+ req/sec | ~1,000-10,000 |
| Global latency | 10-50ms | 100-500ms |
| Uptime SLA | 99.9% | 99.5% typical |
| Maintenance | Zero | Regular patches |
| Scaling | Automatic | Manual |
| Cost at low traffic | ~$2/month | ~$5-20/month |
| Cost at high traffic | Linear | Server upgrades |

---

## Deployment Guide

### Prerequisites

1. AWS CLI configured with `terraform-admin` profile
2. Terraform >= 1.5.0 installed
3. Website files in `public/` directory

### Initial Deployment (Already Completed)

```bash
cd infra/envs/prod
terraform init
terraform apply
```

### Uploading Website Files

After Terraform completes, sync your website files:

```bash
# Using the deploy script (recommended)
cd infra
cp aws_config.example.env aws_config.env
# Edit aws_config.env with your values, then:
./deploy_s3_cloudfront.sh

# OR manually with AWS CLI
aws s3 sync ../public s3://jamesjlaurieiii.com \
  --delete \
  --profile terraform-admin \
  --cache-control "max-age=31536000" \
  --exclude "*.html"

aws s3 sync ../public s3://jamesjlaurieiii.com \
  --delete \
  --profile terraform-admin \
  --cache-control "max-age=300, must-revalidate" \
  --exclude "*" \
  --include "*.html"
```

### Invalidating CloudFront Cache

After deploying updates:

```bash
# Get the distribution ID from Terraform output
terraform output cloudfront_distribution_id

# Invalidate all files
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*" \
  --profile terraform-admin
```

### Verifying Deployment

1. **Check DNS resolution**:
   ```bash
   nslookup jamesjlaurieiii.com
   ```

2. **Check HTTPS certificate**:
   ```bash
   curl -I https://jamesjlaurieiii.com
   ```

3. **Visit the website**:
   - https://jamesjlaurieiii.com
   - https://www.jamesjlaurieiii.com

---

## Maintenance & Operations

### Regular Tasks

| Task | Frequency | How |
|------|-----------|-----|
| Deploy content updates | As needed | `./deploy_s3_cloudfront.sh` |
| Monitor costs | Monthly | AWS Cost Explorer |
| Check certificate expiry | Never (auto-renews) | ACM console |
| Review CloudFront metrics | As needed | CloudFront console |

### Monitoring

1. **CloudFront Metrics** (AWS Console):
   - Requests
   - Bytes downloaded
   - Error rate
   - Cache hit ratio

2. **S3 Metrics**:
   - Storage used
   - Request counts

3. **Route53 Health Checks** (optional):
   - Can add health checks for uptime monitoring
   - Integrates with CloudWatch alarms

### Disaster Recovery

| Scenario | Recovery |
|----------|----------|
| Accidental file deletion | S3 versioning - restore from previous version |
| CloudFront issues | AWS handles automatically |
| Certificate expiry | Auto-renewed by ACM |
| Complete rebuild needed | `terraform apply` recreates everything |

### Security Considerations

1. **Already Implemented**:
   - S3 bucket completely private
   - HTTPS enforced (HTTP redirects)
   - TLS 1.2+ only
   - AWS Shield Standard DDoS protection
   - No public bucket access

2. **Optional Enhancements**:
   - AWS WAF for advanced threat protection
   - CloudFront geo-restrictions
   - Access logging to S3

### Terraform State

- Currently stored locally in `terraform.tfstate`
- **Recommendation for production**: Move to S3 backend with DynamoDB locking
- Backup state file regularly if keeping local

---

## Quick Reference

### Key Commands

```bash
# Deploy website files
cd infra && ./deploy_s3_cloudfront.sh

# Check Terraform state
cd infra/envs/prod && terraform output

# Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*" --profile terraform-admin

# Check DNS
nslookup -type=NS jamesjlaurieiii.com
```

### Important Values

| Item | Value |
|------|-------|
| Domain | jamesjlaurieiii.com |
| S3 Bucket | jamesjlaurieiii.com |
| AWS Profile | terraform-admin |
| AWS Region | us-east-1 |
| Terraform Directory | infra/envs/prod |

### File Structure

```
jl3_data_frontend/
├── public/                    # Website files (HTML, CSS, JS)
│   ├── index.html
│   ├── assets/
│   └── ...
├── infra/
│   ├── envs/prod/
│   │   ├── main.tf           # Main infrastructure
│   │   ├── variables.tf      # Configuration variables
│   │   ├── providers.tf      # AWS provider config
│   │   ├── outputs.tf        # Output values
│   │   └── terraform.tfstate # State (keep secure!)
│   ├── deploy_s3_cloudfront.sh
│   ├── invalidate_cloudfront.sh
│   └── INFRASTRUCTURE.md     # This document
└── README.md
```

---

*Document created: January 12, 2026*
*Infrastructure version: 1.0*
