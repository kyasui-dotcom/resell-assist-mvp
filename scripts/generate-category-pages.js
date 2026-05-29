import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data/products.json');
const snapshotsPath = path.join(root, 'output/price-snapshots.json');
const articleManifestPath = path.join(root, 'data/article-manifest.json');
const outDir = path.join(root, 'categories');

const SITE_NAME = '買取比較.net';
const SITE_URL = 'https://kaitorihikaku.net';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_OG_IMAGE_ALT = `${SITE_NAME}の買取価格比較イメージ`;
const PAGE_SIZE = 120;
const MAX_STANDARD_ITEMS = Number(process.env.MAX_STANDARD_ITEMS || 120);
const MAX_COMPUTER_PAGES = Number(process.env.MAX_COMPUTER_PAGES || 3);

const CATEGORY_META = {
  'スマホ': { slug: 'smartphone', title: 'iPhone・スマホ買取価格比較', lead: 'iPhoneやスマホを売る前に、標準相場・すぐ売る価格・おすすめ販路を比較できるカテゴリページです。', affiliate: null },
  'ゲーム': { slug: 'game', title: 'Switch・PS5買取価格比較', lead: 'Nintendo SwitchやPS5を売る前に、買取価格と売却相場を比較できるカテゴリページです。', affiliate: null },
  'イヤホン': { slug: 'earphone', title: 'AirPods・イヤホン買取価格比較', lead: 'イヤホン・ヘッドホンの売却相場と買取価格を比較できるカテゴリページです。', affiliate: null },
  'タブレット': { slug: 'tablet', title: 'iPad・タブレット買取価格比較', lead: 'タブレットの標準相場と買取価格を比較できるカテゴリページです。', affiliate: null },
  'スマートウォッチ': { slug: 'watch', title: 'スマートウォッチ買取価格比較', lead: 'Apple Watchなどスマートウォッチの中古相場と買取価格を比較できるカテゴリページです。', affiliate: null },
  'パソコン': { slug: 'computer', title: 'パソコン買取価格比較', lead: 'MacBookやSurface、ThinkPadなどPC系モデルの売却相場をシリーズ別に比較できるカテゴリページです。', affiliate: null },
  'タブレットアクセサリ': { slug: 'tablet-accessory', title: 'タブレットアクセサリ買取価格比較', lead: 'Apple PencilやMagic Keyboardなど周辺機器の中古相場を比較できるカテゴリページです。', affiliate: null },
  'VR': { slug: 'vr', title: 'VR機器買取価格比較', lead: 'Meta QuestやPS VR2などVR機器の売却相場を比較できるカテゴリページです。', affiliate: null },
  'カメラ': { slug: 'camera', title: 'カメラ買取価格比較', lead: 'GoProなどカメラの中古相場と買取価格を比較できるカテゴリページです。', affiliate: null },
  'オーディオ': { slug: 'audio', title: 'オーディオ買取価格比較', lead: 'スピーカーやヘッドホンなどオーディオ機器の相場を比較できます。', affiliate: null },
  '生活家電': { slug: 'home-appliance', title: '生活家電買取価格比較', lead: '掃除機・調理家電など生活家電の売却相場を比較できます。', affiliate: null },
  '美容家電': { slug: 'beauty', title: '美容家電買取価格比較', lead: '美容機器の売却相場と買取価格を比較できます。', affiliate: null },
  'カメラアクセサリ': { slug: 'camera-accessory', title: 'カメラアクセサリ買取価格比較', lead: 'レンズや周辺機器などカメラアクセサリの相場を比較できます。', affiliate: null },
  'スマートホーム': { slug: 'smart-home', title: 'スマートホーム買取価格比較', lead: 'SwitchBotやGoogle Homeなどスマートホーム機器の相場を比較できます。', affiliate: null },
  'ウェアラブル': { slug: 'wearable', title: 'ウェアラブル買取価格比較', lead: 'FitbitやGarminなどウェアラブル機器の相場を比較できます。', affiliate: null },
  '小型家電': { slug: 'small-electronics', title: '小型家電買取価格比較', lead: 'モバイルバッテリーや小型ガジェットの相場を比較できます。', affiliate: null },
  'ヘルスケア': { slug: 'healthcare', title: 'ヘルスケア機器買取価格比較', lead: '血圧計などヘルスケア機器の売却相場を比較できます。', affiliate: null }
};

