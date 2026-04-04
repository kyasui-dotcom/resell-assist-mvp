#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
IMPORT_DIR="${ROOT_DIR}/output/d1-import"
DB_NAME="kaitorihikaku-db"
START_AT="${START_AT:-0001}"
END_AT="${END_AT:-9999}"
SKIP_SCHEMA="${SKIP_SCHEMA:-0}"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx not found" >&2
  exit 127
fi

run_sql_file() {
  local file="$1"
  echo "→ ${file}"
  npx wrangler d1 execute "${DB_NAME}" --remote --file "${file}"
}

cd "${ROOT_DIR}"

echo "ROOT_DIR=${ROOT_DIR}"
echo "IMPORT_DIR=${IMPORT_DIR}"
echo "START_AT=${START_AT} END_AT=${END_AT} SKIP_SCHEMA=${SKIP_SCHEMA}"

if [[ ! -f "${IMPORT_DIR}/00-schema.sql" ]]; then
  echo "Error: schema file not found: ${IMPORT_DIR}/00-schema.sql" >&2
  exit 1
fi

if [[ "${SKIP_SCHEMA}" != "1" ]]; then
  echo "[1/3] Applying schema..."
  run_sql_file "${IMPORT_DIR}/00-schema.sql"
else
  echo "[1/3] Skipping schema application"
fi

echo "[2/3] Importing product chunks..."
shopt -s nullglob
files=("${IMPORT_DIR}"/[0-9][0-9][0-9][0-9]-products.sql)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "Error: no chunk files found in ${IMPORT_DIR}" >&2
  exit 1
fi

total=${#files[@]}
count=0
imported=0
for file in "${files[@]}"; do
  base="$(basename "$file")"
  num="${base%%-*}"
  count=$((count + 1))

  if [[ "${num}" < "${START_AT}" || "${num}" > "${END_AT}" ]]; then
    continue
  fi

  echo "[${count}/${total}] importing ${base}"
  run_sql_file "${file}"
  imported=$((imported + 1))
done

echo "Imported chunks: ${imported}"

echo "[3/3] Verifying row count..."
npx wrangler d1 execute "${DB_NAME}" --remote --command "SELECT COUNT(*) AS total_products FROM products;"

echo "Import completed."
