import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('/home/kyforever/.openclaw/workspace/resell-assist-mvp');
const dataPath = path.join(root, 'data/products.json');
const snapshotsPath = path.join(root, 'output/price-snapshots.json');
const historyPath = path.join(root, 'output/price-history.json');
const outDir = path.join(root, 'articles');
const manifestPath = path.join(root, 'data/article-manifest.json');

const SITE_NAME = '買取比較.net';
const SITE_URL = 'https://kaitorihikaku.net';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;
const DEFAULT_OG_IMAGE_ALT = `${SITE_NAME}の買取価格比較イメージ`;

const yen = (value) => (Number.isFinite(value) ? `¥${Math.round(value).toLocaleString('ja-JP')}` : '相場確認中');
const hasNumericPrice = (value) => Number.isFinite(value) && value > 0;
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const CATEGORY_META = {
  'スマホ': {
    slug: 'smartphone',
    label: 'iPhone・スマホ',
    audience: '残債・バッテリー・SIM状態で価格差が出やすいカテゴリ',
    caution: '初期化前にeSIM削除・アクティベーションロック解除・残債確認を済ませると事故が減ります。',
    sellPoint: 'バッテリー最大容量と傷の状態を明記すると売値のブレを抑えやすいです。'
  },
  'イヤホン': {
    slug: 'earphone',
    label: 'AirPods・イヤホン',
    audience: '付属品・バッテリー持ち・ケース種別で比較されやすいカテゴリ',
    caution: 'イヤーピースやケースの欠品は価格に効きやすいので、同梱物を先に確認するのが得策です。',
    sellPoint: 'USB-C / Lightning などケース違いをはっきり書くと誤購入を防げます。'
  },
  'ゲーム': {
    slug: 'game',
    label: 'ゲーム機',
    audience: '付属品・限定版・コントローラー状態で価格差が出やすいカテゴリ',
    caution: '箱・純正ケーブル・コントローラーの有無で査定差が大きくなりやすいです。',
    sellPoint: '型番と付属品一覧を明記すると相場より弱く売るミスを減らせます。'
  },
  'タブレット': {
    slug: 'tablet',
    label: 'iPad・タブレット',
    audience: 'Wi‑Fi / Cellular や容量差が価格に直結しやすいカテゴリ',
    caution: 'アクティベーションロック解除、Apple Pencil有無、容量表記の3点を揃えるのが基本です。',
    sellPoint: '通信モデルと容量をタイトル先頭に入れるだけで検索一致率が上がります。'
  },
  'スマートウォッチ': {
    slug: 'watch',
    label: 'Apple Watch',
    audience: 'サイズ・GPS/Cellular・バンド有無で比較されやすいカテゴリ',
    caution: 'バンド欠品や充電ケーブル欠品は地味に効くので、写真と文面の両方で補足したいです。',
    sellPoint: 'サイズと通信仕様を先に見せると、価格訴求より先に比較対象として残れます。'
  },
  'パソコン': {
    slug: 'computer',
    label: 'MacBook・Surface',
    audience: 'CPU/メモリ/SSD容量の組み合わせで価格差が大きいカテゴリ',
    caution: 'キーボード配列、充放電回数、ACアダプタ有無を落とすと比較精度が一気に下がります。',
    sellPoint: 'チップやCPU、RAM、SSDをタイトル内で一列に並べるだけで検索一致がかなり良くなります。'
  },
  'タブレットアクセサリ': {
    slug: 'tablet-accessory',
    label: 'Apple Pencil・Magic Keyboard',
    audience: '対応機種の一致が最重要なアクセサリ系カテゴリ',
    caution: '世代違い・対応サイズ違いの誤出品が起きやすいので、対応機種名を先に出すのが安全です。',
    sellPoint: '型番と対応モデルを先頭に書くと、価格より先に安心感で選ばれやすくなります。'
  },
  'VR': {
    slug: 'vr',
    label: 'Meta Quest・PS VR2',
    audience: '付属コントローラーやストレージ違いで相場差が出やすいカテゴリ',
    caution: 'レンズ傷・ヘッドストラップ・コントローラー動作は必ず補足したいポイントです。',
    sellPoint: '容量と純正付属品の有無を明記すると比較対象として残りやすいです。'
  },
  'カメラ': {
    slug: 'camera',
    label: 'GoPro・アクションカメラ',
    audience: 'レンズ状態とバッテリー/マウント付属で差が出やすいカテゴリ',
    caution: '防水ドアやレンズ傷の状態は隠さず先に出した方が後トラブルを減らせます。',
    sellPoint: '型番と付属バッテリー本数が一目でわかるだけで成約率がかなり変わります。'
  }
};

