#!/usr/bin/env sh
# bootstrap-garage.sh
# Idempotent single-node Garage setup. Runs automatically via docker compose.
# Uses curl against the Garage admin API.
#
# Required env vars:
#   GARAGE_ADMIN_TOKEN  — matches admin_token in garage.toml
#   GARAGE_ADMIN_URL    — defaults to http://garage:3901

set -e

ADMIN_URL="${GARAGE_ADMIN_URL:-http://garage:3901}"
ADMIN_TOKEN="${GARAGE_ADMIN_TOKEN:?GARAGE_ADMIN_TOKEN must be set}"

# ── Wait for Garage ───────────────────────────────────────────────────────────
echo "==> Waiting for Garage admin API..."
until curl -sf "${ADMIN_URL%/}/health" > /dev/null; do
  sleep 2
done
echo "   Garage is up."

# ── Check if already bootstrapped ────────────────────────────────────────────
LAYOUT_VERSION=$(curl -sf \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$ADMIN_URL/v1/layout" \
  | grep -o '"version": *[0-9]*' | head -1 | grep -o '[0-9]*')

if [ "${LAYOUT_VERSION:-0}" -gt 0 ] 2>/dev/null; then
  echo "==> Garage already bootstrapped (layout version $LAYOUT_VERSION). Skipping."
  exit 0
fi

# ── 1. Get node ID ────────────────────────────────────────────────────────────
echo "==> Fetching node ID..."
STATUS_JSON=$(curl -sf \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$ADMIN_URL/v1/status")

NODE_ID=$(echo "$STATUS_JSON" \
  | grep -o '"node": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$NODE_ID" ]; then
  echo "ERROR: Could not parse node ID from status response:"
  echo "$STATUS_JSON"
  exit 1
fi
echo "   Node ID: $NODE_ID"

# ── 2. Assign node to layout ──────────────────────────────────────────────────
echo "==> Assigning node to layout (zone=dc1, capacity=1G)..."
curl -sf -X POST "$ADMIN_URL/v1/layout" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "[{\"id\":\"$NODE_ID\",\"zone\":\"dc1\",\"capacity\":1000000000,\"tags\":[]}]"
echo "   Node assigned."

# ── 3. Apply layout version 1 ────────────────────────────────────────────────
echo "==> Applying layout version 1..."
curl -sf -X POST "$ADMIN_URL/v1/layout/apply" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":1}'
echo "   Layout applied."
sleep 2

# ── 4. Create access key ──────────────────────────────────────────────────────
echo "==> Creating access key..."
KEY_JSON=$(curl -sf -X POST "$ADMIN_URL/v1/key" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"taambeit"}')

ACCESS_KEY=$(echo "$KEY_JSON" | grep -o '"accessKeyId": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
SECRET_KEY=$(echo "$KEY_JSON" | grep -o '"secretAccessKey": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "ERROR: Could not parse access key from response:"
  echo "$KEY_JSON"
  exit 1
fi
echo "   Access key: $ACCESS_KEY"

# ── 5. Create buckets ─────────────────────────────────────────────────────────
for BUCKET in meal-images chef-avatars chef-documents; do
  echo "==> Creating bucket: $BUCKET"
  BUCKET_JSON=$(curl -sf -X POST "$ADMIN_URL/v1/bucket" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"globalAlias\":\"$BUCKET\"}")

  BUCKET_ID=$(echo "$BUCKET_JSON" | grep -o '"id": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

  if [ -z "$BUCKET_ID" ]; then
    echo "ERROR: Could not parse bucket ID for $BUCKET:"
    echo "$BUCKET_JSON"
    exit 1
  fi
  echo "   Bucket ID: $BUCKET_ID"

  curl -sf -X POST "$ADMIN_URL/v1/bucket/allow" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"bucketId\": \"$BUCKET_ID\",
      \"accessKeyId\": \"$ACCESS_KEY\",
      \"permissions\": {\"read\": true, \"write\": true, \"owner\": true}
    }"
  echo "   Key permissions granted."

  if [ "$BUCKET" = "meal-images" ] || [ "$BUCKET" = "chef-avatars" ]; then
    curl -sf -X PUT "$ADMIN_URL/v1/bucket?id=$BUCKET_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"websiteAccess":{"enabled":true,"indexDocument":"index.html","errorDocument":"error.html"}}'
    echo "   Website access enabled (public)."
  else
    echo "   Website access disabled (private — presigned URLs only)."
  fi
done

# ── 6. Print credentials — parsed by update-env.sh from docker logs ───────────
echo ""
echo "==> Bootstrap complete."
echo "GARAGE_ACCESS_KEY=$ACCESS_KEY"
echo "GARAGE_SECRET_KEY=$SECRET_KEY"
