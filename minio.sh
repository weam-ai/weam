#!/bin/sh


# export $(cat /etc/environment | xargs)
# Wait for MinIO to be fully initialized

# Set MinIO alias
mc alias set local http://minio:9000 "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY"


# Create and set policy for weam-dev-01-frontend-media bucket
mc mb --with-lock --ignore-existing local/"$AWS_BUCKET"
mc anonymous set public local/"$AWS_BUCKET"

# Create and set policy for vectors-backup bucket
mc mb --with-lock --ignore-existing local/"$AWS_VECTORS_BACKUP"
mc anonymous set public local/"$AWS_VECTORS_BACKUP"

echo "MinIO buckets initialized"