const COMPUTER_GROUPS = [
  { slug: 'computer-macbook-air', label: 'MacBook Air', test: (p) => /macbook air/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-macbook-pro', label: 'MacBook Pro', test: (p) => /macbook pro/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-mac-desktop', label: 'Mac desktop', test: (p) => /(mac mini|imac|mac studio)/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-surface', label: 'Surface', test: (p) => /surface/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-thinkpad-xps-spectre', label: 'ThinkPad / XPS / Spectre', test: (p) => /(thinkpad|xps|spectre)/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-gaming-handheld', label: 'Gaming handheld', test: (p) => /(rog ally|steam deck)/i.test(`${p.series} ${p.name}`) },
  { slug: 'computer-other', label: 'その他PC', test: () => true }
];

const yen = (value) => (Number.isFinite(value) ? `¥${Math.round(value).toLocaleString('ja-JP')}` : '—');
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const marketAverage = (market) => market ? Math.round((market.min + market.max) / 2) : null;
const getSuggested = (product, snapshot) => snapshot?.suggested?.standard ?? marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.rakuma) ?? marketAverage(product.market?.buyback);
const paginate = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

function productHref(productId) {
  return `../index.html?product=${encodeURIComponent(productId)}`;
}

function productCard(item) {
  return `<a class="productCard" href="${productHref(item.id)}"><div class="productTop"><strong>${escapeHtml(item.name)}</strong><span class="price">${yen(item.standard)}</span></div><p class="sub">${escapeHtml(item.summary)}</p><div class="tagRow">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div></a>`;
}

