import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('/home/kyforever/.openclaw/workspace/resell-assist-mvp');
const dataPath = path.join(root, 'data/products.json');
const snapshotsPath = path.join(root, 'output/price-snapshots.json');
const historyPath = path.join(root, 'output/price-history.json');
const outDir = path.join(root, 'products');
const articleManifestPath = path.join(root, 'data/article-manifest.json');

const yen = (value) => (Number.isFinite(value) ? `¥${Math.round(value).toLocaleString('ja-JP')}` : '—');
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const marketLabels = {
  yahooShopping: 'Yahooオークション落札相場',
  rakuma: 'ラクマ出品価格',
  buyback: '買取サービス'
};

const CATEGORY_SLUG = {
  'スマホ': 'smartphone',
  'イヤホン': 'earphone',
  'ゲーム': 'game',
  'タブレット': 'tablet',
  'スマートウォッチ': 'watch',
  'パソコン': 'computer',
  'タブレットアクセサリ': 'tablet-accessory',
  'VR': 'vr',
  'カメラ': 'camera'
};

const CATEGORY_AFFILIATE = {
  'スマホ': {
    label: 'PR｜スマホを早く売るならネットオフの宅配買取も確認',
    note: 'iPhoneやスマホをすぐ売りたい人向けの導線。提携承認後に正式リンクへ差し替えます。'
  },
  'ゲーム': {
    label: 'PR｜Switch・PS5をまとめて売るならゲーム買取ブラザーズも確認',
    note: 'ゲーム機をまとめて売りたい人向けの導線。提携承認後に正式リンクへ差し替えます。'
  }
};

function buildOfficialLinks(product) {
  const q = encodeURIComponent(product.name);
  const lower = `${product.series ?? ''} ${product.name}`.toLowerCase();
  const links = [];

  if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('airpods') || lower.includes('apple watch')) {
    links.push({ label: 'Apple公式検索', href: `https://www.apple.com/jp/search/${q}` });
  }
  if (lower.includes('switch') || lower.includes('nintendo')) {
    links.push({ label: '任天堂公式検索', href: `https://www.nintendo.co.jp/search/index.html?q=${q}` });
  }
  if (lower.includes('playstation') || lower.includes('ps5')) {
    links.push({ label: 'PlayStation公式検索', href: `https://www.playstation.com/ja-jp/search/?q=${q}` });
  }

  return links;
}

