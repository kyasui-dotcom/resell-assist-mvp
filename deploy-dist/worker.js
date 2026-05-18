import { buildSearchIndex, collectSpecBadges, computeMarkets, searchProducts } from './lib/core.js';
import { articleRedirects } from './lib/article-redirects.js';

const SEARCH_CACHE_TTL_SECONDS = 60 * 15;
const CATEGORY_CACHE_TTL_SECONDS = 60 * 30;
const FALLBACK_CATEGORY_SUMMARY_PATH = '/fallback-category-summary.json';
const CATEGORY_SLUGS = {
  'スマホ': 'smartphone',
  'ゲーム': 'game',
  'イヤホン': 'earphone',
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

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', init.cacheControl || 'public, max-age=60');
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers
  });
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function categoryHref(category) {
  return `/categories/${CATEGORY_SLUGS[category] || encodeURIComponent(category)}`;
}

function buildCandidatePriceLabel(product) {
  const markets = computeMarkets(product);
  const mins = markets.map((market) => market.min);
  const maxs = markets.map((market) => market.max);
  const min = Math.min(...mins);
  const max = Math.max(...maxs);
  return `¥${Math.round(min).toLocaleString('ja-JP')}〜¥${Math.round(max).toLocaleString('ja-JP')}`;
}

function buildProductSummary(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    series: product.series ?? null,
    specBadges: collectSpecBadges(product),
    priceLabel: buildCandidatePriceLabel(product),
    productUrl: `./products/${product.id}.html`
  };
}

function parseProduct(row) {
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json);
  } catch {
    return null;
  }
}