function pageShell({ title, description, canonical, nav, heroTitle, heroLead, stats, body, aside = '', structuredData = [] }) {
  const ldJson = structuredData
    .filter(Boolean)
    .map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`)
    .join('');
  return `<!doctype html><html lang="ja"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}" /><meta name="robots" content="index,follow" /><link rel="canonical" href="${canonical}" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:type" content="website" /><meta property="og:url" content="${canonical}" /><meta property="og:site_name" content="${SITE_NAME}" /><meta property="og:image" content="${DEFAULT_OG_IMAGE}" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="${escapeHtml(DEFAULT_OG_IMAGE_ALT)}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:description" content="${escapeHtml(description)}" /><meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" /><meta name="twitter:image:alt" content="${escapeHtml(DEFAULT_OG_IMAGE_ALT)}" />${ldJson}<link rel="stylesheet" href="../styles.css" /><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9351947872274309" crossorigin="anonymous"></script></head><body><div class="app stack"><nav class="pageNav sub">${nav}</nav><section class="hero stack"><div><p class="eyebrow">カテゴリ別ページ</p><h1>${escapeHtml(heroTitle)}</h1><p class="sub sectionIntro">${escapeHtml(heroLead)}</p><div class="linkRow"><a class="button" href="../index.html#query">トップで相場を検索</a><a class="button secondary" href="../articles/">記事ハブを見る</a></div></div><div class="pageStats">${stats.map((s) => `<div class="statCard"><span class="statLabel">${escapeHtml(s.label)}</span><span class="statValue">${escapeHtml(s.value)}</span></div>`).join('')}</div></section><div class="twoCol"><div class="stack">${body}</div>${aside ? `<aside class="stack sticky">${aside}</aside>` : ''}</div></div></body></html>`;
}

function buildStandardCategoryPage(category, items, articles) {
  const meta = CATEGORY_META[category] ?? { slug: encodeURIComponent(category), title: `${category}買取価格比較`, lead: `${category}の中古相場と買取価格を比較できます。` };
  const sorted = items.slice().sort((a, b) => (b.standard ?? 0) - (a.standard ?? 0));
  const cards = sorted.slice(0, MAX_STANDARD_ITEMS).map(productCard).join('');
  const articleCards = articles.slice(0, 12).map((article) => `<a class="articleCard" href="../articles/${article.slug}.html"><strong>${escapeHtml(article.title)}</strong><p class="sub">${escapeHtml(article.intentLabel)} / ${escapeHtml(article.productName)}</p></a>`).join('') || '<p class="sub">関連記事を準備中です。</p>';
  const canonical = `${SITE_URL}/categories/${meta.slug}`;
  const description = `${meta.lead} 人気モデルの標準相場、すぐ売る価格、おすすめ販路をまとめて確認できます。`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: meta.title, item: canonical }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: meta.title,
      description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: sorted.slice(0, MAX_STANDARD_ITEMS).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: `${SITE_URL}/?product=${encodeURIComponent(item.id)}`
        }))
      }
    }
  ];
  return pageShell({
    title: `${meta.title} | ${SITE_NAME}`,
    description,
    canonical,
    nav: `<a href="../index.html">トップ</a> › ${escapeHtml(meta.title)}`,
    heroTitle: meta.title,
    heroLead: meta.lead,
    stats: [
      { label: '掲載モデル', value: items.length.toLocaleString('ja-JP') },
      { label: '関連記事', value: articles.length.toLocaleString('ja-JP') },
      { label: '表示件数', value: Math.min(items.length, MAX_STANDARD_ITEMS).toLocaleString('ja-JP') },
      { label: 'カテゴリ導線', value: '比較・売り方・相場' }
    ],
    body: `<section class="card stack"><div class="sectionHead"><div><p class="eyebrow">Coverage</p><h2 class="sectionTitle">人気モデルの価格比較</h2></div><p class="sub small">高単価帯から比較しやすい順で表示</p></div><div class="gridAuto">${cards}</div></section><section class="card stack"><div class="sectionHead"><div><p class="eyebrow">Guide</p><h2 class="sectionTitle">このカテゴリの関連記事</h2></div></div><div class="gridAuto">${articleCards}</div></section>`,
    aside: `<section class="card stack"><p class="eyebrow">カテゴリ内リンク</p><div class="grid">${sorted.slice(0, 8).map((item) => `<a class="articleCard" href="${productHref(item.id)}">${escapeHtml(item.name)} / ${yen(item.standard)}</a>`).join('')}</div></section>`,
    structuredData
  });
}

function buildComputerHubPage(items) {
  const groups = COMPUTER_GROUPS.map((group) => ({ ...group, items: items.filter(group.test) })).filter((g) => g.items.length);
  const canonical = `${SITE_URL}/categories/computer`;
  const description = 'MacBook、Surface、ThinkPadなどパソコン系モデルをシリーズ別に分割して比較できます。';
  const body = `<section class="card stack"><div class="sectionHead"><div><p class="eyebrow">PC categories</p><h2 class="sectionTitle">シリーズ別に分割して掲載</h2></div><p class="sub small">巨大ページを避けて見やすくしました</p></div><div class="gridAuto">${groups.map((g) => `<a class="productCard" href="./${g.slug}.html"><div class="productTop"><strong>${escapeHtml(g.label)}</strong><span class="price">${g.items.length.toLocaleString('ja-JP')}件</span></div><p class="sub">代表シリーズごとに相場比較をまとめています。</p></a>`).join('')}</div></section>`;
  return pageShell({
    title: `パソコン買取価格比較 | ${SITE_NAME}`,
    description,
    canonical,
    nav: `<a href="../index.html">トップ</a> › パソコン買取価格比較`,
    heroTitle: 'パソコン買取価格比較',
    heroLead: 'パソコンカテゴリは件数が多いため、MacBook・Surface・ThinkPadなどシリーズ別に分割して見やすくしています。',
    stats: [
      { label: '掲載モデル', value: items.length.toLocaleString('ja-JP') },
      { label: '分割カテゴリ', value: groups.length.toLocaleString('ja-JP') },
      { label: '主な対象', value: 'Mac / Surface / ThinkPad' },
      { label: '閲覧方針', value: 'シリーズ別に比較' }
    ],
    body,
    aside: '',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'パソコン買取価格比較', item: canonical }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'パソコン買取価格比較',
        description,
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` }
      }
    ]
  });
}

