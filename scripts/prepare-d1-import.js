import fs from 'node:fs/promises';
import path from 'node:path';

const PRODUCTS_PATH = new URL('../data/products.json', import.meta.url);
const SCHEMA_PATH = new URL('../schema.sql', import.meta.url);
const OUTPUT_DIR = new URL('../output/d1-import/', import.meta.url);
const CHUNK_SIZE = Number(process.env.D1_CHUNK_SIZE || 200);
const INCLUDE_CATEGORIES = (process.env.D1_INCLUDE_CATEGORIES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const EXCLUDE_CATEGORIES = (process.env.D1_EXCLUDE_CATEGORIES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const PRODUCT_LIMIT = Number(process.env.D1_PRODUCT_LIMIT || 0);

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildRuntimePayload(product) {
  return {
    id: product.id,
    category: product.category,
    series: product.series ?? null,
    name: product.name,
    specs: product.specs ?? {},
    market: product.market ?? {}
  };
}

async function main() {
  const raw = await fs.readFile(PRODUCTS_PATH, 'utf8');
  let products = JSON.parse(raw);
  const schemaSql = await fs.readFile(SCHEMA_PATH, 'utf8');

  if (INCLUDE_CATEGORIES.length) {
    const include = new Set(INCLUDE_CATEGORIES);
    products = products.filter((product) => include.has(product.category));
  }

  if (EXCLUDE_CATEGORIES.length) {
    const exclude = new Set(EXCLUDE_CATEGORIES);
    products = products.filter((product) => !exclude.has(product.category));
  }

  if (PRODUCT_LIMIT > 0) {
    products = products.slice(0, PRODUCT_LIMIT);
  }

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await fs.writeFile(new URL('00-schema.sql', OUTPUT_DIR), `${schemaSql.trim()}\n`);

  const manifest = [];
  for (let index = 0; index < products.length; index += CHUNK_SIZE) {
    const chunk = products.slice(index, index + CHUNK_SIZE);
    const fileNumber = String(Math.floor(index / CHUNK_SIZE) + 1).padStart(4, '0');
    const fileName = `${fileNumber}-products.sql`;
    const lines = [];

    for (const product of chunk) {
      const payload = JSON.stringify(buildRuntimePayload(product));
      const summarySpecs = Object.values(product.specs ?? {}).filter(Boolean).join(' / ');
      lines.push(
        `INSERT OR REPLACE INTO products (id, name, category, series, summary_specs, payload_json) VALUES (${sqlString(product.id)}, ${sqlString(product.name)}, ${sqlString(product.category)}, ${sqlString(product.series ?? null)}, ${sqlString(summarySpecs)}, ${sqlString(payload)});`
      );
      lines.push(
        `INSERT OR REPLACE INTO products_fts (id, name, category, series, summary_specs) VALUES (${sqlString(product.id)}, ${sqlString(product.name)}, ${sqlString(product.category)}, ${sqlString(product.series ?? null)}, ${sqlString(summarySpecs)});`
      );
    }

    await fs.writeFile(new URL(fileName, OUTPUT_DIR), `${lines.join('\n')}\n`);
    manifest.push(fileName);
  }

  const importScript = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    'SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"',
    'ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"',
    'IMPORT_DIR="${ROOT_DIR}/output/d1-import"',
    'DB_NAME="kaitorihikaku-db"',
    'START_AT="${START_AT:-0001}"',
    'END_AT="${END_AT:-9999}"',
    'SKIP_SCHEMA="${SKIP_SCHEMA:-0}"',
    '',
    'if ! command -v npx >/dev/null 2>&1; then',
    '  echo "Error: npx not found" >&2',
    '  exit 127',
    'fi',
    '',
    'run_sql_file() {',
    '  local file="$1"',
    '  echo "→ ${file}"',
    '  npx wrangler d1 execute "${DB_NAME}" --remote --file "${file}"',
    '}',
    '',
    'cd "${ROOT_DIR}"',
    '',
    'echo "ROOT_DIR=${ROOT_DIR}"',
    'echo "IMPORT_DIR=${IMPORT_DIR}"',
    'echo "START_AT=${START_AT} END_AT=${END_AT} SKIP_SCHEMA=${SKIP_SCHEMA}"',
    '',
    'if [[ ! -f "${IMPORT_DIR}/00-schema.sql" ]]; then',
    '  echo "Error: schema file not found: ${IMPORT_DIR}/00-schema.sql" >&2',
    '  exit 1',
    'fi',
    '',
    'if [[ "${SKIP_SCHEMA}" != "1" ]]; then',
    '  echo "[1/3] Applying schema..."',
    '  run_sql_file "${IMPORT_DIR}/00-schema.sql"',
    'else',
    '  echo "[1/3] Skipping schema application"',
    'fi',
    '',
    'echo "[2/3] Importing product chunks..."',
    'shopt -s nullglob',
    'files=("${IMPORT_DIR}"/[0-9][0-9][0-9][0-9]-products.sql)',
    'if [[ ${#files[@]} -eq 0 ]]; then',
    '  echo "Error: no chunk files found in ${IMPORT_DIR}" >&2',
    '  exit 1',
    'fi',
    '',
    'total=${#files[@]}',
    'count=0',
    'imported=0',
    'for file in "${files[@]}"; do',
    '  base="$(basename "$file")"',
    '  num="${base%%-*}"',
    '  count=$((count + 1))',
    '',
    '  if [[ "${num}" < "${START_AT}" || "${num}" > "${END_AT}" ]]; then',
    '    continue',
    '  fi',
    '',
    '  echo "[${count}/${total}] importing ${base}"',
    '  run_sql_file "${file}"',
    '  imported=$((imported + 1))',
    'done',
    '',
    'echo "Imported chunks: ${imported}"',
    '',
    'echo "[3/3] Verifying row count..."',
    'npx wrangler d1 execute "${DB_NAME}" --remote --command "SELECT COUNT(*) AS total_products FROM products;"',
    '',
    'echo "Import completed."'
  ];

  await fs.writeFile(new URL('run-import.sh', OUTPUT_DIR), `${importScript.join('\n')}\n`, { mode: 0o755 });
  await fs.writeFile(new URL('manifest.json', OUTPUT_DIR), JSON.stringify({ chunkSize: CHUNK_SIZE, files: manifest, productCount: products.length }, null, 2));

  console.log(`Prepared D1 import files in ${path.resolve(new URL('.', OUTPUT_DIR).pathname)}`);
  console.log(`Products: ${products.length}`);
  console.log(`Chunks: ${manifest.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