function buildReferenceLinks(product) {
  const query = encodeURIComponent(product.name);
  const model = product.searchTokens?.find((token) => /[a-z]{2,}\d|\//i.test(token)) ?? product.name;
  const modelQuery = encodeURIComponent(`${product.name} ${model}`.trim());

  return [
    {
      label: 'メルカリで最新出品を見る',
      href: `https://jp.mercari.com/search?keyword=${query}`,
      note: '取得が難しいため、参考リンクとして最新出品を確認。'
    },
    {
      label: 'Yahooオークション検索で確認',
      href: `https://auctions.yahoo.co.jp/search/search?p=${query}`,
      note: '落札相場とは別に、現行出品の確認用。'
    },
    {
      label: 'ラクマ検索で確認',
      href: `https://fril.jp/s?query=${query}`,
      note: '補助ソースとして現行出品も確認。'
    },
    {
      label: 'じゃんぱら検索で確認',
      href: `https://buy.janpara.co.jp/buy/search?keyword=${modelQuery}`,
      note: '公開買取価格の検索リンク。'
    }
  ];
}

function slugifyLoose(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugFor(product) {
  const rawId = String(product.id ?? '');
  const base = slugifyLoose(rawId);
  if (!/-+$/.test(rawId)) return base;

  const colorFallback = slugifyLoose(product.specs?.color || product.name);
  if (!colorFallback || base.endsWith(colorFallback)) return base;
  return `${base}-${colorFallback}`;
}

function marketAverage(market) {
  return Math.round((market.min + market.max) / 2);
}

function fallbackSuggested(product) {
  const yahoo = product.market?.yahooShopping ? marketAverage(product.market.yahooShopping) : null;
  const rakuma = product.market?.rakuma ? marketAverage(product.market.rakuma) : null;
  const buyback = product.market?.buyback ? marketAverage(product.market.buyback) : null;
  return {
    standard: yahoo ?? rakuma ?? buyback,
    quickSale: buyback ?? yahoo ?? rakuma,
    aggressive: rakuma ?? yahoo ?? buyback
  };
}

function buildDescription(product, snapshot) {
  const price = snapshot?.suggested?.standard ? `標準相場は${yen(snapshot.suggested.standard)}` : '標準相場の目安を掲載';
  return `${product.name}の中古価格比較ページ。${price}。買取価格・ヤフオク落札相場・ラクマ価格を比較して、おすすめの売り方を確認できます。`;
}

function buildRelated(products, current) {
  return products
    .filter((item) => item.category === current.category && item.id !== current.id)
    .slice(0, 6);
}

function buildTrend(historyEntries, snapshot) {
  const rows = [...historyEntries].sort((a, b) => new Date(a.snapshotAt ?? 0).getTime() - new Date(b.snapshotAt ?? 0).getTime());
  const current = snapshot?.suggested?.standard ?? rows.at(-1)?.suggested?.standard ?? null;
  const baseline = rows.at(-2)?.suggested?.standard ?? null;
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return { label: '履歴蓄積中', note: '前回比較に十分な履歴がまだありません。トップの検索から最新相場を見直してください。' };
  }
  const delta = current - baseline;
  const ratio = (delta / baseline) * 100;
  return {
    label: delta > 0 ? 'やや上昇' : delta < 0 ? 'やや下落' : '横ばい',
    note: `前回比 ${delta > 0 ? '+' : ''}${yen(delta)} / ${ratio > 0 ? '+' : ''}${ratio.toFixed(1)}%`
  };
}

function buildPage(product, snapshot, related, articleLinks, historyEntries) {
  const title = `${product.name}の買取価格・売却相場比較 | 買取比較.net`;
  const description = buildDescription(product, snapshot);
  const canonical = `https://kaitorihikaku.net/products/${slugFor(product)}.html`;
  const fallback = fallbackSuggested(product);
  const standard = snapshot?.suggested?.standard ?? fallback.standard ?? null;
  const quick = snapshot?.suggested?.quickSale ?? fallback.quickSale ?? null;
  const aggressive = snapshot?.suggested?.aggressive ?? fallback.aggressive ?? null;
  const notes = snapshot?.notes?.length ? snapshot.notes : product.descriptionHints;
  const sourceBadges = [];
  if (snapshot?.yahoo?.count) sourceBadges.push(`Yahoo ${snapshot.yahoo.count}件`);
  if (snapshot?.rakuma?.count) sourceBadges.push(`ラクマ ${snapshot.rakuma.count}件`);
  if (snapshot?.janpara) sourceBadges.push('買取 1件');
  const trend = buildTrend(historyEntries, snapshot);

  const marketCards = Object.entries(product.market).map(([key, market]) => `
    <div class="marketCard">
      <strong>${escapeHtml(marketLabels[key] ?? key)}</strong>
      <div class="price">${yen(marketAverage(market))}</div>
      <p class="sub">掲載レンジ ${yen(market.min)} 〜 ${yen(market.max)}</p>
    </div>
  `).join('');

  const relatedLinks = related.map((item) => `
    <a class="relatedLink" href="./${slugFor(item)}.html">${escapeHtml(item.name)}</a>
  `).join('');
  const referenceLinks = buildReferenceLinks(product).map((item) => `
    <a class="relatedLink" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>
  `).join('');
  const officialLinks = buildOfficialLinks(product).map((item) => `
    <a class="relatedLink" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>
  `).join('');

  const specTags = Object.values(product.specs ?? {}).map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join('');
  const noteItems = notes.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const affiliate = CATEGORY_AFFILIATE[product.category] ?? null;
  const explainer = product.category === 'スマホ'
    ? 'スマホはバッテリー状態や残債有無で価格差が大きく出やすいカテゴリです。標準相場だけでなく、すぐ売る価格とおすすめ販路も見ながら判断すると失敗しにくくなります。'
    : product.category === 'ゲーム'
      ? 'ゲーム機は付属品の有無と状態差で価格が大きく動きます。宅配買取と個人売買の差も出やすいので、相場だけでなく手間も含めて比較するのがおすすめです。'
      : '相場を見るときは、状態・付属品・型番の一致を前提に比較するのが大切です。標準相場だけでなく、すぐ売る価格と販路ごとの差も合わせて確認してください。';

  const categorySlug = CATEGORY_SLUG[product.category] ?? encodeURIComponent(product.category);

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <link rel="stylesheet" href="../styles.css" />
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      category: product.category,
      description,
      brand: '買取比較.net',
      offers: standard ? {
        '@type': 'Offer',
        priceCurrency: 'JPY',
        price: standard,
        availability: 'https://schema.org/InStock',
        url: canonical
      } : undefined
    })}</script>
  </head>
  <body>
    <div class="app stack">
      <nav class="pageNav sub"><a href="../index.html">トップ</a> › <a href="../categories/${categorySlug}.html">カテゴリ</a> › ${escapeHtml(product.name)}</nav>
      <section class="hero stack">
        <p class="eyebrow">中古価格比較 / 商品別ページ</p>
        <h1>${escapeHtml(product.name)} の買取価格・売却相場比較</h1>
        <p class="sub sectionIntro">${escapeHtml(description)}</p>
        <div class="tagRow">${specTags}${sourceBadges.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join('')}</div>
        <div class="pageStats">
          <div class="statCard"><span class="statLabel">標準相場</span><span class="statValue">${yen(standard)}</span></div>
          <div class="statCard"><span class="statLabel">すぐ売るライン</span><span class="statValue">${yen(quick)}</span></div>
          <div class="statCard"><span class="statLabel">強気価格</span><span class="statValue">${yen(aggressive)}</span></div>
          <div class="statCard"><span class="statLabel">比較範囲</span><span class="statValue">${Object.keys(product.market).length}販路</span></div>
        </div>
      </section>

      <section class="card trendCard stack">
        <div class="sectionHead"><div><p class="eyebrow">Trend</p><h2 class="sectionTitle">価格トレンド</h2></div><p class="sub small">前回比較ベース</p></div>
        <p class="sub">${escapeHtml(trend.label)} / ${escapeHtml(trend.note)}</p>
        <div class="actions">
          <a class="button secondary" href="../index.html#query">トップで再検索する</a>
          <a class="button secondary" href="../articles/index.html">売却ガイド記事一覧</a>
        </div>
      </section>

      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">Snapshot</p><h2 class="sectionTitle">価格の目安</h2></div><p class="sub small">相場・即売り・上限感を一画面で確認</p></div>
        <div class="priceHero">
          <div class="priceCard">
            <div class="sub">標準相場</div>
            <div class="price">${yen(standard)}</div>
            <div class="sub">Yahoo落札中央値ベース</div>
          </div>
          <div class="priceCard">
            <div class="sub">すぐ売るなら</div>
            <div class="price">${yen(quick)}</div>
            <div class="sub">買取価格 / 下位相場より</div>
          </div>
          <div class="priceCard">
            <div class="sub">強気価格</div>
            <div class="price">${yen(aggressive)}</div>
            <div class="sub">状態が良ければ狙える上限目安</div>
          </div>
        </div>
      </section>

      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">Market</p><h2 class="sectionTitle">販路別の比較</h2></div><p class="sub small">価格の出方とレンジを比較</p></div>
        <div class="marketGrid">${marketCards}</div>
      </section>

      <section class="card">
        <h2>この相場ページの見方</h2>
        <p class="sub">${escapeHtml(explainer)}</p>
      </section>

      <section class="card">
        <h2>売る前のチェックポイント</h2>
        <ul>${noteItems}</ul>
      </section>

      ${affiliate ? `<section class="card affiliateCard"><p class="eyebrow">提携候補</p><h2>${escapeHtml(affiliate.label)}</h2><p class="sub">${escapeHtml(affiliate.note)}</p><div class="actions"><a class="button" href="${escapeHtml(affiliate.href)}" rel="nofollow sponsored" target="_blank">${escapeHtml(affiliate.cta)}</a></div><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3765629&pid=892576351" height="1" width="1" border="0" alt="" /></section>` : ''}

      <section class="card">
        <h2>おすすめアクション</h2>
        <div class="actions">
          <a class="button" href="../index.html">トップで相場を再検索する</a>
          <a class="button secondary" href="../categories/${categorySlug}.html">カテゴリページへ</a>
          <a class="button secondary" href="../articles/index.html">記事ハブへ</a>
        </div>
      </section>

      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">Reference</p><h2 class="sectionTitle">参考リンク</h2></div><p class="sub small">現行出品・検索導線の確認用</p></div>
        <div class="related">${referenceLinks}</div>
      </section>

      ${officialLinks ? `<section class="card"><h2>公式URLの確認導線</h2><p class="sub">型番・世代違いを避けたいときは、まず公式の検索導線で商品名を確認すると安全です。</p><div class="related">${officialLinks}</div></section>` : ''}

      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">Guide</p><h2 class="sectionTitle">関連する記事</h2></div><p class="sub small">売り時・状態差・販路比較の補足</p></div>
        <div class="related">${articleLinks.map((item) => `<a class="relatedLink" href="../articles/${item.slug}.html">${escapeHtml(item.title)}</a>`).join('') || '<span class="sub">関連記事を準備中です。</span>'}</div>
      </section>

      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">More models</p><h2 class="sectionTitle">関連する商品ページ</h2></div><p class="sub small">近いカテゴリの相場と並べて比較</p></div>
        <div class="related">${relatedLinks || '<span class="sub">関連ページを準備中です。</span>'}</div>
      </section>
    </div>
  </body>
