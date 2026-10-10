#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

cat > "$root/.env" <<'EOF'
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=e2e
DB_NAME=teachteamapp
DB_SYNC=true
ADMIN_BACKEND_PORT=4002
ADMIN_JWT_SECRET=ci-admin-jwt-secret-not-for-production
ADMIN_SESSION_SECRET=ci-admin-session-secret-not-for-production
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=admin
ADMIN_FRONTEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT=/graphql
NEXT_PUBLIC_ADMIN_WS_ENDPOINT=/graphql
NEXT_PUBLIC_GRAPHQL_ENDPOINT=/graphql
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3001
ADMIN_GRAPHQL_ORIGIN=http://localhost:4002
MAIN_API_ORIGIN=http://localhost:5000
EOF

echo "Starting admin API"
(
  cd "$root/admin-backend"
  node -r ts-node/register src/index.ts > "$root/admin-api.log" 2>&1
) &
api_pid=$!

echo "Building admin frontend"
(cd "$root/admin-frontend" && npm run build)

ready=0
for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:4002/health >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  echo "Admin API did not become healthy"
  cat "$root/admin-api.log" || true
  kill "$api_pid" || true
  exit 1
fi

node "$root/e2e/ci/seed-admin.mjs"

echo "Starting admin frontend"
(
  cd "$root/admin-frontend"
  npx next start -p 3001 > "$root/admin-web.log" 2>&1
) &
web_pid=$!

ready=0
for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3001 >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  echo "Admin frontend did not start"
  cat "$root/admin-web.log" || true
  kill "$api_pid" "$web_pid" || true
  exit 1
fi

status=0
(cd "$root/e2e" && npm test) || status=$?

kill "$api_pid" "$web_pid" || true
exit "$status"
