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

// wrangler で D1 に実行 (CLOUDFLARE_API_TOKEN は環境変数から自動読み込み)
const DB_ID = 'c480189c-2d88-489e-acd1-934e4848996d';
const ACCOUNT_ID = '125a7d5dea34f38a2f5fdaf5187480d4';
execSync(
  `npx wrangler d1 execute nedan-jp-db --database-id ${DB_ID} --account-id ${ACCOUNT_ID} --remote --file="${sqlPath}"`,
  { stdio: 'inherit', env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' } }
);
console.log('✓ D1 kaitori_price updated');