async function queryProductsByIds(env, ids = []) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const { results } = await env.kaitorihikaku_db
    .prepare(`SELECT id, payload_json FROM products WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all();

  const map = new Map((results || []).map((row) => [row.id, parseProduct(row)]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

async function searchCatalog(env, query, limit = 5) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return { normalizedQuery: '', best: null, candidates: [], ambiguous: false, totalConsidered: 0 };
  }

  const cacheKey = `search:v1:${normalizedQuery.toLowerCase()}:${limit}`;
  const cached = await env.SEARCH_CACHE?.get(cacheKey, 'json');
  if (cached) return cached;

  const tokens = normalizedQuery
    .normalize('NFKC')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/["']/g, '').trim())
    .filter(Boolean)
    .slice(0, 8);

  let candidateIds = [];

  if (tokens.length) {
    const ftsQuery = tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(' OR ');
    try {
      const { results } = await env.kaitorihikaku_db
        .prepare(`
          SELECT id
          FROM products_fts
          WHERE products_fts MATCH ?
          LIMIT ?
        `)
        .bind(ftsQuery, Math.max(40, limit * 8))
        .all();
      candidateIds = (results || []).map((row) => row.id).filter(Boolean);
    } catch {
      candidateIds = [];
    }
  }

  if (!candidateIds.length) {
    const likePatterns = [normalizedQuery, ...tokens].slice(0, 5).map((token) => `%${escapeLike(token)}%`);
    const statements = likePatterns.map((pattern) => env.kaitorihikaku_db
      .prepare(`
        SELECT id
        FROM products
        WHERE name LIKE ? ESCAPE '\\'
           OR series LIKE ? ESCAPE '\\'
           OR category LIKE ? ESCAPE '\\'
        LIMIT ?
      `)
      .bind(pattern, pattern, pattern, Math.max(20, limit * 6)));
    const rows = statements.length ? await env.kaitorihikaku_db.batch(statements) : [];
    candidateIds = rows.flatMap((item) => item.results || []).map((row) => row.id).filter(Boolean);
  }

  candidateIds = [...new Set(candidateIds)].slice(0, Math.max(60, limit * 10));
  const candidateProducts = (await queryProductsByIds(env, candidateIds)).map(buildSearchIndex);
  const result = searchProducts(candidateProducts, normalizedQuery, { limit });

  const payload = {
    normalizedQuery: result.normalizedQuery,
    ambiguous: result.ambiguous,
    totalConsidered: candidateProducts.length,
    best: result.best
      ? {
          score: result.best.score,
          product: buildProductSummary(result.best.product)
        }
      : null,
    candidates: result.candidates.map((entry) => ({
      score: entry.score,
      product: buildProductSummary(entry.product)
    }))
  };

  await env.SEARCH_CACHE?.put(cacheKey, JSON.stringify(payload), { expirationTtl: SEARCH_CACHE_TTL_SECONDS });
  return payload;
}

async function getProductById(env, id) {
  const row = await env.kaitorihikaku_db
    .prepare('SELECT payload_json FROM products WHERE id = ? LIMIT 1')
    .bind(id)
    .first();

  return parseProduct(row);
}

function renderDynamicProductPage(product) {
  const markets = computeMarkets(product);
  const marketCards = markets.map((market) => `
    <div class="marketCard">
      <strong>${escapeHtml(market.label)}</strong>
      <div class="price">¥${Math.round(market.min).toLocaleString('ja-JP')}〜¥${Math.round(market.max).toLocaleString('ja-JP')}</div>
      <p class="sub">手間: ${escapeHtml(market.effortLabel)} / スピード: ${escapeHtml(market.speedLabel)}</p>
    </div>
  `).join('');

  const specBadges = collectSpecBadges(product)
    .map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`)
    .join('');

  const title = `${product.name}の買取価格・売却相場比較 | 買取比較.net`;
  const description = `${product.name} の中古売却相場ページです。買取・フリマ・オークションの価格帯をまとめて確認できます。`;
  const canonicalUrl = `https://kaitorihikaku.net/products/${encodeURIComponent(product.id)}.html`;
  const breadcrumbJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'トップ', item: 'https://kaitorihikaku.net/' },
      { '@type': 'ListItem', position: 2, name: product.category, item: `https://kaitorihikaku.net${categoryHref(product.category)}` },
      { '@type': 'ListItem', position: 3, name: product.name, item: canonicalUrl }
    ]
  };
  const productJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    category: product.category,
    sku: product.id,
    description,
    offers: markets[0] ? {
      '@type': 'AggregateOffer',
      priceCurrency: 'JPY',
      lowPrice: Math.round(Math.min(...markets.map((m) => m.min))),
      highPrice: Math.round(Math.max(...markets.map((m) => m.max))),
      offerCount: markets.length,
      url: canonicalUrl
    } : undefined
  };

  return new Response(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
    <script type="application/ld+json">${JSON.stringify(productJson)}</script>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="app stack">
      <nav class="pageNav sub"><a href="/">トップ</a> › <a href="${categoryHref(product.category)}">${escapeHtml(product.category)}</a> › ${escapeHtml(product.name)}</nav>
      <section class="hero stack">
        <p class="eyebrow">中古価格比較 / 商品別ページ</p>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="sub sectionIntro">${escapeHtml(description)}</p>
        <div class="tagRow">${specBadges}</div>
      </section>
      <section class="card stack">
        <p class="eyebrow">価格帯</p>
        <div class="marketGrid">${marketCards}</div>
      </section>
      <section class="card stack">
        <p class="eyebrow">使い方</p>
        <p class="sub">状態・付属品・型番の一致を前提に比較するのがおすすめです。トップに戻ると別商品の検索もできます。</p>
        <div class="chips"><a class="chip chipRich" href="/?q=${encodeURIComponent(product.name)}"><span>トップで検索する</span><small>${escapeHtml(product.name)}</small></a></div>
      </section>
    </div>
  </body>
</html>`, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=1800'
    }
  });
}

function renderProductNotFoundPage(id) {
  return new Response(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>商品データ準備中 | 買取比較.net</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="app stack">
      <section class="hero stack">
        <p class="eyebrow">中古価格比較</p>
        <h1>商品データを準備中です</h1>
        <p class="sub sectionIntro">${escapeHtml(id)} の個別ページはまだ準備中か、データ更新待ちです。</p>
        <div class="chips"><a class="chip chipRich" href="/"><span>トップへ戻る</span><small>検索とカテゴリ一覧を開く</small></a></div>
      </section>
    </div>
  </body>
</html>`, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60'
    }
  });
}