const INTENTS = [
  ['price-average', '相場', 'の買取相場は？中古で売る前に見る価格目安', '価格相場の全体像を最短で掴みたい検索意図向け。', 'price'],
  ['sell-fast', 'すぐ売る', 'をすぐ売る方法｜宅配買取とフリマの使い分け', 'スピード優先のユーザー向けに、価格よりも時間短縮を軸に解説。', 'compare'],
  ['high-price-tips', '高く売るコツ', 'を高く売るコツ｜査定前にやることを整理', '高単価売却を狙う人向けの改善ポイント整理。', 'price'],
  ['buyback-vs-flea', '買取vsフリマ', 'は買取とフリマどっちが得？価格差と手間を比較', '販路比較の意思決定に特化。', 'compare'],
  ['checklist', '売る前チェック', 'を売る前にやること｜初期化・付属品・状態確認チェック', '準備・チェックリスト需要に特化。', 'prep'],
  ['timing', '売り時', 'の売り時はいつ？価格が落ちやすいタイミングを解説', '売る時期の悩みに回答。', 'price'],
  ['accessories', '付属品', 'は付属品なしでも売れる？査定差が出るポイント', '付属品欠品の不安を解消する意図向け。', 'prep'],
  ['condition', '状態別', 'は傷ありでも売れる？状態別の価格感を解説', '傷あり・使用感ありの悩みに特化。', 'prep'],
  ['storage-difference', '容量・仕様差', 'の容量差・仕様差で価格はどう変わる？比較ポイント', '仕様違いの比較意図向け。', 'price'],
  ['where-to-sell', 'どこで売る', 'はどこで売るのがおすすめ？販路の選び方', '販路選定に迷うユーザー向け。', 'compare'],
  ['data-reading', '相場の見方', 'の相場データの見方｜中央値・買取価格・出品価格の違い', 'データ理解・比較軸の整頓に特化。', 'price'],
  ['listing-copy', '出品文コツ', 'の出品文の書き方｜売れやすい説明の型', 'フリマ掲載前の文面ニーズ向け。', 'prep'],
  ['model-choice', 'モデル選び', 'と近いモデルの違い｜今売るならどれが強い？', '誤比較を防ぐ比較記事ニーズ向け。', 'compare'],
  ['faq', 'FAQ', 'の買取でよくある質問まとめ', 'FAQ回収用の横断記事。', 'prep']
].map(([key, label, suffix, angle, family]) => ({ key, label, suffix, angle, family }));

function getSnapshotMap(snapshotData) {
  return new Map((snapshotData.snapshots ?? []).map((item) => [item.productId, item]));
}

function getHistoryMap(historyData) {
  return new Map((historyData.history ?? []).reduce((acc, item) => {
    if (!item?.productId) return acc;
    const list = acc.get(item.productId) ?? [];
    list.push(item);
    acc.set(item.productId, list);
    return acc;
  }, new Map()));
}

function marketAverage(market) {
  return market ? Math.round((market.min + market.max) / 2) : null;
}

