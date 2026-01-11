#!/bin/bash

# Deploy static site to S3 with proper cache headers
# Run from project root: ./infra/deploy_s3_cloudfront.sh

set -e

# Load configuration
if [ -f "./infra/aws_config.env" ]; then
    source ./infra/aws_config.env
else
    echo "Error: aws_config.env not found. Copy aws_config.example.env and fill in values."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying to S3 bucket: ${S3_BUCKET}${NC}"

# Sync HTML files with short cache (they change frequently)
echo -e "${GREEN}Uploading HTML files...${NC}"
aws s3 sync ./public s3://${S3_BUCKET} \
    --exclude "*" \
    --include "*.html" \
    --cache-control "max-age=300, must-revalidate" \
    --content-type "text/html; charset=utf-8" \
    --delete

# Sync CSS files with medium cache
echo -e "${GREEN}Uploading CSS files...${NC}"
aws s3 sync ./public/assets/css s3://${S3_BUCKET}/assets/css \
    --cache-control "max-age=31536000, immutable" \
    --content-type "text/css; charset=utf-8"

# Sync JS files with long cache (versioned in production)
echo -e "${GREEN}Uploading JS files...${NC}"
aws s3 sync ./public/assets/js s3://${S3_BUCKET}/assets/js \
    --cache-control "max-age=31536000, immutable" \
    --content-type "application/javascript; charset=utf-8"

# Sync images with long cache
echo -e "${GREEN}Uploading images...${NC}"
aws s3 sync ./public/assets/img s3://${S3_BUCKET}/assets/img \
    --cache-control "max-age=31536000, immutable"

# Sync XML files (sitemap)
echo -e "${GREEN}Uploading sitemap...${NC}"
aws s3 cp ./public/sitemap.xml s3://${S3_BUCKET}/sitemap.xml \
    --cache-control "max-age=86400" \
    --content-type "application/xml"

# Sync robots.txt
echo -e "${GREEN}Uploading robots.txt...${NC}"
aws s3 cp ./public/robots.txt s3://${S3_BUCKET}/robots.txt \
    --cache-control "max-age=86400" \
    --content-type "text/plain"

echo -e "${GREEN}S3 sync complete!${NC}"

# Invalidate CloudFront cache for HTML files
if [ ! -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*.html" "/index.html" "/services/*" "/resources/*" "/case-studies/*"
    echo -e "${GREEN}CloudFront invalidation initiated.${NC}"
else
    echo -e "${YELLOW}Skipping CloudFront invalidation (no distribution ID configured).${NC}"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Site URL: https://${DOMAIN}"
