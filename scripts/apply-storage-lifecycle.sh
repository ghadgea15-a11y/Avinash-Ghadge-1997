#!/bin/bash
# ==============================================================================
# LOG SHEET MUSTER - CLOUD STORAGE LIFECYCLE MANAGEMENT DEPLOYMENT SCRIPT
# Applies 30/60/90-Day Auto-Cleanup & Tiering Rules to Firebase Cloud Storage Bucket
# ==============================================================================

set -e

CONFIG_FILE="storage-lifecycle.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: $CONFIG_FILE configuration file not found!"
  exit 1
fi

# Detect bucket name from env or firebase config
BUCKET_NAME="${STORAGE_BUCKET:-${FIREBASE_STORAGE_BUCKET:-}}"

if [ -z "$BUCKET_NAME" ]; then
  if [ -f "firebase.json" ]; then
    PROJECT_ID=$(grep -o '"projectId": *"[^"]*"' firebase.json | head -n 1 | cut -d'"' -f4 || true)
    if [ -n "$PROJECT_ID" ]; then
      BUCKET_NAME="${PROJECT_ID}.appspot.com"
    fi
  fi
fi

if [ -z "$BUCKET_NAME" ]; then
  echo "Usage: STORAGE_BUCKET=gs://your-bucket-name $0"
  echo "Or pass bucket name as first argument: $0 gs://your-bucket-name"
  if [ -n "$1" ]; then
    BUCKET_NAME="$1"
  else
    exit 1
  fi
fi

# Normalize bucket prefix
if [[ ! "$BUCKET_NAME" =~ ^gs:// ]]; then
  BUCKET_NAME="gs://${BUCKET_NAME}"
fi

echo "======================================================================"
echo "Applying Cloud Storage Lifecycle Rules to: $BUCKET_NAME"
echo "Configuration: $CONFIG_FILE"
echo "======================================================================"

if command -v gcloud &> /dev/null; then
  echo "Executing with gcloud storage..."
  gcloud storage buckets update "$BUCKET_NAME" --lifecycle-file="$CONFIG_FILE"
elif command -v gsutil &> /dev/null; then
  echo "Executing with gsutil..."
  gsutil lifecycle set "$CONFIG_FILE" "$BUCKET_NAME"
else
  echo "Notice: Neither 'gcloud' nor 'gsutil' CLI detected in container."
  echo "You can apply this file manually via:"
  echo "  gcloud storage buckets update $BUCKET_NAME --lifecycle-file=$CONFIG_FILE"
  echo "  OR via Google Cloud Console > Storage > Bucket > Lifecycle Rules."
fi

echo "✅ Storage lifecycle rule application step completed."
