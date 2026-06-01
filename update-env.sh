#!/usr/bin/env sh
# update-env.sh
# Reads generated Garage credentials from bootstrap container logs
# and updates GARAGE_ACCESS_KEY and GARAGE_SECRET_KEY in .env.
# Run once from project root after first `docker compose up`:
#   sh update-env.sh

set -e

ENV_FILE="./.env"

echo "==> Reading credentials from garage-bootstrap logs..."

LOGS=$(docker compose logs garage-bootstrap 2>/dev/null)

ACCESS_KEY=$(echo "$LOGS" | grep 'GARAGE_ACCESS_KEY=' | tail -1 | cut -d= -f2 | tr -d '[:space:]')
SECRET_KEY=$(echo "$LOGS" | grep 'GARAGE_SECRET_KEY=' | tail -1 | cut -d= -f2 | tr -d '[:space:]')

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "ERROR: Could not parse credentials from bootstrap logs."
  echo "       Run: docker compose logs garage-bootstrap"
  exit 1
fi

echo "   GARAGE_ACCESS_KEY=$ACCESS_KEY"
echo "   GARAGE_SECRET_KEY=$SECRET_KEY"

echo "==> Updating $ENV_FILE..."
sed -i "s|^GARAGE_ACCESS_KEY=.*|GARAGE_ACCESS_KEY=$ACCESS_KEY|" "$ENV_FILE"
sed -i "s|^GARAGE_SECRET_KEY=.*|GARAGE_SECRET_KEY=$SECRET_KEY|" "$ENV_FILE"

echo "==> Done. Restart the api service to pick up new credentials:"
echo "    docker compose restart api"