#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_APP="${API_APP:-aurora-dealflow-api}"
WEB_APP="${WEB_APP:-aurora-dealflow-web}"
DB_APP="${DB_APP:-aurora-dealflow-db}"
REGION="${REGION:-sjc}"
API_URL="https://${API_APP}.fly.dev"
WEB_URL="https://${WEB_APP}.fly.dev"

echo "==> Creating Fly Postgres cluster (${DB_APP}) if needed..."
if ! fly postgres list 2>/dev/null | grep -q "${DB_APP}"; then
  fly postgres create \
    --name "${DB_APP}" \
    --region "${REGION}" \
    --initial-cluster-size 1 \
    --vm-size shared-cpu-1x:1024MB \
    --volume-size 3
fi

echo "==> Creating API app (${API_APP}) if needed..."
if ! fly apps list 2>/dev/null | grep -q "${API_APP}"; then
  fly apps create "${API_APP}" --org personal
fi

echo "==> Attaching Postgres to API..."
fly postgres attach "${DB_APP}" --app "${API_APP}" || true

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
echo "==> Setting API secrets..."
fly secrets set \
  JWT_SECRET="${JWT_SECRET}" \
  WEB_ORIGIN="${WEB_URL}" \
  ATTOM_USE_DEMO=true \
  OPENAI_USE_DEMO=true \
  --app "${API_APP}"

echo "==> Deploying API..."
fly deploy --config fly.api.toml --app "${API_APP}" --ha=false

echo "==> Creating Web app (${WEB_APP}) if needed..."
if ! fly apps list 2>/dev/null | grep -q "${WEB_APP}"; then
  fly apps create "${WEB_APP}" --org personal
fi

echo "==> Deploying Web..."
fly deploy \
  --config fly.web.toml \
  --app "${WEB_APP}" \
  --ha=false \
  --build-arg "NEXT_PUBLIC_API_URL=${API_URL}"

echo "==> Seeding database..."
fly ssh console --app "${API_APP}" -C "node packages/db/dist/seed.js" || true

echo
echo "Deployment complete:"
echo "  Web: ${WEB_URL}"
echo "  API: ${API_URL}"
echo
echo "Open ${WEB_URL}/login to create your account."
