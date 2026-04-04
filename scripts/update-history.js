import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';

const snapshotsPath = new URL('../output/price-snapshots.json', import.meta.url);
const historyPath = new URL('../output/price-history.json', import.meta.url);
const MAX_HISTORY_PER_PRODUCT = 3;

const snapshotData = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));
const current = snapshotData.snapshots ?? [];

let historyData = { generatedAt: null, history: [] };
try {
  historyData = JSON.parse(await fs.readFile(historyPath, 'utf8'));
} catch {}

const existing = Array.isArray(historyData.history) ? historyData.history : [];
const perProduct = new Map();

function normalizeEntry(entry) {
  return {
    productId: entry.productId,
    snapshotAt: entry.snapshotAt,
    suggested: entry.suggested ?? null,
    yahoo: entry.yahoo ?? null,
    rakuma: entry.rakuma ?? null,
    janpara: entry.janpara ?? null,
    confidence: entry.confidence ?? null,
    sourceModes: entry.sourceModes ?? null
  };
}

function pushEntry(entry) {
  if (!entry?.productId || !entry?.snapshotAt) return;
  const list = perProduct.get(entry.productId) ?? [];
  list.push(normalizeEntry(entry));
  perProduct.set(entry.productId, list);
}

for (const entry of existing) pushEntry(entry);
for (const entry of current) pushEntry(entry);

const history = [];
for (const [productId, entries] of perProduct.entries()) {
  const deduped = new Map();
  for (const entry of entries) {
    deduped.set(entry.snapshotAt, entry);
  }
  const trimmed = [...deduped.values()]
    .sort((a, b) => new Date(b.snapshotAt ?? 0).getTime() - new Date(a.snapshotAt ?? 0).getTime())
    .slice(0, MAX_HISTORY_PER_PRODUCT)
    .sort((a, b) => new Date(a.snapshotAt ?? 0).getTime() - new Date(b.snapshotAt ?? 0).getTime());

  for (const entry of trimmed) {
    history.push({ productId, ...entry });
  }
}

history.sort((a, b) => {
  if (a.productId !== b.productId) return a.productId.localeCompare(b.productId);
  return new Date(a.snapshotAt ?? 0).getTime() - new Date(b.snapshotAt ?? 0).getTime();
});

const stream = createWriteStream(historyPath, { encoding: 'utf8' });
stream.write('{"generatedAt":');
stream.write(JSON.stringify(new Date().toISOString()));
stream.write(',"retention":');
stream.write(JSON.stringify({ maxHistoryPerProduct: MAX_HISTORY_PER_PRODUCT }));
stream.write(',"history":[');

for (let i = 0; i < history.length; i += 1) {
  if (i > 0) stream.write(',');
  stream.write(JSON.stringify(history[i]));
}

stream.write(']}\n');
await new Promise((resolve, reject) => {
  stream.on('finish', resolve);
  stream.on('error', reject);
  stream.end();
});

console.log(`Updated price history with ${current.length} current snapshots -> total ${history.length} entries (max ${MAX_HISTORY_PER_PRODUCT}/product)`);