</html>`;
}

async function main() {
  const products = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const snapshotData = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));
  const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8').catch(() => '{"articles":[]}'));
  const historyData = JSON.parse(await fs.readFile(historyPath, 'utf8').catch(() => '{"history":[]}'));
  const snapshotMap = new Map((snapshotData.snapshots ?? []).map((item) => [item.productId, item]));
  const historyMap = new Map();
  for (const row of historyData.history ?? []) {
    const list = historyMap.get(row.productId) ?? [];
    list.push(row);
    historyMap.set(row.productId, list);
  }
  const supportedProducts = products.filter((product) => product.market);

  await fs.mkdir(outDir, { recursive: true });

  for (const product of supportedProducts) {
    const snapshot = snapshotMap.get(product.id);
    const related = buildRelated(supportedProducts, product);
    const articleLinks = (articleManifest.articles ?? []).filter((item) => item.productId === product.id).slice(0, 6);
    const html = buildPage(product, snapshot, related, articleLinks, historyMap.get(product.id) ?? []);
    await fs.writeFile(path.join(outDir, `${slugFor(product)}.html`), html, 'utf8');
  }

  const categoryEntries = [
    'smartphone',
    'earphone',
    'game',
    'tablet',
    'watch'
  ].map((slug) => `  <url><loc>https://kaitorihikaku.net/categories/${slug}.html</loc></url>`).join('\n');

  let articleEntries = '  <url><loc>https://kaitorihikaku.net/articles/index.html</loc></url>';
  try {
    const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8'));
    const urls = (articleManifest.articles ?? []).map((article) => `  <url><loc>${article.canonical}</loc></url>`);
    articleEntries = ['  <url><loc>https://kaitorihikaku.net/articles/index.html</loc></url>', ...urls].join('\n');
  } catch {
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kaitorihikaku.net/</loc></url>
${categoryEntries}
${articleEntries}
${supportedProducts.map((product) => `  <url><loc>https://kaitorihikaku.net/products/${slugFor(product)}.html</loc></url>`).join('\n')}
</urlset>`;
  await fs.writeFile(path.join(root, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`Generated ${supportedProducts.length} product pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});