function fallbackSuggested(product) {
  return {
    standard: marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.rakuma) ?? marketAverage(product.market?.buyback),
    quickSale: marketAverage(product.market?.buyback) ?? marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.rakuma),
    aggressive: marketAverage(product.market?.rakuma) ?? marketAverage(product.market?.yahooShopping) ?? marketAverage(product.market?.buyback)
  };
}

function buildSpecSummary(product) {
  return Object.values(product.specs ?? {}).slice(0, 4).join(' / ');
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

function productSlugBase(product) {
  const rawId = String(product.id ?? '');
  const base = slugifyLoose(rawId);
  if (!/-+$/.test(rawId)) return base;

  const colorFallback = slugifyLoose(product.specs?.color || product.name);
  if (!colorFallback || base.endsWith(colorFallback)) return base;
  return `${base}-${colorFallback}`;
}

function makeSlug(product, intent) {
  return `${productSlugBase(product)}-${intent.key}`
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildMarkets(product, snapshot) {
  return [
    { label: 'Yahoo落札相場', price: snapshot?.yahoo?.median ?? marketAverage(product.market?.yahooShopping), note: '売れた価格ベースで標準相場の軸にしやすい' },
    { label: 'ラクマ出品相場', price: snapshot?.rakuma?.median ?? marketAverage(product.market?.rakuma), note: '出品価格なので強気目線の参考' },
    { label: '買取価格', price: snapshot?.janpara?.usedMax ?? marketAverage(product.market?.buyback), note: '即売りラインの基準として見やすい' }
  ];
}

function buildVariantRows(product, products, snapshotMap) {
  return products
    .filter((item) => item.category === product.category && item.series === product.series)
    .map((item) => ({
      id: item.id,
      name: item.name,
      specs: buildSpecSummary(item),
      standard: snapshotMap.get(item.id)?.suggested?.standard ?? fallbackSuggested(item).standard
    }))
    .sort((a, b) => (b.standard ?? 0) - (a.standard ?? 0));
}

function buildSiblingRows(product, products, snapshotMap) {
  return products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .map((item) => ({
      id: item.id,
      name: item.name,
      standard: snapshotMap.get(item.id)?.suggested?.standard ?? fallbackSuggested(item).standard
    }))
    .sort((a, b) => (b.standard ?? 0) - (a.standard ?? 0))
    .slice(0, 6);
}

function buildChecklist(product, categoryMeta) {
  return [
    ...(product.descriptionHints ?? []),
    categoryMeta.caution,
    `${product.name}の実際の相場は、状態・付属品・販路で上下するので同仕様同士で比較する`,
    categoryMeta.sellPoint
  ].slice(0, 6);
}

function buildFaq(product, suggested, categoryMeta) {
  const quickSaleAnswer = hasNumericPrice(suggested.quickSale)
    ? `${product.name}では、高値はフリマ寄りになりやすい一方で、即売りライン ${yen(suggested.quickSale)} を基準にすると買取の納得感も出しやすいです。`
    : `${product.name}では、高値はフリマ寄りになりやすい一方で、早さと手間を優先するなら買取店を基準に考えると判断しやすいです。`;

  const standardAnswer = hasNumericPrice(suggested.standard)
    ? `${categoryMeta.audience}なので、相場は横ばいでも状態差で体感価格が変わります。標準相場 ${yen(suggested.standard)} は目安として扱うのが安全です。`
    : `${categoryMeta.audience}なので、相場は横ばいでも状態差で体感価格が変わります。まずは同仕様・同状態の比較を目安にするのが安全です。`;

  const aggressiveAnswer = hasNumericPrice(suggested.aggressive)
    ? `状態が強く、付属品も揃っているなら ${yen(suggested.aggressive)} を上限目安に設定しやすいです。まずは比較条件を揃えるのが先です。`
    : '状態が強く、付属品も揃っているなら強気の価格設定も狙えます。まずは比較条件を揃えるのが先です。';

  return [
    {
      q: '買取店とフリマはどちらが高い？',
      a: quickSaleAnswer
    },
    {
      q: '相場は毎日変わる？',
      a: standardAnswer
    },
    {
      q: '高く狙うならどこまで目線を上げていい？',
      a: aggressiveAnswer
    }
  ];
}

function buildIntentSections(product, intent, suggested, categoryMeta, markets, checklist) {
  if (intent.family === 'compare') {
    return {
      heading: '販路比較で決めるポイント',
      intro: `${product.name}をどこで売るか迷っている人向けに、価格差だけでなく手間と向き不向きまで並べて考える構成です。`,
      bullets: [
        `最短で現金化したいなら ${yen(suggested.quickSale)} を基準に買取店を優先する`,
        `高値を狙うなら ${yen(suggested.aggressive)} 付近まで見ながらフリマ系を検討する`,
        `${categoryMeta.caution}`
      ],
      matrixTitle: '販路別の向いている人',
      matrixRows: markets.map((market) => ({
        name: market.label,
        point: `${yen(market.price)} 前後`,
        fit: market.label.includes('買取') ? '早く・楽に売りたい人向け' : '少しでも高く売りたい人向け'
      }))
    };
  }

  if (intent.family === 'prep') {
    return {
      heading: '売る前に詰めるべき準備',
      intro: `${product.name}は準備の抜け漏れで減額されやすいので、売却前の確認事項を先に潰すテンプレです。`,
      bullets: checklist.slice(0, 3),
      matrixTitle: '減額を避けるチェック項目',
      matrixRows: checklist.slice(0, 4).map((item, index) => ({
        name: `チェック${index + 1}`,
        point: item,
        fit: '出品前 / 査定前に確認'
      }))
    };
  }

  return {
    heading: '相場判断で先に見るべきこと',
    intro: `${product.name}の相場系キーワードでは、まず価格の基準線を持ってから販路や状態差を見ると迷いにくいです。`,
    bullets: [
      `標準相場 ${yen(suggested.standard)} を起点に考える`,
      `急ぐなら ${yen(suggested.quickSale)}、強気なら ${yen(suggested.aggressive)} を目安にする`,
      `${categoryMeta.sellPoint}`
    ],
    matrixTitle: '価格ラインの使い分け',
    matrixRows: [
      { name: '標準相場', point: yen(suggested.standard), fit: 'まずの判断軸' },
      { name: 'すぐ売るライン', point: yen(suggested.quickSale), fit: '時間優先' },
      { name: '強気価格', point: yen(suggested.aggressive), fit: '状態が強いとき' }
    ]
  };
}

function buildTrend(historyEntries, snapshot) {
  const rows = [...historyEntries].sort((a, b) => new Date(a.snapshotAt ?? 0).getTime() - new Date(b.snapshotAt ?? 0).getTime());
  const current = snapshot?.suggested?.standard ?? rows.at(-1)?.suggested?.standard ?? null;
  const baseline = rows.at(-2)?.suggested?.standard ?? null;
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return { label: '履歴蓄積中', note: '比較できる履歴がまだ少ないため、次回更新以降にトレンド表示を強められます。', deltaJpy: null, deltaRatio: null };
  }

  const deltaJpy = current - baseline;
  const deltaRatio = deltaJpy / baseline;
  const label = deltaJpy > 0 ? 'やや上昇' : deltaJpy < 0 ? 'やや下落' : '横ばい';
  return {
    label,
    note: `前回比 ${deltaJpy > 0 ? '+' : ''}${yen(deltaJpy)} / ${deltaRatio > 0 ? '+' : ''}${(deltaRatio * 100).toFixed(1)}%`,
    deltaJpy,
    deltaRatio
  };
}

function buildArticleDescription(product, suggested, intent) {
  const priceParts = [
    hasNumericPrice(suggested.standard) ? `標準相場 ${yen(suggested.standard)}` : null,
    hasNumericPrice(suggested.quickSale) ? `すぐ売るライン ${yen(suggested.quickSale)}` : null,
    hasNumericPrice(suggested.aggressive) ? `強気価格 ${yen(suggested.aggressive)}` : null
  ].filter(Boolean);

  if (priceParts.length) {
    return `${product.name}について、${priceParts.join('、')} を軸に整理する売却ガイドです。`;
  }

  const specSummary = buildSpecSummary(product);
  return `${product.name}の${intent.label}に向けて、販路選び・状態差・売却前チェックを整理したガイドです。${specSummary ? ` 主な仕様: ${specSummary}。` : ''}`;
}

function buildArticle(product, rawSnapshot, intent, products, snapshotMap, historyMap) {
  const fallback = fallbackSuggested(product);
  const snapshot = rawSnapshot ? { ...rawSnapshot, suggested: { ...fallback, ...(rawSnapshot.suggested ?? {}) } } : { suggested: fallback };
  const suggested = snapshot.suggested;
  const categoryMeta = CATEGORY_META[product.category] ?? {
    slug: encodeURIComponent(product.category),
    label: product.category,
    audience: `${product.category}の比較で見落としやすい差が出るカテゴリ`,
    caution: '状態と仕様を揃えて比較してください。',
    sellPoint: '仕様を先頭に書くと比較されやすくなります。'
  };

  const slug = makeSlug(product, intent);
  const title = `${product.name}${intent.suffix}`;
  const description = buildArticleDescription(product, suggested, intent);
  const canonical = `${SITE_URL}/articles/${slug}.html`;
  const modifiedAt = new Date().toISOString();
  const markets = buildMarkets(product, snapshot);
  const variants = buildVariantRows(product, products, snapshotMap);
  const siblings = buildSiblingRows(product, products, snapshotMap);
  const checklist = buildChecklist(product, categoryMeta);
  const faqs = buildFaq(product, suggested, categoryMeta);
  const relatedArticles = INTENTS.filter((item) => item.key !== intent.key).slice(0, 6);
  const intentSections = buildIntentSections(product, intent, suggested, categoryMeta, markets, checklist);
  const trend = buildTrend(historyMap.get(product.id) ?? [], snapshot);
  const badges = [
    buildSpecSummary(product),
    snapshot?.yahoo?.count ? `Yahoo ${snapshot.yahoo.count}件` : null,
    snapshot?.rakuma?.count ? `ラクマ ${snapshot.rakuma.count}件` : null,
    snapshot?.janpara ? '買取 1件' : null,
    Number.isFinite(rawSnapshot?.confidence) ? `信頼度 ${Math.round(rawSnapshot.confidence * 100)}%` : 'ローカル価格補完あり'
  ].filter(Boolean);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '買取比較.net', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: '売却ガイド記事一覧', item: `${SITE_URL}/articles/index.html` },
      { '@type': 'ListItem', position: 3, name: categoryMeta.label, item: `${SITE_URL}/categories/${categoryMeta.slug}.html` },
      { '@type': 'ListItem', position: 4, name: title, item: canonical }
    ]
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  };

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | ${SITE_NAME}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)} | ${SITE_NAME}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)} | ${SITE_NAME}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:image:alt" content="${DEFAULT_OG_IMAGE_ALT}" />
    <link rel="stylesheet" href="../styles.css" />
    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: title, description, inLanguage: 'ja', url: canonical, dateModified: modifiedAt, mainEntityOfPage: canonical, about: [product.name, product.category, intent.label] })}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
    <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  </head>
  <body>
    <div class="app stack">
      <nav class="pageNav crumbs sub">
        <a href="../index.html">トップ</a>
        <span>›</span>
        <a href="./index.html">記事一覧</a>
        <span>›</span>
        <a href="../categories/${categoryMeta.slug}.html">${escapeHtml(categoryMeta.label)}</a>
      </nav>

      <div class="twoCol">
        <div class="stack">
          <section class="hero stack">
            <div>
              <p class="eyebrow">SEO記事 / ${escapeHtml(categoryMeta.label)} / ${escapeHtml(intent.label)}</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="sub">${escapeHtml(intent.angle)} ${escapeHtml(categoryMeta.audience)}。${escapeHtml(product.name)}の売却判断を、価格・手間・状態差の3軸で整理します。</p>
            <div class="pillRow">${badges.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>
            </div>
            <div class="pageStats">
              <div class="statCard"><span class="statLabel">標準相場</span><span class="statValue">${yen(suggested.standard)}</span></div>
              <div class="statCard"><span class="statLabel">すぐ売るライン</span><span class="statValue">${yen(suggested.quickSale)}</span></div>
              <div class="statCard"><span class="statLabel">強気価格</span><span class="statValue">${yen(suggested.aggressive)}</span></div>
              <div class="statCard"><span class="statLabel">比較軸</span><span class="statValue">価格・状態・販路</span></div>
            </div>
          </section>

          <section class="card stack">
            <div class="sectionHead"><div><p class="eyebrow">Summary</p><h2 class="sectionTitle">結論</h2></div><p class="sub small">まず見るべき3ライン</p></div>
            <div class="summaryGrid">
              <div class="box"><div class="sub">標準相場</div><div class="price">${yen(suggested.standard)}</div><div class="sub">まずはこの価格帯を軸に考える</div></div>
              <div class="box"><div class="sub">すぐ売るライン</div><div class="price">${yen(suggested.quickSale)}</div><div class="sub">時間優先ならここを下限目安にする</div></div>
              <div class="box"><div class="sub">強気価格</div><div class="price">${yen(suggested.aggressive)}</div><div class="sub">状態が強いなら狙える上限</div></div>
            </div>
          </section>

          <section class="card trend stack">
            <strong>トレンド</strong>
            <p class="sub">${escapeHtml(trend.label)} / ${escapeHtml(trend.note)}</p>
            <div class="linkRow">
              <a class="button secondary" href="../index.html#query">トップで今の相場を再確認</a>
              <a class="button secondary" href="../index.html?product=${encodeURIComponent(product.id)}">商品ページを見る</a>
            </div>
          </section>

          <section class="card">
            <h2>${escapeHtml(intentSections.heading)}</h2>
            <p class="sub">${escapeHtml(intentSections.intro)}</p>
            <ul>${intentSections.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </section>

          <section class="card stack">
            <div class="sectionHead"><div><p class="eyebrow">Market view</p><h2 class="sectionTitle">販路ごとの見え方</h2></div><p class="sub small">売り方別の目線差を整理</p></div>
            <div class="marketGrid">${markets.map((market) => `<div class="box"><strong>${escapeHtml(market.label)}</strong><div class="price">${yen(market.price)}</div><p class="sub">${escapeHtml(market.note)}</p></div>`).join('')}</div>
          </section>

          <section class="card">
            <h2>${escapeHtml(intentSections.matrixTitle)}</h2>
            <table>
              <thead><tr><th>項目</th><th>目安</th><th>向いているケース</th></tr></thead>
              <tbody>${intentSections.matrixRows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.point)}</td><td>${escapeHtml(row.fit)}</td></tr>`).join('')}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${escapeHtml(product.name)}で見落としやすいポイント</h2>
            <ul>${checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </section>

          <section class="card">
            <h2>同シリーズ比較</h2>
            <table>
              <thead><tr><th>モデル</th><th>標準相場</th><th>仕様</th></tr></thead>
              <tbody>${variants.map((row) => `<tr><td><a href="../index.html?product=${encodeURIComponent(row.id)}">${escapeHtml(row.name)}</a></td><td>${yen(row.standard)}</td><td>${escapeHtml(row.specs)}</td></tr>`).join('')}</tbody>
            </table>
          </section>

          <section class="card stack">
            <div class="sectionHead"><div><p class="eyebrow">Intent hub</p><h2 class="sectionTitle">関連記事ハブ</h2></div><p class="sub small">近い検索意図を横断</p></div>
            <div class="grid">${relatedArticles.map((item) => `<a class="hubLink" href="./${makeSlug(product, item)}.html">${escapeHtml(product.name)}${escapeHtml(item.suffix)}</a>`).join('')}</div>
          </section>

          <section class="card">
            <h2>カテゴリ導線</h2>
            <div class="linkRow">
              <a class="button" href="../index.html?product=${encodeURIComponent(product.id)}">商品別ページを見る</a>
              <a class="button secondary" href="../categories/${categoryMeta.slug}.html">${escapeHtml(categoryMeta.label)}カテゴリへ</a>
              <a class="button secondary" href="./index.html">記事一覧へ</a>
            </div>
            <div class="grid">${siblings.slice(0, 4).map((row) => `<a class="hubLink" href="../index.html?product=${encodeURIComponent(row.id)}">${escapeHtml(row.name)} / 標準 ${yen(row.standard)}</a>`).join('')}</div>
          </section>

          <section class="card">
            <h2>よくある質問</h2>
            <div class="grid">${faqs.map((item) => `<div class="box"><strong>${escapeHtml(item.q)}</strong><p class="sub">${escapeHtml(item.a)}</p></div>`).join('')}</div>
          </section>
        </div>

        <aside class="stack sticky">
          <section class="card toc stack">
            <p class="eyebrow">この記事で見ること</p>
            <a href="../index.html?product=${encodeURIComponent(product.id)}">商品別ページ</a>
            <a href="../categories/${categoryMeta.slug}.html">カテゴリページ</a>
            <a href="./index.html">記事一覧</a>
          </section>
          <section class="card">
            <p class="eyebrow">更新導線</p>
            <p class="sub">相場は更新で動くので、トップの検索導線で再確認するのが安全です。</p>
            <div class="tagRow">
              <span class="tag">標準 ${yen(suggested.standard)}</span>
              <span class="tag">即売り ${yen(suggested.quickSale)}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </body>
</html>`;

  return { slug, productId: product.id, category: product.category, series: product.series, intent: intent.key, title, description, canonical, modifiedAt, html };
}

