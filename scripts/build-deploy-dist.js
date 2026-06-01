import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const deployDir = path.join(root, 'deploy-dist');

const STATIC_FILES = [
  'index.html',
  'app.js',
  'styles.css',
  'worker.js',
  'robots.txt',
  'ads.txt',
  'og-image.svg',
  'og-image.png',
  '_headers',
  '_redirects',
  'google586bfb8e8307adb8.html'
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFileSafe(srcRel, destRel = srcRel) {
  const src = path.join(root, srcRel);
  const dest = path.join(deployDir, destRel);
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDirRecursive(srcRel, destRel = srcRel) {
  const src = path.join(root, srcRel);
  const dest = path.join(deployDir, destRel);
  await fs.rm(dest, { recursive: true, force: true });
  await ensureDir(dest);

  async function walk(currentSrc, currentDest) {
    await ensureDir(currentDest);
    for (const entry of await fs.readdir(currentSrc, { withFileTypes: true })) {
      const srcPath = path.join(currentSrc, entry.name);
      const destPath = path.join(currentDest, entry.name);
      if (entry.isDirectory()) {
        await walk(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await walk(src, dest);
}

async function buildFallbackCategorySummary() {
  const products = JSON.parse(await fs.readFile(path.join(root, 'data/products.json'), 'utf8'));
  const categories = new Map();

  for (const product of products) {
    const list = categories.get(product.category) ?? [];
    list.push(product);
    categories.set(product.category, list);
  }

  const payload = {
    source: 'static-fallback',
    totalCategories: categories.size,
    totalProducts: products.length,
    categories: [...categories.entries()].map(([category, items]) => ({
      category,
      count: items.length,
      topItems: items
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          series: item.series,
          specBadges: item.specBadges ?? [],
          summary_specs: Object.values(item.specs ?? {}).filter(Boolean).join(' / ')
        }))
    }))
  };

  await fs.writeFile(path.join(deployDir, 'fallback-category-summary.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  await fs.rm(deployDir, { recursive: true, force: true });
  await ensureDir(deployDir);

  for (const file of STATIC_FILES) {
    await copyFileSafe(file);
  }

  await copyDirRecursive('articles');
  await copyDirRecursive('categories');
  await copyDirRecursive('sitemaps');
  await copyDirRecursive('lib');
  await copyFileSafe('sitemap.xml');
  await buildFallbackCategorySummary();

  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.push(path.relative(deployDir, full));
    }
  }
  await walk(deployDir);

  console.log(JSON.stringify({
    deployDir,
    fileCount: files.length,
    sample: files.slice(0, 40)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
