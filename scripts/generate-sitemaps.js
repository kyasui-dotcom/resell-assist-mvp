import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productsPath = path.join(root, 'data/products.json');
const articleManifestPath = path.join(root, 'data/article-manifest.json');
const sitemapDir = path.join(root, 'sitemaps');
const siteUrl = 'https://kaitorihikaku.net';
const maxUrlsPerFile = 45000;

const CATEGORY_SLUG = {
  'スマホ': 'smartphone',
  'イヤホン': 'earphone',
  'ゲーム': 'game',
  'タブレット': 'tablet',
  'スマートウォッチ': 'watch',
  'パソコン': 'computer',
  'タブレットアクセサリ': 'tablet-accessory',
  'VR': 'vr',
  'カメラ': 'camera',
  'オーディオ': 'audio',
  '生活家電': 'home-appliance',
  '美容家電': 'beauty',
  'カメラアクセサリ': 'camera-accessory',
  'スマートホーム': 'smart-home',
  'ウェアラブル': 'wearable',
  '小型家電': 'small-electronics',
  'ヘルスケア': 'healthcare'
};

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function wrapUrlSet(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => {
    const loc = typeof entry === 'string' ? entry : entry.loc;
    const lastmod = typeof entry === 'object' && entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
    return `  <url><loc>${loc}</loc>${lastmod}</url>`;
  }).join('\n')}\n</urlset>\n`;
}

function wrapSitemapIndex(files, lastmod) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map((file) => `  <sitemap><loc>${siteUrl}/sitemaps/${file}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`).join('\n')}\n</sitemapindex>\n`;
}

function stripHtmlExt(url) {
  if (!url) return url;
  return url.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
}

function uniqueEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const loc = typeof entry === 'string' ? entry : entry?.loc;
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    out.push(entry);
  }
  return out;
}

async function main() {
  const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
  const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8').catch(() => '{"articles":[]}'));

  await fs.rm(sitemapDir, { recursive: true, force: true });
  await fs.mkdir(sitemapDir, { recursive: true });

  const buildDate = toDateOnly(new Date());
  const manifestDate = toDateOnly(articleManifest.generatedAt) || buildDate;

  // article ごとの最新 modifiedAt
  const articleLastmodMap = new Map();
  let maxArticleLastmod = null;
  for (const article of articleManifest.articles ?? []) {
    const url = stripHtmlExt(article.canonical);
    const lm = toDateOnly(article.modifiedAt) || manifestDate;
    if (!url) continue;
    articleLastmodMap.set(url, lm);
    if (!maxArticleLastmod || lm > maxArticleLastmod) maxArticleLastmod = lm;
  }
  const articlesIndexLastmod = maxArticleLastmod || manifestDate;

  const categoryEntries = uniqueEntries([
    { loc: `${siteUrl}/`, lastmod: buildDate },
    ...Object.values(CATEGORY_SLUG).map((slug) => ({ loc: `${siteUrl}/categories/${slug}`, lastmod: buildDate })),
    { loc: `${siteUrl}/articles/`, lastmod: articlesIndexLastmod }
  ]);

  const articleEntries = uniqueEntries(
    [...articleLastmodMap.entries()].map(([loc, lastmod]) => ({ loc, lastmod }))
  );

  const productEntries = uniqueEntries(
    (Array.isArray(products) ? products : [])
      .map((product) => product?.id)
      .filter(Boolean)
      .map((id) => ({ loc: `${siteUrl}/products/${encodeURIComponent(id)}.html`, lastmod: buildDate }))
  );

  const files = [];

  await fs.writeFile(path.join(sitemapDir, 'core.xml'), wrapUrlSet(categoryEntries), 'utf8');
  files.push('core.xml');

  const productChunks = chunk(productEntries, maxUrlsPerFile);
  for (let i = 0; i < productChunks.length; i += 1) {
    const filename = `products-${String(i + 1).padStart(3, '0')}.xml`;
    await fs.writeFile(path.join(sitemapDir, filename), wrapUrlSet(productChunks[i]), 'utf8');
    files.push(filename);
  }

  const articleChunks = chunk(articleEntries, maxUrlsPerFile);
  for (let i = 0; i < articleChunks.length; i += 1) {
    const filename = `articles-${String(i + 1).padStart(3, '0')}.xml`;
    await fs.writeFile(path.join(sitemapDir, filename), wrapUrlSet(articleChunks[i]), 'utf8');
    files.push(filename);
  }

  await fs.writeFile(path.join(root, 'sitemap.xml'), wrapSitemapIndex(files, buildDate), 'utf8');

  console.log(JSON.stringify({
    sitemapIndex: 'sitemap.xml',
    files,
    productCount: productEntries.length,
    articleCount: articleEntries.length,
    categoryCount: categoryEntries.length,
    buildDate
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