function buildHubPage(articles) {
  const grouped = new Map();
  for (const article of articles) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }

  const sectionIdByCategory = new Map(
    [...grouped.keys()].map((category, index) => [category, `category-${index + 1}`])
  );

  const hubTitle = `売却ガイド記事一覧 | ${SITE_NAME}`;
  const hubDescription = '中古売却・買取比較に関する静的記事一覧。商品別の相場、売り時、付属品、状態別の考え方をまとめています。';
  const hubCanonical = `${SITE_URL}/articles/index.html`;
  const collectionStructuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hubTitle,
    description: hubDescription,
    url: hubCanonical,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL
    },
    hasPart: articles.slice(0, 24).map((article) => ({
      '@type': 'Article',
      headline: article.title,
      url: `${SITE_URL}/articles/${article.slug}.html`
    }))
  });
  const breadcrumbStructuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: '売却ガイド記事一覧', item: hubCanonical }
    ]
  });

  const categoryJumpLinks = [...grouped.entries()].map(([category, items]) => (
    `<a class="box" href="#${sectionIdByCategory.get(category)}"><strong>${escapeHtml(category)}</strong><br /><span class="sub small">${items.length.toLocaleString('ja-JP')}本の記事へ移動</span></a>`
  )).join('');

  const sections = [...grouped.entries()].map(([category, items]) => `
    <section id="${sectionIdByCategory.get(category)}" class="card stack">
      <div class="sectionHead"><div><p class="eyebrow">Category</p><h2 class="sectionTitle">${escapeHtml(category)} (${items.length}本)</h2></div><p class="sub small">価格理解から売却判断まで</p></div>
      <div class="gridAuto">${items.slice(0, 36).map((item) => `<a class="box" href="./${item.slug}.html">${escapeHtml(item.title)}</a>`).join('')}</div>
    </section>
  `).join('');

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${hubTitle}</title>
    <meta name="description" content="${hubDescription}" />
    <link rel="canonical" href="${hubCanonical}" />
    <meta property="og:title" content="${hubTitle}" />
    <meta property="og:description" content="${hubDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${hubCanonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${collectionStructuredData}</script>
    <script type="application/ld+json">${breadcrumbStructuredData}</script>
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <div class="app stack">
      <nav class="pageNav crumbs sub" aria-label="パンくず">
        <a href="../index.html">トップ</a>
        <span>›</span>
        <span aria-current="page">売却ガイド記事一覧</span>
      </nav>
      <section class="hero stack">
        <div>
          <p class="eyebrow">Article hub</p>
          <h1>売却ガイド記事一覧</h1>
          <p class="sub sectionIntro">商品別ページだけでは拾い切れない「売り時」「状態別」「付属品」「買取 vs フリマ」などの検索意図を、静的記事としてまとめたハブです。</p>
        </div>
        <div class="pageStats">
          <div class="statCard"><span class="statLabel">公開記事</span><span class="statValue">${articles.length.toLocaleString('ja-JP')}本</span></div>
          <div class="statCard"><span class="statLabel">対象カテゴリ</span><span class="statValue">${grouped.size}</span></div>
          <div class="statCard"><span class="statLabel">主な意図</span><span class="statValue">相場・売り時・販路</span></div>
          <div class="statCard"><span class="statLabel">導線</span><span class="statValue">商品ページ連携</span></div>
        </div>
      </section>
      <section class="card stack">
        <div class="sectionHead"><div><p class="eyebrow">Quick jump</p><h2 class="sectionTitle">カテゴリからすぐ移動</h2></div><p class="sub small">記事数の多いハブでも迷わず辿れるようにしました</p></div>
        <div class="gridAuto">${categoryJumpLinks}</div>
      </section>
      ${sections}
    </div>
  </body>
