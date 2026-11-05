#!/bin/sh
# Runs migrations + security tests on a throwaway local Postgres database (needs postgres + psql, run as a user able to `su postgres`).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
P="su postgres -c"
$P "psql -q -c 'drop database if exists afterhours_test' -c 'create database afterhours_test'" 2>/dev/null
for f in tests/sql/00_supabase_stubs.sql supabase/migrations/*.sql tests/sql/10_security_tests.sql tests/sql/20_phase4_tests.sql tests/sql/30_chat_tests.sql tests/sql/40_safety_tests.sql tests/sql/50_likes_notifications_tests.sql; do
  $P "psql -v ON_ERROR_STOP=1 -q -d afterhours_test -f $ROOT/$f" 2>&1 | grep -E "PASS|FAIL|ERROR|CONTEXT" || true
done | sed 's/^psql:[^ ]* //'