async function getFallbackCategorySummary(env) {
  try {
    const response = await env.ASSETS.fetch(new Request(`https://fallback.local${FALLBACK_CATEGORY_SUMMARY_PATH}`));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getCategorySummary(env) {
  const cacheKey = 'category-summary:v2';
  const cached = await env.SEARCH_CACHE?.get(cacheKey, 'json');
  if (cached) return cached;

  try {
    const counts = await env.kaitorihikaku_db
      .prepare('SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY count DESC, category ASC')
      .all();

    const categories = [];
    for (const row of counts.results || []) {
      const top = await env.kaitorihikaku_db
        .prepare('SELECT id, payload_json FROM products WHERE category = ? ORDER BY name ASC LIMIT 4')
        .bind(row.category)
        .all();

      const topItems = (top.results || [])
        .map(parseProduct)
        .filter(Boolean)
        .map(buildProductSummary);

      categories.push({
        category: row.category,
        count: Number(row.count || 0),
        topItems
      });
    }

    const payload = {
      totalCategories: categories.length,
      totalProducts: categories.reduce((sum, entry) => sum + entry.count, 0),
      categories
    };

    if (payload.totalProducts > 0) {
      await env.SEARCH_CACHE?.put(cacheKey, JSON.stringify(payload), { expirationTtl: CATEGORY_CACHE_TTL_SECONDS });
      return payload;
    }
  } catch {
    // fall through to static fallback asset when D1 is empty or unavailable
  }

  const fallback = await getFallbackCategorySummary(env);
  if (fallback) {
    await env.SEARCH_CACHE?.put(cacheKey, JSON.stringify(fallback), { expirationTtl: 60 * 5 });
    return fallback;
  }

  return {
    totalCategories: 0,
    totalProducts: 0,
    categories: []
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/search') {
      const query = url.searchParams.get('q') || '';
      const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit') || 5)));
      return json(await searchCatalog(env, query, limit), { cacheControl: 'public, max-age=60, s-maxage=300' });
    }

    if (url.pathname === '/api/categories/summary') {
      return json(await getCategorySummary(env), { cacheControl: 'public, max-age=300, s-maxage=1800' });
    }

    if (url.pathname.startsWith('/api/products/')) {
      const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
      const product = await getProductById(env, id);
      if (!product) {
        return json({ error: 'not_found' }, { status: 404, cacheControl: 'public, max-age=60' });
      }
      return json({ product }, { cacheControl: 'public, max-age=300, s-maxage=1800' });
    }

    if (url.pathname.startsWith('/products/') && url.pathname.endsWith('.html')) {
      const id = decodeURIComponent(url.pathname.replace('/products/', '').replace(/\.html$/, ''));
      const product = await getProductById(env, id);
      if (!product) return renderProductNotFoundPage(id);
      return renderDynamicProductPage(product);
    }

    // 色違いでdedup されて消えた旧記事URL → 代表色のURLへ301
    if (url.pathname.startsWith('/articles/')) {
      const slugPart = url.pathname.replace(/^\/articles\//, '').replace(/\.html$/, '').replace(/\/$/, '');
      const canonicalSlug = slugPart ? articleRedirects[slugPart] : null;
      if (canonicalSlug) {
        const target = new URL(`/articles/${canonicalSlug}`, url.origin);
        return new Response(null, {
          status: 301,
          headers: { Location: target.toString(), 'Cache-Control': 'public, max-age=86400' }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