</html>`;
}

async function main() {
  const products = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const snapshotData = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));
  const historyData = JSON.parse(await fs.readFile(historyPath, 'utf8').catch(() => '{"history":[]}'));
  const snapshotMap = getSnapshotMap(snapshotData);
  const historyMap = getHistoryMap(historyData);
  const articleProductLimit = Number.parseInt(process.env.ARTICLE_PRODUCT_LIMIT ?? '', 10);
  const categoryFilter = new Set(
    String(process.env.ARTICLE_CATEGORY_FILTER ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const targetProducts = products
    .filter((product) => product.market)
    .filter((product) => categoryFilter.size === 0 || categoryFilter.has(product.category))
    .slice(0, Number.isFinite(articleProductLimit) && articleProductLimit > 0 ? articleProductLimit : undefined);

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const articles = [];
  for (const product of targetProducts) {
    const snapshot = snapshotMap.get(product.id) ?? null;
    for (const intent of INTENTS) {
      const article = buildArticle(product, snapshot, intent, targetProducts, snapshotMap, historyMap);
      articles.push(article);
      await fs.writeFile(path.join(outDir, `${article.slug}.html`), article.html, 'utf8');
    }
  }

  await fs.writeFile(path.join(outDir, 'index.html'), buildHubPage(articles), 'utf8');
  await fs.writeFile(manifestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    total: articles.length,
    intents: INTENTS.map((item) => item.key),
    articles: articles.map(({ html, ...article }) => article)
  }, null, 2)}\n`, 'utf8');

  console.log(`Generated ${articles.length} article pages for ${targetProducts.length} products.`);
  if (categoryFilter.size || (Number.isFinite(articleProductLimit) && articleProductLimit > 0)) {
    console.log(`Filters => categories: ${categoryFilter.size ? [...categoryFilter].join(', ') : 'all'}, limit: ${Number.isFinite(articleProductLimit) && articleProductLimit > 0 ? articleProductLimit : 'none'}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});