#!/usr/bin/env bash
# Builds the whole database on a plain local PostgreSQL (no Supabase, no real
# data) and runs the permission checks in supabase/checks/rls_checks.sql.
# Usage: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
# Never point this at the real Supabase project: the stub fakes Supabase parts.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DATABASE_URL:?set DATABASE_URL to an empty local PostgreSQL database}"
case "$DB" in *supabase.co*|*supabase.com*) echo "Refusing to run on a Supabase project." >&2; exit 1;; esac

run() { psql "$DB" -v ON_ERROR_STOP=1 -q -f "$1" > /dev/null; }
run supabase/checks/plain_postgres_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
run supabase/seed.sql
out=$(psql "$DB" -v ON_ERROR_STOP=1 -f supabase/checks/rls_checks.sql 2>&1)
echo "$out" | grep -E "ok:|FAIL|ERROR|✓" | tail -5
echo "$out" | grep -q "كل الفحوص نجحت" || { echo "$out" | tail -30; exit 1; }
