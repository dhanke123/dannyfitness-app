#!/bin/bash
# Run the UI regression suites.
#
#   cd DannyFitness_App
#   bash tests/run.sh                 # everything
#   bash tests/run.sh calmove smoke   # just these
#
# Each suite is a standalone script: it boots jsdom, mounts the REAL App with
# react-dom/client, clicks through it, and asserts on the resulting DOM. There is
# no test framework and no component mocking — a suite that passes has driven the
# same code the browser runs.
#
# They're bundled with esbuild first because Node can't import .jsx directly and
# the app uses import.meta.env (Vite). jsdom, react and react-dom stay external so
# the suites share one React instance with the app.
#
# Needs jsdom:  npm i -D jsdom
set -u
cd "$(dirname "$0")/.."

ALL="smoke refund payout clash cal tiles enquiry notif reports rearr deadends classes builders weekgrid calmove"
SUITES="${*:-$ALL}"
mkdir -p .test-build
fails=0

for f in $SUITES; do
  ./node_modules/.bin/esbuild "tests/$f.jsx" --bundle --platform=node --format=esm \
    --jsx=automatic --define:import.meta.env={} --loader:.js=jsx \
    --external:jsdom --external:react --external:react-dom --external:@supabase/supabase-js \
    --outfile=".test-build/$f.mjs" --log-level=error \
    || { echo "$f  BUILD FAILED"; fails=$((fails+1)); continue; }

  printf "%-10s " "$f"
  out=$(node ".test-build/$f.mjs" 2>&1)
  echo "$out" | grep -E "passed$" | tail -1
  if echo "$out" | grep -q "FAIL"; then
    echo "$out" | grep "FAIL"
    fails=$((fails+1))
  fi
done

echo
if [ "$fails" -gt 0 ]; then echo "$fails suite(s) failed"; exit 1; else echo "all suites passed"; fi
