#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "$0")/.." && pwd)"
RUNNER="$ROOT_DIR/output/d1-import/run-import.sh"
BATCH_SIZE="${BATCH_SIZE:-25}"
START_NUM="${START_NUM:-1}"
END_NUM="${END_NUM:-789}"
SKIP_SCHEMA="${SKIP_SCHEMA:-1}"

pad() {
  printf "%04d" "$1"
}

current="$START_NUM"
while [ "$current" -le "$END_NUM" ]; do
  batch_end=$((current + BATCH_SIZE - 1))
  if [ "$batch_end" -gt "$END_NUM" ]; then
    batch_end="$END_NUM"
  fi

  start_padded="$(pad "$current")"
  end_padded="$(pad "$batch_end")"

  echo "Running D1 import batch: ${start_padded} - ${end_padded}"
  START_AT="$start_padded" END_AT="$end_padded" SKIP_SCHEMA="$SKIP_SCHEMA" bash "$RUNNER"

  current=$((batch_end + 1))
done

echo "All requested batches completed."