function buildComputerGroupPage(group, items) {
  const pages = paginate(items.slice().sort((a, b) => (b.standard ?? 0) - (a.standard ?? 0)), PAGE_SIZE).slice(0, MAX_COMPUTER_PAGES);
  return pages.map((pageItems, index) => {
    const pageNo = index + 1;
    const slug = pageNo === 1 ? group.slug : `${group.slug}-${pageNo}`;
    const canonical = `${SITE_URL}/categories/${slug}`;
    const pagination = pages.length > 1 ? `<div class="linkRow">${pages.map((_, i) => {
      const target = i === 0 ? `${group.slug}.html` : `${group.slug}-${i + 1}.html`;
      const klass = i === index ? 'button' : 'button secondary';
      return `<a class="${klass}" href="./${target}">Page ${i + 1}</a>`;
    }).join('')}</div>` : '';
    const body = `<section class="card stack"><div class="sectionHead"><div><p class="eyebrow">Coverage</p><h2 class="sectionTitle">${escapeHtml(group.label)} の価格比較</h2></div><p class="sub small">${pageNo}/${pages.length}ページ</p></div>${pagination}<div class="gridAuto">${pageItems.map(productCard).join('')}</div>${pagination}</section>`;
    const aside = `<section class="card stack"><p class="eyebrow">PCカテゴリ</p><div class="grid">${COMPUTER_GROUPS.filter((g) => g.slug !== 'computer-other').map((g) => `<a class="articleCard" href="./${g.slug}.html">${escapeHtml(g.label)}</a>`).join('')}</div></section>`;
    const description = `${group.label} の売却相場と買取価格を比較できます。`;
    return {
      slug,
      html: pageShell({
        title: `${group.label}買取価格比較 | ${SITE_NAME}`,
        description,
        canonical,
        nav: `<a href="../index.html">トップ</a> › <a href="./computer.html">パソコン</a> › ${escapeHtml(group.label)}`,
        heroTitle: `${group.label} 買取価格比較`,
        heroLead: `${group.label} をシリーズ別・モデル別に比較できます。`,
        stats: [
          { label: '掲載モデル', value: items.length.toLocaleString('ja-JP') },
          { label: '現在ページ', value: `${pageNo}/${pages.length}` },
          { label: '1ページ件数', value: PAGE_SIZE.toLocaleString('ja-JP') },
          { label: 'カテゴリ', value: 'パソコン' }
        ],
        body,
        aside,
        structuredData: [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'パソコン買取価格比較', item: `${SITE_URL}/categories/computer` },
              { '@type': 'ListItem', position: 3, name: `${group.label} 買取価格比較`, item: canonical }
            ]
          },
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${group.label} 買取価格比較`,
            description,
            url: canonical,
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` }
          }
        ]
      })
    };
  });
}

async function main() {
  const products = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const snapshotData = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));
  const articleManifest = JSON.parse(await fs.readFile(articleManifestPath, 'utf8').catch(() => '{"articles":[]}'));
  const snapshotMap = new Map((snapshotData.snapshots ?? []).map((item) => [item.productId, item]));

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const grouped = new Map();
  for (const product of products) {
    if (!product.market) continue;
    const snapshot = snapshotMap.get(product.id);
    const items = grouped.get(product.category) ?? [];
    items.push({ ...product, standard: getSuggested(product, snapshot), summary: `${product.series ?? product.name} の標準相場やおすすめ販路を確認できます。`, tags: Object.values(product.specs ?? {}).slice(0, 3) });
    grouped.set(product.category, items);
  }

  const articleByCategory = new Map();
  for (const article of articleManifest.articles ?? []) {
    const list = articleByCategory.get(article.category) ?? [];
    list.push({ ...article, intentLabel: article.intent, productName: article.productId });
    articleByCategory.set(article.category, list);
  }

  for (const [category, items] of grouped.entries()) {
    const meta = CATEGORY_META[category] ?? { slug: encodeURIComponent(category) };
    if (category === 'パソコン') {
      await fs.writeFile(path.join(outDir, 'computer.html'), buildComputerHubPage(items), 'utf8');
      const groups = COMPUTER_GROUPS.map((group) => ({ ...group, items: items.filter(group.test) })).filter((g) => g.items.length);
      for (const group of groups) {
        for (const page of buildComputerGroupPage(group, group.items)) {
          await fs.writeFile(path.join(outDir, `${page.slug}.html`), page.html, 'utf8');
        }
      }
      continue;
    }
    await fs.writeFile(path.join(outDir, `${meta.slug}.html`), buildStandardCategoryPage(category, items, articleByCategory.get(category) ?? []), 'utf8');
  }

  console.log(`Generated ${grouped.size} category groups.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
