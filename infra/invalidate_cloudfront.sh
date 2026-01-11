#!/bin/bash

# Invalidate CloudFront cache
# Use this to force refresh of all cached content

set -e

# Load configuration
if [ -f "./infra/aws_config.env" ]; then
    source ./infra/aws_config.env
else
    echo "Error: aws_config.env not found."
    exit 1
fi

if [ -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    echo "Error: CLOUDFRONT_DISTRIBUTION_ID not set in aws_config.env"
    exit 1
fi

echo "Invalidating all paths for distribution: ${CLOUDFRONT_DISTRIBUTION_ID}"

aws cloudfront create-invalidation \
    --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
    --paths "/*"

echo "Invalidation request submitted. It may take a few minutes to complete."
echo "Check status with: aws cloudfront list-invalidations --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID}"
