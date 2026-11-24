#!/usr/bin/env bash
# Spins up a throwaway PostgreSQL 16 cluster, applies the Supabase shim + all
# migrations, then runs the SQL test suites in supabase/tests. Requires postgres binaries.
set -euo pipefail
if [ "$(id -u)" = 0 ] && id postgres >/dev/null 2>&1; then exec runuser -u postgres -- "$0" "$@"; fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="$(mktemp -d)"; PORT="${PGPORT_TEST:-55432}"
cleanup() { "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$DATA" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DATA/log" start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"; "${PSQL[@]}" -f "$f"
done
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  echo "→ test $(basename "$f")"; "${PSQL[@]}" -o /dev/null -f "$f"
done
echo "✓ database tests passed"
