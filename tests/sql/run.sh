#!/bin/sh
# Runs migrations + SQL security tests on a throwaway local PostgreSQL database.
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT HUP INT TERM
P="su postgres -c"
$P "psql -q -c 'drop database if exists afterhours_test' -c 'create database afterhours_test'" 2>/dev/null
for f in \
  tests/sql/00_supabase_stubs.sql \
  supabase/migrations/*.sql \
  tests/sql/10_security_tests.sql \
  tests/sql/20_phase4_tests.sql \
  tests/sql/30_chat_tests.sql \
  tests/sql/40_safety_tests.sql \
  tests/sql/50_likes_notifications_tests.sql \
  tests/sql/60_admin_tests.sql
do
  if ! $P "psql -v ON_ERROR_STOP=1 -q -d afterhours_test -f $ROOT/$f" >"$LOG" 2>&1; then
    cat "$LOG"
    echo "FAIL: $f" >&2
    exit 1
  fi
  grep -E 'PASS|FAIL|ERROR|CONTEXT' "$LOG" || true
done
