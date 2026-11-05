#!/usr/bin/env bash
# Build and (re)start the FE container on http://localhost:3000.
#   ./docker-build.sh                                      → production API
#   VITE_BASE_URL=http://localhost:5001 ./docker-build.sh  → local BE
# VITE_* values are baked in at build time, so changing them needs a rebuild.
set -euo pipefail
cd "$(dirname "$0")"

API="${VITE_BASE_URL:-https://api-bisa-nota.vercel.app}"
ORDER_APP="${VITE_ORDER_APP_URL:-https://order-app-dun.vercel.app}"

echo "Building bisa-nota-fe (API: $API)"
docker build -t bisa-nota-fe \
  --build-arg VITE_BASE_URL="$API" \
  --build-arg VITE_ORDER_APP_URL="$ORDER_APP" \
  --build-arg VITE_CONSULT_WHATSAPP_NUMBER="${VITE_CONSULT_WHATSAPP_NUMBER:-}" \
  .

docker rm -f bisa-nota-fe >/dev/null 2>&1 || true
docker run -d --name bisa-nota-fe -p 3000:80 bisa-nota-fe >/dev/null

# wait for nginx to answer (up to ~10 s), then confirm the API URL really is
# in the bundle
for _ in $(seq 1 20); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)" = "200" ] && break
  sleep 0.5
done
entry="$(curl -s http://localhost:3000/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true)"
if [ -n "$entry" ] && curl -s "http://localhost:3000$entry" | grep -F "$API" >/dev/null; then
  echo "OK: running on http://localhost:3000 (API $API)"
else
  echo "WARNING: could not confirm the API URL in the bundle — check docker logs bisa-nota-fe"
fi
