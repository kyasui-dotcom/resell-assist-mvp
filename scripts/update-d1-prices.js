/**
 * nedan.online D1 の kaitori_price テーブルを最新の price-snapshots.json で更新する。
 * GHActions から呼び出す: node scripts/update-d1-prices.js
 * 環境変数: CLOUDFLARE_API_TOKEN (wrangler が読む)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productsData = JSON.parse(await fs.readFile(path.join(root, 'data/products.json'), 'utf8'));
const snapshotsData = JSON.parse(await fs.readFile(path.join(root, 'output/price-snapshots.json'), 'utf8'));

const products = productsData.products ?? productsData;
const productMap = new Map(products.map((p) => [p.id, p]));
const snapshots = snapshotsData.snapshots ?? [];
const snapshotMap = new Map(snapshots.map((s) => [s.productId, s]));

function marketAverage(m) {
  return m ? Math.round((m.min + m.max) / 2) : null;
}

function fallbackSuggested(product) {
  return {
    standard: marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.rakuma) ?? marketAverage(product.market?.buyback),
    quickSale: marketAverage(product.market?.buyback) ?? marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.rakuma),
    aggressive: marketAverage(product.market?.rakuma) ?? marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.buyback),
  };
}

function sqlEscape(str) {
  return String(str ?? '').replace(/'/g, "''");
}

// 全64商品分のrow生成 (snapshot があるものは最新価格で、ないものは products.json のfallback)
const manifest = JSON.parse(await fs.readFile(path.join(root, 'data/article-manifest.json'), 'utf8'));
const uniqueProductIds = [...new Set(manifest.articles.map((a) => a.productId))];

const rows = [];
const now = Date.now();

for (const productId of uniqueProductIds) {
  const product = productMap.get(productId);
  if (!product) continue;

  const snapshot = snapshotMap.get(productId);
  const fallback = fallbackSuggested(product);
  const suggested = snapshot ? { ...fallback, ...(snapshot.suggested ?? {}) } : fallback;

  const yahooPrice = snapshot?.yahoo?.median ?? marketAverage(product.market?.yahooShopping);
  const rakumaPrice = snapshot?.rakuma?.median ?? marketAverage(product.market?.rakuma);
  const buybackPrice = snapshot?.janpara?.usedMax ?? marketAverage(product.market?.buyback);

  rows.push(
    `('${sqlEscape(productId)}', ` +
    `${suggested.standard ?? 'NULL'}, ` +
    `${suggested.quickSale ?? 'NULL'}, ` +
    `${suggested.aggressive ?? 'NULL'}, ` +
    `${yahooPrice ?? 'NULL'}, ` +
    `${rakumaPrice ?? 'NULL'}, ` +
    `${buybackPrice ?? 'NULL'}, ` +
    `${now})`
  );
}

const sql = [
  'INSERT OR REPLACE INTO kaitori_price (product_id, standard_price, quick_sale_price, aggressive_price, yahoo_price, rakuma_price, buyback_price, updated_at) VALUES',
  rows.join(',\n') + ';',
].join('\n');

const sqlPath = path.join(root, 'output/d1-price-update.sql');
await fs.writeFile(sqlPath, sql, 'utf8');
console.log(`✓ Generated SQL for ${rows.length} products`);

// wrangler 4.x: DB名でのリスト照会 API を避けるため、database_id を含む
// 一時 wrangler.toml を生成して --config で渡す。
const tmpConfig = path.join(root, 'tmp-nedan-wrangler.toml');
await fs.writeFile(tmpConfig, [
  'name = "nedan-d1-updater"',
  'main = "worker.js"',
  'compatibility_date = "2026-01-01"',
  '',
  '[[d1_databases]]',
  'binding = "DB"',
  'database_name = "nedan-jp-db"',
  'database_id = "c480189c-2d88-489e-acd1-934e4848996d"',
].join('\n'), 'utf8');

execSync(
  `npx wrangler d1 execute DB --config "${tmpConfig}" --remote --file="${sqlPath}"`,
  { stdio: 'inherit', env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } }
);
await fs.unlink(tmpConfig).catch(() => {});
console.log('✓ D1 kaitori_price updated');
