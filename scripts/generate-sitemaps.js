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

function wrapUrlSet(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
}

function wrapSitemapIndex(files) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map((file) => `  <sitemap><loc>${siteUrl}/sitemaps/${file}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
}

function stripHtmlExt(url) {
  if (!url) return url;
  return url.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}

async function main() {
  const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
  const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8').catch(() => '{"articles":[]}'));

  await fs.rm(sitemapDir, { recursive: true, force: true });
  await fs.mkdir(sitemapDir, { recursive: true });

  const categoryUrls = uniqueUrls([
    `${siteUrl}/`,
    ...Object.values(CATEGORY_SLUG).map((slug) => `${siteUrl}/categories/${slug}`),
    `${siteUrl}/articles/`
  ]);

  const articleUrls = uniqueUrls(
    (articleManifest.articles ?? [])
      .map((article) => stripHtmlExt(article.canonical))
      .filter(Boolean)
  );

  const productUrls = uniqueUrls(
    (Array.isArray(products) ? products : [])
      .map((product) => product?.id)
      .filter(Boolean)
      .map((id) => `${siteUrl}/products/${encodeURIComponent(id)}.html`)
  );

  const files = [];

  await fs.writeFile(path.join(sitemapDir, 'core.xml'), wrapUrlSet(categoryUrls), 'utf8');
  files.push('core.xml');

  const productChunks = chunk(productUrls, maxUrlsPerFile);
  for (let i = 0; i < productChunks.length; i += 1) {
    const filename = `products-${String(i + 1).padStart(3, '0')}.xml`;
    await fs.writeFile(path.join(sitemapDir, filename), wrapUrlSet(productChunks[i]), 'utf8');
    files.push(filename);
  }

  const articleChunks = chunk(articleUrls, maxUrlsPerFile);
  for (let i = 0; i < articleChunks.length; i += 1) {
    const filename = `articles-${String(i + 1).padStart(3, '0')}.xml`;
    await fs.writeFile(path.join(sitemapDir, filename), wrapUrlSet(articleChunks[i]), 'utf8');
    files.push(filename);
  }

  await fs.writeFile(path.join(root, 'sitemap.xml'), wrapSitemapIndex(files), 'utf8');

  console.log(JSON.stringify({
    sitemapIndex: 'sitemap.xml',
    files,
    productCount: productUrls.length,
    articleCount: articleUrls.length,
    categoryCount: categoryUrls.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
