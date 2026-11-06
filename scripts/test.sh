#!/bin/sh
# Bundle the tests (they use the @/ alias) and run them. Database tests need
# PN_BOSS_TEST_DATABASE_URL and are skipped without it.
set -e
tsup src/erase/erase.test.ts src/database.test.ts --format esm --platform node --out-dir dist-test --no-config --external node:test --no-splitting
files=$(find dist-test -name '*.test.mjs')
sed -i 's/from "test"/from "node:test"/' $files
node --test --test-concurrency=1 $files
