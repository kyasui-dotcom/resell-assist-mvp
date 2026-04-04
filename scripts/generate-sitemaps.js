import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('/home/kyforever/.openclaw/workspace/resell-assist-mvp');
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

async function main() {
  const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
  const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8').catch(() => '{"articles":[]}'));

  await fs.rm(sitemapDir, { recursive: true, force: true });
  await fs.mkdir(sitemapDir, { recursive: true });

  const categoryUrls = [
    `${siteUrl}/`,
    ...Object.values(CATEGORY_SLUG).map((slug) => `${siteUrl}/categories/${slug}.html`),
    `${siteUrl}/articles/index.html`
  ];

  const articleUrls = (articleManifest.articles ?? []).map((article) => article.canonical).filter(Boolean);

  const files = [];

  await fs.writeFile(path.join(sitemapDir, 'core.xml'), wrapUrlSet(categoryUrls), 'utf8');
  files.push('core.xml');

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
    productCount: 0,
    articleCount: articleUrls.length,
    categoryCount: categoryUrls.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
