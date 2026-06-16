/**
 * resell-assist-mvp → nedan.online D1 インポートスクリプト
 *
 * 出力:
 *   output/d1-import/kaitori-articles.sql  — article テーブルへの INSERT (896件)
 *   output/d1-import/kaitori-prices.sql    — kaitori_price テーブルへの INSERT (64件)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'output/d1-import');

const products = JSON.parse(await fs.readFile(path.join(root, 'data/products.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'data/article-manifest.json'), 'utf8'));
const snapshotsData = JSON.parse(await fs.readFile(path.join(root, 'output/price-snapshots.json'), 'utf8'));

const productMap = new Map((products.products ?? products).map((p) => [p.id, p]));
const snapshotMap = new Map((snapshotsData.snapshots ?? []).map((s) => [s.productId, s]));

const CATEGORY_META = {
  'スマホ': { caution: '初期化前にeSIM削除・アクティベーションロック解除・残債確認を済ませると事故が減ります。', sellPoint: 'バッテリー最大容量と傷の状態を明記すると売値のブレを抑えやすいです。', audience: '残債・バッテリー・SIM状態で価格差が出やすいカテゴリ' },
  'イヤホン': { caution: 'イヤーピースやケースの欠品は価格に効きやすいので、同梱物を先に確認するのが得策です。', sellPoint: 'USB-C / Lightning などケース違いをはっきり書くと誤購入を防げます。', audience: '付属品・バッテリー持ち・ケース種別で比較されやすいカテゴリ' },
  'ゲーム': { caution: '箱・純正ケーブル・コントローラーの有無で査定差が大きくなりやすいです。', sellPoint: '型番と付属品一覧を明記すると相場より弱く売るミスを減らせます。', audience: '付属品・限定版・コントローラー状態で価格差が出やすいカテゴリ' },
  'タブレット': { caution: 'アクティベーションロック解除、Apple Pencil有無、容量表記の3点を揃えるのが基本です。', sellPoint: '通信モデルと容量をタイトル先頭に入れるだけで検索一致率が上がります。', audience: 'Wi‑Fi / Cellular や容量差が価格に直結しやすいカテゴリ' },
  'スマートウォッチ': { caution: 'バンド欠品や充電ケーブル欠品は地味に効くので、写真と文面の両方で補足したいです。', sellPoint: 'サイズと通信仕様を先に見せると、価格訴求より先に比較対象として残れます。', audience: 'サイズ・GPS/Cellular・バンド有無で比較されやすいカテゴリ' },
  'パソコン': { caution: 'キーボード配列、充放電回数、ACアダプタ有無を落とすと比較精度が一気に下がります。', sellPoint: 'チップやCPU、RAM、SSDをタイトル内で一列に並べるだけで検索一致がかなり良くなります。', audience: 'CPU/メモリ/SSD容量の組み合わせで価格差が大きいカテゴリ' },
  'タブレットアクセサリ': { caution: '世代違い・対応サイズ違いの誤出品が起きやすいので、対応機種名を先に出すのが安全です。', sellPoint: '型番と対応モデルを先頭に書くと、価格より先に安心感で選ばれやすくなります。', audience: '対応機種の一致が最重要なアクセサリ系カテゴリ' },
  'VR': { caution: 'レンズ傷・ヘッドストラップ・コントローラー動作は必ず補足したいポイントです。', sellPoint: '容量と純正付属品の有無を明記すると比較対象として残りやすいです。', audience: '付属コントローラーやストレージ違いで相場差が出やすいカテゴリ' },
  'カメラ': { caution: '防水ドアやレンズ傷の状態は隠さず先に出した方が後トラブルを減らせます。', sellPoint: '型番と付属バッテリー本数が一目でわかるだけで成約率がかなり変わります。', audience: 'レンズ状態とバッテリー/マウント付属で差が出やすいカテゴリ' },
};

const INTENTS = [
  { key: 'price-average', label: '相場', suffix: 'の買取相場は？中古で売る前に見る価格目安', angle: '価格相場の全体像を最短で掴みたい検索意図向け。', family: 'price' },
  { key: 'sell-fast', label: 'すぐ売る', suffix: 'をすぐ売る方法｜宅配買取とフリマの使い分け', angle: 'スピード優先のユーザー向けに、価格よりも時間短縮を軸に解説。', family: 'compare' },
  { key: 'high-price-tips', label: '高く売るコツ', suffix: 'を高く売るコツ｜査定前にやることを整理', angle: '高単価売却を狙う人向けの改善ポイント整理。', family: 'price' },
  { key: 'buyback-vs-flea', label: '買取vsフリマ', suffix: 'は買取とフリマどっちが得？価格差と手間を比較', angle: '販路比較の意思決定に特化。', family: 'compare' },
  { key: 'checklist', label: '売る前チェック', suffix: 'を売る前にやること｜初期化・付属品・状態確認チェック', angle: '準備・チェックリスト需要に特化。', family: 'prep' },
  { key: 'timing', label: '売り時', suffix: 'の売り時はいつ？価格が落ちやすいタイミングを解説', angle: '売る時期の悩みに回答。', family: 'price' },
  { key: 'accessories', label: '付属品', suffix: 'は付属品なしでも売れる？査定差が出るポイント', angle: '付属品欠品の不安を解消する意図向け。', family: 'prep' },
  { key: 'condition', label: '状態別', suffix: 'は傷ありでも売れる？状態別の価格感を解説', angle: '傷あり・使用感ありの悩みに特化。', family: 'prep' },
  { key: 'storage-difference', label: '容量・仕様差', suffix: 'の容量差・仕様差で価格はどう変わる？比較ポイント', angle: '仕様違いの比較意図向け。', family: 'price' },
  { key: 'where-to-sell', label: 'どこで売る', suffix: 'はどこで売るのがおすすめ？販路の選び方', angle: '販路選定に迷うユーザー向け。', family: 'compare' },
  { key: 'data-reading', label: '相場の見方', suffix: 'の相場データの見方｜中央値・買取価格・出品価格の違い', angle: 'データ理解・比較軸の整頓に特化。', family: 'price' },
  { key: 'listing-copy', label: '出品文コツ', suffix: 'の出品文の書き方｜売れやすい説明の型', angle: 'フリマ掲載前の文面ニーズ向け。', family: 'prep' },
  { key: 'model-choice', label: 'モデル選び', suffix: 'と近いモデルの違い｜今売るならどれが強い？', angle: '誤比較を防ぐ比較記事ニーズ向け。', family: 'compare' },
  { key: 'faq', label: 'FAQ', suffix: 'の買取でよくある質問まとめ', angle: 'FAQ回収用の横断記事。', family: 'prep' },
];

function yen(v) {
  return Number.isFinite(v) && v > 0 ? `¥${Math.round(v).toLocaleString('ja-JP')}` : '相場確認中';
}

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

function buildChecklist(product, categoryMeta) {
  return [
    ...(product.descriptionHints ?? []),
    categoryMeta.caution,
    `${product.name}の実際の相場は、状態・付属品・販路で上下するので同仕様同士で比較する`,
    categoryMeta.sellPoint,
  ].slice(0, 6);
}

function buildFaq(product, suggested, categoryMeta) {
  return [
    {
      q: '買取店とフリマはどちらが高い？',
      a: Number.isFinite(suggested.quickSale)
        ? `${product.name}では、高値はフリマ寄りになりやすい一方で、即売りライン ${yen(suggested.quickSale)} を基準にすると買取の納得感も出しやすいです。`
        : `${product.name}では、高値はフリマ寄りになりやすい一方で、早さと手間を優先するなら買取店を基準に考えると判断しやすいです。`,
    },
    {
      q: '相場は毎日変わる？',
      a: Number.isFinite(suggested.standard)
        ? `${categoryMeta.audience}なので、相場は横ばいでも状態差で体感価格が変わります。標準相場 ${yen(suggested.standard)} は目安として扱うのが安全です。`
        : `${categoryMeta.audience}なので、相場は横ばいでも状態差で体感価格が変わります。まずは同仕様・同状態の比較を目安にするのが安全です。`,
    },
    {
      q: '高く狙うならどこまで目線を上げていい？',
      a: Number.isFinite(suggested.aggressive)
        ? `状態が強く、付属品も揃っているなら ${yen(suggested.aggressive)} を上限目安に設定しやすいです。まずは比較条件を揃えるのが先です。`
        : '状態が強く、付属品も揃っているなら強気の価格設定も狙えます。まずは比較条件を揃えるのが先です。',
    },
  ];
}

function buildIntentSections(product, intent, suggested, categoryMeta) {
  const markets = [
    { label: 'Yahoo落札相場', note: '売れた価格ベースで標準相場の軸にしやすい' },
    { label: 'ラクマ出品相場', note: '出品価格なので強気目線の参考' },
    { label: '買取価格', note: '即売りラインの基準として見やすい' },
  ];

  if (intent.family === 'compare') {
    return {
      heading: '販路比較で決めるポイント',
      intro: `${product.name}をどこで売るか迷っている人向けに、価格差だけでなく手間と向き不向きまで並べて考える構成です。`,
      bullets: [
        `最短で現金化したいなら ${yen(suggested.quickSale)} を基準に買取店を優先する`,
        `高値を狙うなら ${yen(suggested.aggressive)} 付近まで見ながらフリマ系を検討する`,
        categoryMeta.caution,
      ],
      matrixTitle: '販路別の向いている人',
      matrixRows: markets.map((m) => ({
        name: m.label,
        fit: m.label.includes('買取') ? '早く・楽に売りたい人向け' : '少しでも高く売りたい人向け',
      })),
    };
  }

  if (intent.family === 'prep') {
    const checklist = buildChecklist(product, categoryMeta);
    return {
      heading: '売る前に詰めるべき準備',
      intro: `${product.name}は準備の抜け漏れで減額されやすいので、売却前の確認事項を先に潰すテンプレです。`,
      bullets: checklist.slice(0, 3),
      matrixTitle: '減額を避けるチェック項目',
      matrixRows: checklist.slice(0, 4).map((item, i) => ({
        name: `チェック${i + 1}`,
        fit: item,
      })),
    };
  }

  return {
    heading: '相場判断で先に見るべきこと',
    intro: `${product.name}の相場系キーワードでは、まず価格の基準線を持ってから販路や状態差を見ると迷いにくいです。`,
    bullets: [
      `標準相場 ${yen(suggested.standard)} を起点に考える`,
      `急ぐなら ${yen(suggested.quickSale)}、強気なら ${yen(suggested.aggressive)} を目安にする`,
      categoryMeta.sellPoint,
    ],
    matrixTitle: '価格ラインの使い分け',
    matrixRows: [
      { name: '標準相場', fit: 'まずの判断軸' },
      { name: 'すぐ売るライン', fit: '時間優先' },
      { name: '強気価格', fit: '状態が強いとき' },
    ],
  };
}

function buildMarkdown(product, intent, suggested, categoryMeta) {
  const title = `${product.name}${intent.suffix}`;
  const intentSections = buildIntentSections(product, intent, suggested, categoryMeta);
  const checklist = buildChecklist(product, categoryMeta);
  const faqs = buildFaq(product, suggested, categoryMeta);
  const relatedIntents = INTENTS.filter((i) => i.key !== intent.key).slice(0, 6);

  return `## 結論：3つの価格ライン

${product.name}の売却判断では、まず以下の3ラインを基準にします。

| 区分 | 目安価格 |
|------|---------|
| 標準相場 | ${yen(suggested.standard)} |
| すぐ売るライン | ${yen(suggested.quickSale)} |
| 強気価格 | ${yen(suggested.aggressive)} |

[PRICE_WIDGET]

## ${intentSections.heading}

${intentSections.intro}

${intentSections.bullets.map((b) => `- ${b}`).join('\n')}

## 販路ごとの価格帯

Yahoo落札・ラクマ・買取の3つを軸に比較すると判断しやすくなります。

| 販路 | 向いているケース |
|------|---------------|
${intentSections.matrixRows.map((r) => `| ${r.name} | ${r.fit} |`).join('\n')}

## ${product.name}で見落としやすいポイント

${checklist.map((c) => `- ${c}`).join('\n')}

## よくある質問

${faqs.map((f) => `### Q. ${f.q}\nA. ${f.a}`).join('\n\n')}

## 関連ガイド

${relatedIntents.map((ri) => `- [${product.name}${ri.suffix}](/articles/kaitori-${product.id.replace(/[^\w-]/g, '-')}-${ri.key})`).join('\n')}
`;
}

function sqlEscape(str) {
  return String(str ?? '').replace(/'/g, "''");
}

// ── Generate kaitori_price SQL (64 rows) ─────────────────
const uniqueProductIds = [...new Set(manifest.articles.map((a) => a.productId))];

const priceSqlRows = [];
for (const productId of uniqueProductIds) {
  const product = productMap.get(productId);
  if (!product) continue;

  const snapshot = snapshotMap.get(productId);
  const fallback = fallbackSuggested(product);
  const suggested = snapshot ? { ...fallback, ...(snapshot.suggested ?? {}) } : fallback;

  const yahooPrice = snapshot?.yahoo?.median ?? marketAverage(product.market?.yahooShopping);
  const rakumaPrice = snapshot?.rakuma?.median ?? marketAverage(product.market?.rakuma);
  const buybackPrice = snapshot?.janpara?.usedMax ?? marketAverage(product.market?.buyback);

  const now = Date.now();
  priceSqlRows.push(
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

const priceSql = [
  '-- kaitori_price: 64 products',
  'INSERT OR REPLACE INTO kaitori_price (product_id, standard_price, quick_sale_price, aggressive_price, yahoo_price, rakuma_price, buyback_price, updated_at) VALUES',
  priceSqlRows.join(',\n') + ';',
].join('\n');

// ── Generate article SQL (896 rows) ──────────────────────
const articleSqlBatches = [];
const batchSize = 10;
let currentBatch = [];
let batchNum = 0;
const now = Date.now();
const publishedAt = now;

for (const art of manifest.articles) {
  const product = productMap.get(art.productId);
  if (!product) continue;

  const snapshot = snapshotMap.get(art.productId);
  const fallback = fallbackSuggested(product);
  const suggested = snapshot ? { ...fallback, ...(snapshot.suggested ?? {}) } : fallback;

  const categoryMeta = CATEGORY_META[art.category] ?? {
    caution: '状態と仕様を揃えて比較してください。',
    sellPoint: '仕様を先頭に書くと比較されやすくなります。',
    audience: `${art.category}の比較で見落としやすい差が出るカテゴリ`,
  };

  const intent = INTENTS.find((i) => i.key === art.intent);
  if (!intent) continue;

  const nedanSlug = `kaitori-${art.slug}`;
  const title = art.title;
  const metaDescription = art.description;
  const productName = product.name;
  const content = buildMarkdown(product, intent, suggested, categoryMeta);

  // jan_code フィールドに productId を格納 (KaitoriPriceWidget が参照)
  currentBatch.push(
    `('${sqlEscape(nedanSlug)}', '${sqlEscape(title)}', '${sqlEscape(content)}', ` +
    `'${sqlEscape(metaDescription)}', '${sqlEscape(art.productId)}', '${sqlEscape(productName)}', ` +
    `'PUBLISHED', 0, ${publishedAt}, ${now}, ${now})`
  );

  if (currentBatch.length >= batchSize) {
    articleSqlBatches.push({ num: ++batchNum, rows: [...currentBatch] });
    currentBatch = [];
  }
}
if (currentBatch.length > 0) {
  articleSqlBatches.push({ num: ++batchNum, rows: [...currentBatch] });
}

const ARTICLE_INSERT_HEADER = 'INSERT OR IGNORE INTO article (slug, title, content, meta_description, jan_code, product_name, status, noindex, published_at, created_at, updated_at) VALUES';

await fs.mkdir(outDir, { recursive: true });

// 価格SQLを書き出し
await fs.writeFile(path.join(outDir, 'kaitori-prices.sql'), priceSql, 'utf8');
console.log(`✓ kaitori-prices.sql: ${priceSqlRows.length} rows`);

// 記事SQLを分割ファイルに書き出し
for (const batch of articleSqlBatches) {
  const filename = `kaitori-articles-${String(batch.num).padStart(3, '0')}.sql`;
  const sql = `-- batch ${batch.num}/${articleSqlBatches.length} (${batch.rows.length} articles)\n${ARTICLE_INSERT_HEADER}\n${batch.rows.join(',\n')};`;
  await fs.writeFile(path.join(outDir, filename), sql, 'utf8');
}
console.log(`✓ kaitori-articles: ${articleSqlBatches.length} files, ${manifest.articles.length} total rows`);
console.log('Done. Output in:', outDir);
