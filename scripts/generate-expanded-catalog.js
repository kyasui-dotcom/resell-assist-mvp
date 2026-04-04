import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const productsPath = new URL('../data/products.json', import.meta.url);
const snapshotPath = new URL('../data/products-snapshot.json', import.meta.url);

const rawExistingProducts = JSON.parse(await fs.readFile(productsPath, 'utf8'));
const rawExistingSnapshots = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));

const deepClone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const byId = (items) => new Map(items.map((item) => [item.id, item]));
const titleCase = (value) => value;
const slugifyAscii = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function countOccurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  return haystack.split(needle).length - 1;
}

function isCanonicalPcVariant(item) {
  if (item?.category !== 'パソコン') return true;
  const id = String(item.id ?? '');
  const specs = item.specs ?? {};
  const keyboardCount = countOccurrences(id, '-jis') + countOccurrences(id, '-us');
  if (keyboardCount > 1) return false;
  const color = String(specs.color ?? '').trim();
  if (color) {
    const colorSlug = slugifyAscii(color);
    if (colorSlug && countOccurrences(id, `-${colorSlug}`) > 1) return false;
    if (!colorSlug && countOccurrences(id, `-${color}`) > 1) return false;
  }
  return true;
}

const existingProducts = rawExistingProducts.filter(isCanonicalPcVariant);
const allowedIds = new Set(existingProducts.map((item) => item.id));
const existingSnapshots = rawExistingSnapshots.filter((item) => allowedIds.has(item.id));
const existingProductMap = new Map(existingProducts.map((item) => [item.id, item]));
const existingSnapshotMap = new Map(existingSnapshots.map((item) => [item.id, item]));

function replaceAllParts(text, replacements) {
  let output = text;
  for (const [from, to] of replacements) output = output.split(from).join(to);
  return output;
}

function cloneProduct(baseId, next) {
  const baseSource = existingProductMap.get(baseId) ?? generatedProductMap.get(baseId);
  const base = deepClone(baseSource);
  if (!base) throw new Error(`Missing base product: ${baseId}`);
  return {
    ...base,
    ...next,
    specs: { ...(base.specs ?? {}), ...(next.specs ?? {}) },
    aliases: next.aliases ?? base.aliases,
    searchTokens: next.searchTokens ?? base.searchTokens,
    descriptionHints: next.descriptionHints ?? base.descriptionHints,
    titleKeywords: next.titleKeywords ?? base.titleKeywords,
    market: next.market ?? base.market
  };
}

function cloneSnapshot(baseId, next) {
  const baseSource = existingSnapshotMap.get(baseId) ?? generatedSnapshotMap.get(baseId);
  const base = deepClone(baseSource);
  if (!base) throw new Error(`Missing base snapshot: ${baseId}`);
  return {
    ...base,
    ...next,
    searchKeywords: next.searchKeywords ?? base.searchKeywords,
    excludeKeywords: next.excludeKeywords ?? base.excludeKeywords,
    requiredKeywords: next.requiredKeywords ?? base.requiredKeywords,
    preferredKeywords: next.preferredKeywords ?? base.preferredKeywords
  };
}

function buildMarket({ yahoo, rakuma, buyback, shipping = 750, buybackShipping = 0, yahooFee = 0.08, rakumaFee = 0.06, speed = { yahoo: 'medium', rakuma: 'slow', buyback: 'fast' }, effort = { yahoo: 'medium', rakuma: 'medium', buyback: 'low' } }) {
  return {
    yahooShopping: { min: yahoo[0], max: yahoo[1], feeRate: yahooFee, shipping, speed: speed.yahoo, effort: effort.yahoo },
    rakuma: { min: rakuma[0], max: rakuma[1], feeRate: rakumaFee, shipping, speed: speed.rakuma, effort: effort.rakuma },
    buyback: { min: buyback[0], max: buyback[1], feeRate: 0, shipping: buybackShipping, speed: speed.buyback, effort: effort.buyback }
  };
}

const generated = [];
const generatedSnapshots = [];
const generatedProductMap = new Map();
const generatedSnapshotMap = new Map();

function addProduct(product, snapshot) {
  generated.push(product);
  generatedSnapshots.push(snapshot);
  generatedProductMap.set(product.id, product);
  generatedSnapshotMap.set(snapshot.id, snapshot);
}

const iphonePriceBands = {
  'se2': { base: 28500, step: 6500, buyback: 17000 },
  'se3': { base: 42500, step: 7500, buyback: 27000 },
  '11': { base: 44500, step: 7000, buyback: 27000 },
  '11pro': { base: 58500, step: 9000, buyback: 36000 },
  '11promax': { base: 70500, step: 9500, buyback: 45000 },
  '12': { base: 56000, step: 8000, buyback: 35000 },
  '13': { base: 68000, step: 9000, buyback: 43000 },
  '13mini': { base: 64000, step: 9000, buyback: 39000 },
  '14': { base: 82000, step: 10000, buyback: 52000 },
  '14plus': { base: 94000, step: 11000, buyback: 60000 },
  '14pro': { base: 119000, step: 13000, buyback: 79000 },
  '14promax': { base: 138000, step: 15000, buyback: 93000 },
  '15': { base: 106000, step: 12000, buyback: 69000 },
  '15plus': { base: 123000, step: 13000, buyback: 81000 },
  '15pro': { base: 154000, step: 15000, buyback: 106000 },
  '15promax': { base: 177000, step: 17000, buyback: 123000 },
  '16': { base: 132000, step: 12000, buyback: 93000 },
  '16plus': { base: 147000, step: 13000, buyback: 103000 },
  '16pro': { base: 184000, step: 15000, buyback: 132000 },
  '16promax': { base: 209000, step: 17000, buyback: 151000 }
};

const iphoneLines = [
  { key: 'se2', series: 'iPhone SE 第2世代', slug: 'iphonese2', nameBase: 'iPhone SE 第2世代', storage: ['64GB', '128GB', '256GB'], baseId: 'iphone13-128', makerModel: 'A2296', canonicalPrefix: 'IPHSE2', excludes: ['iphone se 第3世代', 'iphonese3', 'iphone se3'] },
  { key: 'se3', series: 'iPhone SE 第3世代', slug: 'iphonese3', nameBase: 'iPhone SE 第3世代', storage: ['64GB', '128GB', '256GB'], baseId: 'iphone13-128', makerModel: 'A2782', canonicalPrefix: 'IPHSE3', excludes: ['iphone se 第2世代', 'iphonese2', 'iphone se2'] },
  { key: '11', series: 'iPhone 11', slug: 'iphone11', nameBase: 'iPhone 11', storage: ['64GB', '128GB', '256GB'], baseId: 'iphone13-128', makerModel: 'A2221', canonicalPrefix: 'IPH11', excludes: ['iphone 11 pro', 'iphone11pro', 'iphone 11 pro max', 'iphone11promax'] },
  { key: '11pro', series: 'iPhone 11 Pro', slug: 'iphone11pro', nameBase: 'iPhone 11 Pro', storage: ['64GB', '256GB', '512GB'], baseId: 'iphone13-128', makerModel: 'A2215', canonicalPrefix: 'IPH11PRO', excludes: ['iphone 11', 'iphone11', 'iphone 11 pro max', 'iphone11promax'] },
  { key: '11promax', series: 'iPhone 11 Pro Max', slug: 'iphone11promax', nameBase: 'iPhone 11 Pro Max', storage: ['64GB', '256GB', '512GB'], baseId: 'iphone13-128', makerModel: 'A2220', canonicalPrefix: 'IPH11PM', excludes: ['iphone 11', 'iphone11', 'iphone 11 pro', 'iphone11pro'] },
  { key: '12', series: 'iPhone 12', slug: 'iphone12', nameBase: 'iPhone 12', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone13-128', makerModel: 'A2402', canonicalPrefix: 'IPH12', excludes: ['iphone 12 mini', 'iphone12mini', 'iphone 12 pro', 'iphone12pro', 'iphone 12 pro max', 'iphone12promax'] },
  { key: '13', series: 'iPhone 13', slug: 'iphone13', nameBase: 'iPhone 13', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone13-128', makerModel: 'A2631', canonicalPrefix: 'IPH13', excludes: ['iphone 13 mini', 'iphone13mini', 'iphone 13 pro', 'iphone13pro', 'iphone 13 pro max', 'iphone13promax'] },
  { key: '13mini', series: 'iPhone 13 mini', slug: 'iphone13mini', nameBase: 'iPhone 13 mini', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone13mini-128', makerModel: 'A2626', canonicalPrefix: 'IPH13MINI', excludes: ['iphone 13', 'iphone13', 'iphone 13 pro', 'iphone13pro', 'iphone 13 pro max', 'iphone13promax'] },
  { key: '14', series: 'iPhone 14', slug: 'iphone14', nameBase: 'iPhone 14', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A2881', canonicalPrefix: 'IPH14', excludes: ['iphone 14 plus', 'iphone14plus', 'iphone 14 pro', 'iphone14pro', 'iphone 14 pro max', 'iphone14promax'] },
  { key: '14plus', series: 'iPhone 14 Plus', slug: 'iphone14plus', nameBase: 'iPhone 14 Plus', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A2885', canonicalPrefix: 'IPH14P', excludes: ['iphone 14', 'iphone14', 'iphone 14 pro', 'iphone14pro', 'iphone 14 pro max', 'iphone14promax'] },
  { key: '14pro', series: 'iPhone 14 Pro', slug: 'iphone14pro', nameBase: 'iPhone 14 Pro', storage: ['128GB', '256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A2890', canonicalPrefix: 'IPH14PRO', excludes: ['iphone 14', 'iphone14', 'iphone 14 plus', 'iphone14plus', 'iphone 14 pro max', 'iphone14promax'] },
  { key: '14promax', series: 'iPhone 14 Pro Max', slug: 'iphone14promax', nameBase: 'iPhone 14 Pro Max', storage: ['128GB', '256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A2894', canonicalPrefix: 'IPH14PM', excludes: ['iphone 14', 'iphone14', 'iphone 14 plus', 'iphone14plus', 'iphone 14 pro', 'iphone14pro'] },
  { key: '15', series: 'iPhone 15', slug: 'iphone15', nameBase: 'iPhone 15', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A3089', canonicalPrefix: 'IPH15', excludes: ['iphone 15 plus', 'iphone15plus', 'iphone 15 pro', 'iphone15pro', 'iphone 15 pro max', 'iphone15promax'] },
  { key: '15plus', series: 'iPhone 15 Plus', slug: 'iphone15plus', nameBase: 'iPhone 15 Plus', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A3093', canonicalPrefix: 'IPH15P', excludes: ['iphone 15', 'iphone15', 'iphone 15 pro', 'iphone15pro', 'iphone 15 pro max', 'iphone15promax'] },
  { key: '15pro', series: 'iPhone 15 Pro', slug: 'iphone15pro', nameBase: 'iPhone 15 Pro', storage: ['128GB', '256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A3101', canonicalPrefix: 'IPH15PRO', excludes: ['iphone 15', 'iphone15', 'iphone 15 plus', 'iphone15plus', 'iphone 15 pro max', 'iphone15promax'] },
  { key: '15promax', series: 'iPhone 15 Pro Max', slug: 'iphone15promax', nameBase: 'iPhone 15 Pro Max', storage: ['256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A3105', canonicalPrefix: 'IPH15PM', excludes: ['iphone 15', 'iphone15', 'iphone 15 plus', 'iphone15plus', 'iphone 15 pro', 'iphone15pro'] },
  { key: '16', series: 'iPhone 16', slug: 'iphone16', nameBase: 'iPhone 16', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A3286', canonicalPrefix: 'IPH16', excludes: ['iphone 16 plus', 'iphone16plus', 'iphone 16 pro', 'iphone16pro', 'iphone 16 pro max', 'iphone16promax'] },
  { key: '16plus', series: 'iPhone 16 Plus', slug: 'iphone16plus', nameBase: 'iPhone 16 Plus', storage: ['128GB', '256GB', '512GB'], baseId: 'iphone14-128', makerModel: 'A3290', canonicalPrefix: 'IPH16P', excludes: ['iphone 16', 'iphone16', 'iphone 16 pro', 'iphone16pro', 'iphone 16 pro max', 'iphone16promax'] },
  { key: '16pro', series: 'iPhone 16 Pro', slug: 'iphone16pro', nameBase: 'iPhone 16 Pro', storage: ['128GB', '256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A3293', canonicalPrefix: 'IPH16PRO', excludes: ['iphone 16', 'iphone16', 'iphone 16 plus', 'iphone16plus', 'iphone 16 pro max', 'iphone16promax'] },
  { key: '16promax', series: 'iPhone 16 Pro Max', slug: 'iphone16promax', nameBase: 'iPhone 16 Pro Max', storage: ['256GB', '512GB', '1TB'], baseId: 'iphone14-128', makerModel: 'A3297', canonicalPrefix: 'IPH16PM', excludes: ['iphone 16', 'iphone16', 'iphone 16 plus', 'iphone16plus', 'iphone 16 pro', 'iphone16pro'] }
];

const storageOrder = ['64GB', '128GB', '256GB', '512GB', '1TB'];
for (const line of iphoneLines) {
  const band = iphonePriceBands[line.key];
  for (const storage of line.storage) {
    const stepIndex = storageOrder.indexOf(storage);
    const suffix = storage.toLowerCase().replace('gb', '').replace('tb', 'tb');
    const id = `${line.slug}-${suffix}`;
    if (existingProductMap.has(id)) continue;
    const basePrice = band.base + band.step * stepIndex;
    const product = cloneProduct(line.baseId, {
      id,
      series: line.series,
      name: `${line.nameBase} ${storage} SIMフリー`,
      aliases: [
        `${line.slug}`,
        `${line.nameBase.toLowerCase()} ${storage.toLowerCase()}`,
        `${line.nameBase.toLowerCase()} ${storage.toLowerCase()} sim free`,
        `${line.nameBase.replace('iPhone', 'iphone')} ${storage.replace('GB', '')}`,
        `${line.nameBase} ${storage.replace('GB', '')}`,
        `${line.nameBase} simフリー`
      ],
      searchTokens: ['simフリー', storage.toLowerCase(), 'apple', line.makerModel.toLowerCase()],
      specs: { generation: line.series, storage, connectivity: 'SIMフリー' },
      market: buildMarket({
        yahoo: [basePrice - 12000, basePrice + 1200],
        rakuma: [Math.round(basePrice * 0.77), Math.round(basePrice * 0.92)],
        buyback: [band.buyback + stepIndex * Math.round(band.step * 0.7) - 5000, band.buyback + stepIndex * Math.round(band.step * 0.7) + 5000]
      }),
      descriptionHints: [
        `${storage}モデルであることをタイトル先頭に入れる`,
        'バッテリー最大容量・Face ID・カメラ動作を記載',
        '残債なし・アクティベーションロック解除済みを明記'
      ],
      titleKeywords: [storage, 'SIMフリー', line.series.includes('Pro') ? '美品' : '動作確認済み']
    });
    const snapshot = cloneSnapshot(line.baseId, {
      id,
      series: line.series,
      displayName: `${line.nameBase} ${storage} SIMフリー`,
      canonicalModel: `${line.canonicalPrefix}-${storage}`,
      makerModel: line.makerModel,
      storage,
      connectivity: 'SIMフリー',
      searchKeywords: [line.nameBase.toLowerCase(), line.slug, storage.toLowerCase(), 'simフリー', line.makerModel.toLowerCase()],
      excludeKeywords: ['空箱', '箱のみ', '部品', '画面のみ', 'ロックあり', '残債あり', 'ジャンク', ...line.excludes],
      requiredKeywords: [line.nameBase.toLowerCase(), storage.toLowerCase()],
      preferredKeywords: ['simフリー', line.makerModel.toLowerCase(), `${line.canonicalPrefix.toLowerCase()}-${storage.toLowerCase()}`]
    });
    addProduct(product, snapshot);
  }
}

const ipadSeries = [
  { key: 'ipad9', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad 第9世代', nameBase: 'iPad 第9世代', slug: 'ipad-9', chip: 'A13', makerModel: 'A2602', cellularModel: 'A2604', canonicalPrefix: 'IPAD9', storage: ['64GB', '256GB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 42000, cellular: 56000 } },
  { key: 'ipad10', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad 第10世代', nameBase: 'iPad 第10世代', slug: 'ipad-10', chip: 'A14', makerModel: 'A2696', cellularModel: 'A2757', canonicalPrefix: 'IPAD10', storage: ['64GB', '256GB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 62000, cellular: 79000 } },
  { key: 'ipadpro11-m2', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad Pro 11インチ 第4世代', nameBase: 'iPad Pro 11インチ 第4世代', slug: 'ipad-pro11-4', chip: 'M2', makerModel: 'A2759', cellularModel: 'A2761', canonicalPrefix: 'IPADPRO11-4', storage: ['128GB', '256GB', '512GB', '1TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 118000, cellular: 139000 } },
  { key: 'ipadpro129-m2', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad Pro 12.9インチ 第6世代', nameBase: 'iPad Pro 12.9インチ 第6世代', slug: 'ipad-pro129-6', chip: 'M2', makerModel: 'A2436', cellularModel: 'A2764', canonicalPrefix: 'IPADPRO129-6', storage: ['128GB', '256GB', '512GB', '1TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 156000, cellular: 178000 } },
  { key: 'air5', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad Air 第5世代', nameBase: 'iPad Air 第5世代', slug: 'ipad-air5', chip: 'M1', makerModel: 'A2588', cellularModel: 'A2591', canonicalPrefix: 'IPADAIR5', storage: ['64GB', '256GB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 76000, cellular: 93000 } },
  { key: 'air6-11', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad Air 11インチ M2', nameBase: 'iPad Air 11インチ M2', slug: 'ipad-air6-11', chip: 'M2', makerModel: 'A2902', cellularModel: 'A2903', canonicalPrefix: 'IPADAIR6-11', storage: ['128GB', '256GB', '512GB', '1TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 98000, cellular: 118000 } },
  { key: 'air6-13', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', series: 'iPad Air 13インチ M2', nameBase: 'iPad Air 13インチ M2', slug: 'ipad-air6-13', chip: 'M2', makerModel: 'A2898', cellularModel: 'A2899', canonicalPrefix: 'IPADAIR6-13', storage: ['128GB', '256GB', '512GB', '1TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 126000, cellular: 148000 } },
  { key: 'mini6', baseId: 'ipad-mini6-64-wifi', snapshotBase: 'ipad-mini6-64-wifi', series: 'iPad mini 第6世代', nameBase: 'iPad mini 第6世代', slug: 'ipad-mini6', chip: 'A15', makerModel: 'A2567', cellularModel: 'A2568', canonicalPrefix: 'IPADMINI6', storage: ['64GB', '256GB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 64000, cellular: 82000 } },
  { key: 'mini7', baseId: 'ipad-mini6-64-wifi', snapshotBase: 'ipad-mini6-64-wifi', series: 'iPad mini A17 Pro', nameBase: 'iPad mini A17 Pro', slug: 'ipad-mini7', chip: 'A17 Pro', makerModel: 'A2993', cellularModel: 'A2995', canonicalPrefix: 'IPADMINI7', storage: ['128GB', '256GB', '512GB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 88000, cellular: 108000 } }
];

const ipadStorageOrder = ['64GB', '128GB', '256GB', '512GB', '1TB'];
for (const line of ipadSeries) {
  for (const mode of line.modes) {
    for (const storage of line.storage) {
      const modeKey = mode === 'Wi‑Fi' ? 'wifi' : 'cellular';
      const storageIndex = ipadStorageOrder.indexOf(storage);
      const id = `${line.slug}-${storage.replace('GB', '').toLowerCase().replace('1tb', '1tb')}-${modeKey}`;
      if (existingProductMap.has(id)) continue;
      const modeBase = line.prices[modeKey];
      const basePrice = modeBase + storageIndex * 11000;
      const model = mode === 'Wi‑Fi' ? line.makerModel : line.cellularModel;
      const product = cloneProduct(line.baseId, {
        id,
        series: line.series,
        name: `${line.nameBase} ${storage} ${mode}`,
        aliases: [
          `${line.slug} ${storage.toLowerCase()} ${modeKey}`,
          `${line.nameBase.toLowerCase()} ${storage.toLowerCase()} ${modeKey}`,
          `${line.nameBase.toLowerCase()} ${storage.toLowerCase()}`,
          `${line.nameBase} ${storage}`
        ],
        searchTokens: [storage.toLowerCase(), modeKey, 'apple', line.chip.toLowerCase().replace(/\s+/g, '')],
        specs: { generation: line.series, storage, connectivity: mode, chip: line.chip },
        market: buildMarket({
          yahoo: [basePrice - 12000, basePrice + 2000],
          rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)],
          buyback: [Math.round(basePrice * 0.62), Math.round(basePrice * 0.72)],
          shipping: 900
        }),
        descriptionHints: [
          `${mode}モデルであることを明記`,
          'Apple Pencil対応や付属品有無を追記',
          'アクティベーションロック解除済みを記載'
        ],
        titleKeywords: [storage, mode, line.chip]
      });
      const snapshot = cloneSnapshot(line.snapshotBase, {
        id,
        series: line.series,
        displayName: `${line.nameBase} ${storage} ${mode}`,
        canonicalModel: `${line.canonicalPrefix}-${storage}-${modeKey}`,
        makerModel: model,
        storage,
        connectivity: mode,
        searchKeywords: [line.nameBase.toLowerCase(), storage.toLowerCase(), modeKey, model.toLowerCase()],
        excludeKeywords: ['箱のみ', 'カバーのみ', 'ペンのみ', 'ジャンク', modeKey === 'wifi' ? 'cellular' : 'wifi', modeKey === 'wifi' ? 'セルラー' : 'wi-fi'],
        requiredKeywords: ['ipad', storage.toLowerCase()],
        preferredKeywords: [modeKey, model.toLowerCase(), line.chip.toLowerCase().replace(/\s+/g, '')]
      });
      addProduct(product, snapshot);
    }
  }
}

const watchLines = [
  { key: 's8', baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps', series: 'Apple Watch Series 8', nameBase: 'Apple Watch Series 8', slug: 'apple-watch-s8', sizes: ['41mm', '45mm'], modes: ['GPS', 'Cellular'], caseMaterial: 'アルミニウム', prices: { GPS: 43000, Cellular: 56000 } },
  { key: 'ultra1', baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps', series: 'Apple Watch Ultra', nameBase: 'Apple Watch Ultra', slug: 'apple-watch-ultra', sizes: ['49mm'], modes: ['Cellular'], caseMaterial: 'チタニウム', prices: { Cellular: 86000 } },
  { key: 'se2', baseId: 'apple-watch-se2-40-gps', snapshotBase: 'apple-watch-se2-40-gps', series: 'Apple Watch SE 第2世代', nameBase: 'Apple Watch SE 第2世代', slug: 'apple-watch-se2', sizes: ['40mm', '44mm'], modes: ['GPS', 'Cellular'], caseMaterial: 'アルミニウム', prices: { GPS: 29000, Cellular: 38000 } },
  { key: 's9', baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps', series: 'Apple Watch Series 9', nameBase: 'Apple Watch Series 9', slug: 'apple-watch-s9', sizes: ['41mm', '45mm'], modes: ['GPS', 'Cellular'], caseMaterial: 'アルミニウム', prices: { GPS: 52000, Cellular: 66000 } },
  { key: 's10', baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps', series: 'Apple Watch Series 10', nameBase: 'Apple Watch Series 10', slug: 'apple-watch-s10', sizes: ['42mm', '46mm'], modes: ['GPS', 'Cellular'], caseMaterial: 'アルミニウム', prices: { GPS: 65000, Cellular: 82000 } },
  { key: 'ultra2', baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps', series: 'Apple Watch Ultra 2', nameBase: 'Apple Watch Ultra 2', slug: 'apple-watch-ultra2', sizes: ['49mm'], modes: ['Cellular'], caseMaterial: 'チタニウム', prices: { Cellular: 108000 } }
];
for (const line of watchLines) {
  for (const size of line.sizes) {
    for (const mode of line.modes) {
      const id = `${line.slug}-${size.replace('mm', '')}-${mode.toLowerCase()}`;
      if (existingProductMap.has(id)) continue;
      const sizeBump = size.includes('49') ? 16000 : size.includes('46') || size.includes('45') || size.includes('44') ? 6000 : 0;
      const basePrice = (line.prices[mode] ?? line.prices.Cellular) + sizeBump;
      const product = cloneProduct(line.baseId, {
        id,
        series: line.series,
        name: `${line.nameBase} ${size} ${mode}`,
        aliases: [
          `${line.slug} ${size.toLowerCase()} ${mode.toLowerCase()}`,
          `${line.nameBase.toLowerCase()} ${size.toLowerCase()} ${mode.toLowerCase()}`,
          `${line.nameBase.toLowerCase()} ${size.toLowerCase()}`
        ],
        searchTokens: [size.toLowerCase(), mode.toLowerCase(), 'apple', line.caseMaterial],
        specs: { generation: line.series, size, connectivity: mode, edition: line.caseMaterial },
        market: buildMarket({
          yahoo: [basePrice - 7000, basePrice + 4000],
          rakuma: [Math.round(basePrice * 0.8), Math.round(basePrice * 0.95)],
          buyback: [Math.round(basePrice * 0.62), Math.round(basePrice * 0.74)],
          shipping: 450
        }),
        descriptionHints: [
          `${size}・${mode}をタイトルに含める`,
          'バンド有無・充電ケーブル有無を明記',
          'バッテリー状態と傷の位置を写真で補足'
        ],
        titleKeywords: [size, mode, line.series.includes('Ultra') ? 'チタニウム' : '動作確認済み']
      });
      const snapshot = cloneSnapshot(line.snapshotBase, {
        id,
        series: line.series,
        displayName: `${line.nameBase} ${size} ${mode}`,
        canonicalModel: `${line.slug.toUpperCase()}-${size}-${mode.toUpperCase()}`,
        makerModel: line.series.includes('Ultra') ? 'A2986' : mode === 'Cellular' ? 'A3003' : 'A3001',
        connectivity: mode,
        searchKeywords: [line.nameBase.toLowerCase(), size.toLowerCase(), mode.toLowerCase()],
        excludeKeywords: ['バンドのみ', '充電ケーブルのみ', 'ケースのみ', 'ジャンク', ...line.sizes.filter((candidate) => candidate !== size).map((candidate) => candidate.toLowerCase())],
        requiredKeywords: ['apple watch', size.toLowerCase()],
        preferredKeywords: [mode.toLowerCase(), line.caseMaterial, line.series.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const airpodsLines = [
  { id: 'airpods3-lightning', baseId: 'airpods4-anc', snapshotBase: 'airpods4-anc', series: 'AirPods 第3世代', name: 'AirPods 第3世代 Lightningケース', connectivity: 'Lightning', model: 'MPNY3J/A', marketBase: 17000 },
  { id: 'airpods3-magsafe', baseId: 'airpods4-anc', snapshotBase: 'airpods4-anc', series: 'AirPods 第3世代', name: 'AirPods 第3世代 MagSafe充電ケース', connectivity: 'MagSafe', model: 'MME73J/A', marketBase: 18500 },
  { id: 'airpods4-open', baseId: 'airpods4-anc', snapshotBase: 'airpods4-anc', series: 'AirPods 4', name: 'AirPods 4', connectivity: 'USB-C', model: 'MXP63J/A', marketBase: 21000 },
  { id: 'airpods4-anc-usbc', baseId: 'airpods4-anc', snapshotBase: 'airpods4-anc', series: 'AirPods 4 ANC', name: 'AirPods 4 ANC USB-Cケース', connectivity: 'USB-C', model: 'MXP93J/A', marketBase: 24500 },
  { id: 'airpods-max-lightning', baseId: 'airpodspro2-lightning', snapshotBase: 'airpodspro2-lightning', series: 'AirPods Max', name: 'AirPods Max Lightning', connectivity: 'Lightning', model: 'MGYH3J/A', marketBase: 52000 },
  { id: 'airpods-max-usbc', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', series: 'AirPods Max USB-C', name: 'AirPods Max USB-C', connectivity: 'USB-C', model: 'MWW43J/A', marketBase: 68000 }
];
for (const item of airpodsLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), item.series.toLowerCase(), `${item.series.toLowerCase()} ${item.connectivity.toLowerCase()}`],
    searchTokens: [item.connectivity.toLowerCase().replace('magsafe', 'magsafe'), item.model.toLowerCase(), 'apple'],
    specs: { generation: item.series, connectivity: item.connectivity, edition: item.series.includes('Max') ? 'ヘッドホン' : '充電ケース付き' },
    market: buildMarket({
      yahoo: [item.marketBase - 3500, item.marketBase + 3500],
      rakuma: [Math.round(item.marketBase * 0.76), Math.round(item.marketBase * 0.92)],
      buyback: [Math.round(item.marketBase * 0.58), Math.round(item.marketBase * 0.7)],
      shipping: 450
    }),
    descriptionHints: [
      `${item.connectivity}ケースかどうかを明記`,
      '左右イヤホン・ケース・付属品の完品可否を記載',
      'バッテリー持ちやノイズキャンセル動作を補足'
    ],
    titleKeywords: [item.connectivity, item.series.includes('Max') ? 'ヘッドホン' : '純正', '動作確認済み']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.series.includes('Max') ? 'A2096' : 'A2564',
    connectivity: item.connectivity,
    searchKeywords: [item.series.toLowerCase(), item.connectivity.toLowerCase(), item.model.toLowerCase()],
    excludeKeywords: ['ケースのみ', '充電ケースのみ', '左耳', '右耳', '片耳', '空箱', 'イヤーチップ', 'ジャンク'],
    requiredKeywords: [item.series.toLowerCase().includes('max') ? 'airpods max' : 'airpods', item.connectivity.toLowerCase() === 'magsafe' ? 'magsafe' : item.connectivity.toLowerCase().replace('usb-c', 'usb-c')],
    preferredKeywords: [item.model.toLowerCase(), item.connectivity.toLowerCase(), '付属品あり']
  });
  addProduct(product, snapshot);
}

const switchLines = [
  { id: 'switch-standard-neon', baseId: 'switch-oled-neon', snapshotBase: 'switch-oled-neon', series: 'Nintendo Switch', name: 'Nintendo Switch ネオンブルー・ネオンレッド', color: 'ネオン', model: 'HAD-S-KABAH', marketBase: 25000 },
  { id: 'switch-standard-gray', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Nintendo Switch', name: 'Nintendo Switch グレー', color: 'グレー', model: 'HAD-S-KAAAA', marketBase: 24500 },
  { id: 'switch-lite-gray', baseId: 'switch-lite-yellow', snapshotBase: 'switch-lite-yellow', series: 'Nintendo Switch Lite', name: 'Nintendo Switch Lite グレー', color: 'グレー', model: 'HDH-S-GAZAA', marketBase: 15500 },
  { id: 'switch-lite-turquoise', baseId: 'switch-lite-yellow', snapshotBase: 'switch-lite-yellow', series: 'Nintendo Switch Lite', name: 'Nintendo Switch Lite ターコイズ', color: 'ターコイズ', model: 'HDH-S-BAZAA', marketBase: 16000 },
  { id: 'switch-lite-coral', baseId: 'switch-lite-yellow', snapshotBase: 'switch-lite-yellow', series: 'Nintendo Switch Lite', name: 'Nintendo Switch Lite コーラル', color: 'コーラル', model: 'HDH-S-PAZAA', marketBase: 16200 },
  { id: 'switch-lite-blue', baseId: 'switch-lite-yellow', snapshotBase: 'switch-lite-yellow', series: 'Nintendo Switch Lite', name: 'Nintendo Switch Lite ブルー', color: 'ブルー', model: 'HDH-S-BBZAA', marketBase: 16300 },
  { id: 'switch-oled-splatoon3', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Nintendo Switch 有機ELモデル', name: 'Nintendo Switch 有機ELモデル スプラトゥーン3エディション', color: '限定版', model: 'HEG-S-KCAAA', marketBase: 33500 },
  { id: 'switch-oled-zelda', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Nintendo Switch 有機ELモデル', name: 'Nintendo Switch 有機ELモデル ゼルダの伝説エディション', color: '限定版', model: 'HEG-S-KDAAA', marketBase: 35500 }
];
for (const item of switchLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), `${item.series.toLowerCase()} ${item.color.toLowerCase()}`],
    searchTokens: ['switch', item.model.toLowerCase(), item.color],
    specs: { generation: item.series, color: item.color },
    market: buildMarket({
      yahoo: [item.marketBase - 3500, item.marketBase + 2500],
      rakuma: [Math.round(item.marketBase * 0.78), Math.round(item.marketBase * 0.9)],
      buyback: [Math.round(item.marketBase * 0.56), Math.round(item.marketBase * 0.68)],
      shipping: 900
    }),
    descriptionHints: ['Joy-Con・ドック・ACアダプタの有無を明記', '限定版は外箱の状態も補足', '画面傷・スティック不良の有無を記載'],
    titleKeywords: [item.color, '動作確認済み', item.series.includes('Lite') ? '本体' : '完品']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    color: item.color,
    searchKeywords: [item.series.toLowerCase(), item.color.toLowerCase(), item.model.toLowerCase()],
    excludeKeywords: ['箱のみ', 'ドックのみ', 'コントローラーのみ', 'ソフトのみ', 'ジャンク'],
    requiredKeywords: ['switch'],
    preferredKeywords: [item.model.toLowerCase(), item.color.toLowerCase()]
  });
  addProduct(product, snapshot);
}

const ps5Lines = [
  { id: 'ps5-portal', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', series: 'PlayStation Portal リモートプレーヤー', name: 'PlayStation Portal リモートプレーヤー', model: 'CFIJ-18000', marketBase: 32000, keywords: ['portal', 'remote player'] },
  { id: 'dualsense-white', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'DualSense ワイヤレスコントローラー', name: 'DualSense ワイヤレスコントローラー ホワイト', model: 'CFI-ZCT1J', marketBase: 6800, keywords: ['dualsense', 'controller'] },
  { id: 'dualsense-midnight-black', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'DualSense ワイヤレスコントローラー', name: 'DualSense ワイヤレスコントローラー ミッドナイト ブラック', model: 'CFI-ZCT1J01', marketBase: 7200, keywords: ['dualsense', 'black'] },
  { id: 'dualsense-edge', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'DualSense Edge', name: 'DualSense Edge ワイヤレスコントローラー', model: 'CFI-ZCP1J', marketBase: 22800, keywords: ['dualsense edge', 'controller'] },
  { id: 'pulse-elite', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', series: 'PULSE Elite ワイヤレスヘッドセット', name: 'PULSE Elite ワイヤレスヘッドセット', model: 'CFI-ZWH2J', marketBase: 16500, keywords: ['pulse elite', 'headset'] },
  { id: 'pulse-explore', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', series: 'PULSE Explore ワイヤレスイヤホン', name: 'PULSE Explore ワイヤレスイヤホン', model: 'CFI-ZWE1J', marketBase: 18200, keywords: ['pulse explore', 'earbuds'] },
  { id: 'ps5-disc-drive', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'PS5 ディスクドライブ', name: 'PS5 ディスクドライブ CFI-ZDD1J', model: 'CFI-ZDD1J', marketBase: 12800, keywords: ['disc drive', 'ディスクドライブ'] }
];
for (const item of ps5Lines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), ...item.keywords],
    searchTokens: ['ps5', item.model.toLowerCase(), ...item.keywords],
    specs: { generation: item.series, model: item.model },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.88), Math.round(item.marketBase * 1.08)],
      rakuma: [Math.round(item.marketBase * 0.82), Math.round(item.marketBase * 0.98)],
      buyback: [Math.round(item.marketBase * 0.58), Math.round(item.marketBase * 0.72)],
      shipping: item.marketBase >= 20000 ? 900 : 750
    }),
    descriptionHints: ['型番を明記', '付属ケーブル・アダプタ有無を記載', '傷や使用感を写真で補足'],
    titleKeywords: [item.model, '動作確認済み', item.series.includes('DualSense') ? '純正' : 'PS5']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    storage: null,
    searchKeywords: ['ps5', item.series.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    excludeKeywords: ['箱のみ', 'カバーのみ', 'ジャンク'],
    requiredKeywords: item.keywords.slice(0, 1),
    preferredKeywords: [item.model.toLowerCase(), '純正']
  });
  addProduct(product, snapshot);
}

const macStorageOrder = ['256GB', '512GB', '1TB', '2TB', '4TB', '8TB'];
const ramOrder = ['8GB', '16GB', '18GB', '24GB', '32GB', '36GB', '48GB', '64GB'];

function storageIndex(value) {
  return Math.max(0, macStorageOrder.indexOf(value));
}

function ramIndex(value) {
  return Math.max(0, ramOrder.indexOf(value));
}

const macbookAirLines = [
  { series: 'MacBook Air 13インチ M1', slug: 'macbook-air-13-m1', chip: 'M1', screen: '13インチ', year: '2020', storage: ['256GB', '512GB', '1TB'], ram: ['8GB', '16GB'], priceBase: 88000, makerModel: 'A2337' },
  { series: 'MacBook Air 13インチ M2', slug: 'macbook-air-13-m2', chip: 'M2', screen: '13インチ', year: '2022', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB', '24GB'], priceBase: 128000, makerModel: 'A2681' },
  { series: 'MacBook Air 15インチ M2', slug: 'macbook-air-15-m2', chip: 'M2', screen: '15インチ', year: '2023', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB', '24GB'], priceBase: 152000, makerModel: 'A2941' },
  { series: 'MacBook Air 13インチ M3', slug: 'macbook-air-13-m3', chip: 'M3', screen: '13インチ', year: '2024', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB', '24GB'], priceBase: 158000, makerModel: 'A3113' },
  { series: 'MacBook Air 15インチ M3', slug: 'macbook-air-15-m3', chip: 'M3', screen: '15インチ', year: '2024', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB', '24GB'], priceBase: 182000, makerModel: 'A3114' },
  { series: 'MacBook Air 13インチ M4', slug: 'macbook-air-13-m4', chip: 'M4', screen: '13インチ', year: '2025', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['16GB', '24GB', '32GB'], priceBase: 182000, makerModel: 'A3240' },
  { series: 'MacBook Air 15インチ M4', slug: 'macbook-air-15-m4', chip: 'M4', screen: '15インチ', year: '2025', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['16GB', '24GB', '32GB'], priceBase: 208000, makerModel: 'A3241' }
];
for (const line of macbookAirLines) {
  for (const ram of line.ram) {
    for (const storage of line.storage) {
      const id = `${line.slug}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.priceBase + storageIndex(storage) * 26000 + ramIndex(ram) * 14000;
      const product = cloneProduct('ipad-air5-64-wifi', {
        id,
        category: 'パソコン',
        series: line.series,
        name: `${line.series} ${ram} ${storage}`,
        aliases: [
          `${line.slug} ${ram.toLowerCase()} ${storage.toLowerCase()}`,
          `${line.series.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`,
          `macbook air ${line.chip.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`
        ],
        searchTokens: ['macbook', 'air', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        specs: { generation: line.year, chip: line.chip, memory: ram, storage, size: line.screen },
        market: buildMarket({
          yahoo: [Math.round(basePrice * 0.84), Math.round(basePrice * 0.99)],
          rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)],
          buyback: [Math.round(basePrice * 0.63), Math.round(basePrice * 0.76)],
          shipping: 1500
        }),
        descriptionHints: ['RAMとSSD容量をタイトル先頭寄りに明記', '充放電回数・バッテリー状態・キーボード言語を記載', 'ACアダプタ有無と天板キズを写真で補足'],
        titleKeywords: [line.chip, ram, storage]
      });
      const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
        id,
        category: 'computer',
        brand: 'Apple',
        series: line.series,
        displayName: `${line.series} ${ram} ${storage}`,
        canonicalModel: `${line.slug.toUpperCase()}-${ram}-${storage}`,
        makerModel: line.makerModel,
        storage,
        connectivity: null,
        color: 'ミッドナイト',
        searchKeywords: [line.series.toLowerCase(), 'macbook air', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        excludeKeywords: ['ジャンク', '空箱', 'ロジックボード', '液晶のみ', 'キーボードのみ'],
        requiredKeywords: ['macbook air', storage.toLowerCase()],
        preferredKeywords: [line.chip.toLowerCase(), ram.toLowerCase(), line.makerModel.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const macbookProLines = [
  { series: 'MacBook Pro 14インチ M1 Pro', slug: 'macbook-pro-14-m1pro', chip: 'M1 Pro', screen: '14インチ', year: '2021', storage: ['512GB', '1TB', '2TB'], ram: ['16GB', '32GB'], priceBase: 198000, makerModel: 'A2442' },
  { series: 'MacBook Pro 14インチ M1 Max', slug: 'macbook-pro-14-m1max', chip: 'M1 Max', screen: '14インチ', year: '2021', storage: ['1TB', '2TB', '4TB'], ram: ['32GB', '64GB'], priceBase: 268000, makerModel: 'A2442' },
  { series: 'MacBook Pro 16インチ M1 Pro', slug: 'macbook-pro-16-m1pro', chip: 'M1 Pro', screen: '16インチ', year: '2021', storage: ['512GB', '1TB', '2TB'], ram: ['16GB', '32GB'], priceBase: 238000, makerModel: 'A2485' },
  { series: 'MacBook Pro 16インチ M1 Max', slug: 'macbook-pro-16-m1max', chip: 'M1 Max', screen: '16インチ', year: '2021', storage: ['1TB', '2TB', '4TB'], ram: ['32GB', '64GB'], priceBase: 308000, makerModel: 'A2485' },
  { series: 'MacBook Pro 14インチ M2 Pro', slug: 'macbook-pro-14-m2pro', chip: 'M2 Pro', screen: '14インチ', year: '2023', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['16GB', '32GB'], priceBase: 238000, makerModel: 'A2779' },
  { series: 'MacBook Pro 14インチ M2 Max', slug: 'macbook-pro-14-m2max', chip: 'M2 Max', screen: '14インチ', year: '2023', storage: ['1TB', '2TB', '4TB'], ram: ['32GB', '64GB'], priceBase: 312000, makerModel: 'A2779' },
  { series: 'MacBook Pro 16インチ M2 Pro', slug: 'macbook-pro-16-m2pro', chip: 'M2 Pro', screen: '16インチ', year: '2023', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['16GB', '32GB'], priceBase: 278000, makerModel: 'A2780' },
  { series: 'MacBook Pro 16インチ M2 Max', slug: 'macbook-pro-16-m2max', chip: 'M2 Max', screen: '16インチ', year: '2023', storage: ['1TB', '2TB', '4TB'], ram: ['32GB', '64GB'], priceBase: 348000, makerModel: 'A2780' },
  { series: 'MacBook Pro 14インチ M3 Pro', slug: 'macbook-pro-14-m3pro', chip: 'M3 Pro', screen: '14インチ', year: '2023', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['18GB', '36GB'], priceBase: 276000, makerModel: 'A2992' },
  { series: 'MacBook Pro 14インチ M3 Max', slug: 'macbook-pro-14-m3max', chip: 'M3 Max', screen: '14インチ', year: '2023', storage: ['1TB', '2TB', '4TB', '8TB'], ram: ['36GB', '48GB', '64GB'], priceBase: 368000, makerModel: 'A2992' },
  { series: 'MacBook Pro 16インチ M3 Pro', slug: 'macbook-pro-16-m3pro', chip: 'M3 Pro', screen: '16インチ', year: '2023', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['18GB', '36GB'], priceBase: 318000, makerModel: 'A2991' },
  { series: 'MacBook Pro 16インチ M3 Max', slug: 'macbook-pro-16-m3max', chip: 'M3 Max', screen: '16インチ', year: '2023', storage: ['1TB', '2TB', '4TB', '8TB'], ram: ['36GB', '48GB', '64GB'], priceBase: 412000, makerModel: 'A2991' },
  { series: 'MacBook Pro 14インチ M4 Pro', slug: 'macbook-pro-14-m4pro', chip: 'M4 Pro', screen: '14インチ', year: '2024', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['24GB', '48GB'], priceBase: 322000, makerModel: 'A3401' },
  { series: 'MacBook Pro 14インチ M4 Max', slug: 'macbook-pro-14-m4max', chip: 'M4 Max', screen: '14インチ', year: '2024', storage: ['1TB', '2TB', '4TB', '8TB'], ram: ['36GB', '48GB', '64GB'], priceBase: 418000, makerModel: 'A3401' },
  { series: 'MacBook Pro 16インチ M4 Pro', slug: 'macbook-pro-16-m4pro', chip: 'M4 Pro', screen: '16インチ', year: '2024', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['24GB', '48GB'], priceBase: 364000, makerModel: 'A3403' },
  { series: 'MacBook Pro 16インチ M4 Max', slug: 'macbook-pro-16-m4max', chip: 'M4 Max', screen: '16インチ', year: '2024', storage: ['1TB', '2TB', '4TB', '8TB'], ram: ['36GB', '48GB', '64GB'], priceBase: 468000, makerModel: 'A3403' }
];
for (const line of macbookProLines) {
  for (const ram of line.ram) {
    for (const storage of line.storage) {
      const id = `${line.slug}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.priceBase + storageIndex(storage) * 38000 + ramIndex(ram) * 18000;
      const product = cloneProduct('ipad-air5-64-wifi', {
        id,
        category: 'パソコン',
        series: line.series,
        name: `${line.series} ${ram} ${storage}`,
        aliases: [
          `${line.slug} ${ram.toLowerCase()} ${storage.toLowerCase()}`,
          `${line.series.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`,
          `macbook pro ${line.chip.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`
        ],
        searchTokens: ['macbook', 'pro', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        specs: { generation: line.year, chip: line.chip, memory: ram, storage, size: line.screen },
        market: buildMarket({
          yahoo: [Math.round(basePrice * 0.84), Math.round(basePrice * 0.99)],
          rakuma: [Math.round(basePrice * 0.8), Math.round(basePrice * 0.95)],
          buyback: [Math.round(basePrice * 0.65), Math.round(basePrice * 0.78)],
          shipping: 1600
        }),
        descriptionHints: ['チップ・RAM・SSD容量を明記', '充放電回数・キーボード言語・バッテリー状態を記載', '電源アダプタ・ケーブル有無を補足'],
        titleKeywords: [line.chip, ram, storage]
      });
      const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
        id,
        category: 'computer',
        brand: 'Apple',
        series: line.series,
        displayName: `${line.series} ${ram} ${storage}`,
        canonicalModel: `${line.slug.toUpperCase()}-${ram}-${storage}`,
        makerModel: line.makerModel,
        storage,
        connectivity: null,
        color: 'スペースブラック',
        searchKeywords: [line.series.toLowerCase(), 'macbook pro', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        excludeKeywords: ['ジャンク', '空箱', 'ロジックボード', '液晶のみ', 'キーボードのみ'],
        requiredKeywords: ['macbook pro', storage.toLowerCase()],
        preferredKeywords: [line.chip.toLowerCase(), ram.toLowerCase(), line.makerModel.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const macMiniLines = [
  { series: 'Mac mini M1', slug: 'mac-mini-m1', chip: 'M1', year: '2020', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB'], priceBase: 76000, makerModel: 'A2348' },
  { series: 'Mac mini M2', slug: 'mac-mini-m2', chip: 'M2', year: '2023', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['8GB', '16GB', '24GB'], priceBase: 98000, makerModel: 'A2686' },
  { series: 'Mac mini M2 Pro', slug: 'mac-mini-m2pro', chip: 'M2 Pro', year: '2023', storage: ['512GB', '1TB', '2TB', '4TB'], ram: ['16GB', '32GB'], priceBase: 168000, makerModel: 'A2816' },
  { series: 'Mac mini M4', slug: 'mac-mini-m4', chip: 'M4', year: '2024', storage: ['256GB', '512GB', '1TB', '2TB'], ram: ['16GB', '24GB', '32GB'], priceBase: 126000, makerModel: 'A3238' },
  { series: 'Mac mini M4 Pro', slug: 'mac-mini-m4pro', chip: 'M4 Pro', year: '2024', storage: ['512GB', '1TB', '2TB', '4TB', '8TB'], ram: ['24GB', '48GB', '64GB'], priceBase: 228000, makerModel: 'A3239' }
];
for (const line of macMiniLines) {
  for (const ram of line.ram) {
    for (const storage of line.storage) {
      const id = `${line.slug}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.priceBase + storageIndex(storage) * 22000 + ramIndex(ram) * 12000;
      const product = cloneProduct('ipad-air5-64-wifi', {
        id,
        category: 'パソコン',
        series: line.series,
        name: `${line.series} ${ram} ${storage}`,
        aliases: [`${line.series.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`, `${line.slug} ${ram.toLowerCase()} ${storage.toLowerCase()}`],
        searchTokens: ['mac mini', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        specs: { generation: line.year, chip: line.chip, memory: ram, storage, size: 'デスクトップ' },
        market: buildMarket({
          yahoo: [Math.round(basePrice * 0.83), Math.round(basePrice * 0.98)],
          rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)],
          buyback: [Math.round(basePrice * 0.62), Math.round(basePrice * 0.75)],
          shipping: 1200
        }),
        descriptionHints: ['チップ・メモリ・SSD容量を明記', '電源ケーブル有無と傷を記載', '初期化済み・アクティベーションロックなしを補足'],
        titleKeywords: [line.chip, ram, storage]
      });
      const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
        id,
        category: 'computer',
        brand: 'Apple',
        series: line.series,
        displayName: `${line.series} ${ram} ${storage}`,
        canonicalModel: `${line.slug.toUpperCase()}-${ram}-${storage}`,
        makerModel: line.makerModel,
        storage,
        connectivity: null,
        color: 'シルバー',
        searchKeywords: [line.series.toLowerCase(), 'mac mini', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
        excludeKeywords: ['ジャンク', '空箱', '基板のみ'],
        requiredKeywords: ['mac mini', storage.toLowerCase()],
        preferredKeywords: [line.chip.toLowerCase(), ram.toLowerCase(), line.makerModel.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const ipadProM4Lines = [
  { series: 'iPad Pro 11インチ M4', slug: 'ipad-pro11-m4', chip: 'M4', makerModel: 'A2836', cellularModel: 'A2837', canonicalPrefix: 'IPADPRO11-M4', storage: ['256GB', '512GB', '1TB', '2TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 168000, cellular: 192000 } },
  { series: 'iPad Pro 13インチ M4', slug: 'ipad-pro13-m4', chip: 'M4', makerModel: 'A2925', cellularModel: 'A2926', canonicalPrefix: 'IPADPRO13-M4', storage: ['256GB', '512GB', '1TB', '2TB'], modes: ['Wi‑Fi', 'Cellular'], prices: { wifi: 214000, cellular: 239000 } }
];
for (const line of ipadProM4Lines) {
  for (const mode of line.modes) {
    for (const storage of line.storage) {
      const modeKey = mode === 'Wi‑Fi' ? 'wifi' : 'cellular';
      const id = `${line.slug}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}-${modeKey}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.prices[modeKey] + storageIndex(storage) * 16000;
      const model = mode === 'Wi‑Fi' ? line.makerModel : line.cellularModel;
      const product = cloneProduct('ipad-air5-64-wifi', {
        id,
        series: line.series,
        name: `${line.series} ${storage} ${mode}`,
        aliases: [`${line.slug} ${storage.toLowerCase()} ${modeKey}`, `${line.series.toLowerCase()} ${storage.toLowerCase()} ${modeKey}`],
        searchTokens: ['ipad pro', 'm4', storage.toLowerCase(), modeKey, model.toLowerCase()],
        specs: { generation: line.series, storage, connectivity: mode, chip: line.chip },
        market: buildMarket({
          yahoo: [Math.round(basePrice * 0.85), Math.round(basePrice * 0.98)],
          rakuma: [Math.round(basePrice * 0.8), Math.round(basePrice * 0.94)],
          buyback: [Math.round(basePrice * 0.64), Math.round(basePrice * 0.76)],
          shipping: 1000
        }),
        descriptionHints: ['M4世代・容量・Wi‑Fi/Cellularを明記', 'バッテリー状態とApple Pencil対応を補足', 'Magic Keyboard併売なら別出品推奨'],
        titleKeywords: [line.chip, storage, mode]
      });
      const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
        id,
        series: line.series,
        displayName: `${line.series} ${storage} ${mode}`,
        canonicalModel: `${line.canonicalPrefix}-${storage}-${modeKey}`,
        makerModel: model,
        storage,
        connectivity: mode,
        searchKeywords: [line.series.toLowerCase(), 'ipad pro', line.chip.toLowerCase(), storage.toLowerCase(), modeKey, model.toLowerCase()],
        excludeKeywords: ['箱のみ', 'ペンのみ', 'カバーのみ', 'ジャンク'],
        requiredKeywords: ['ipad pro', storage.toLowerCase()],
        preferredKeywords: [modeKey, model.toLowerCase(), line.chip.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const appleAccessoryLines = [
  { id: 'apple-pencil-usbc', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Apple Pencil USB-C', name: 'Apple Pencil USB-C', model: 'MUWA3ZA/A', marketBase: 9800, keywords: ['apple pencil usb-c', 'usb-c'] },
  { id: 'apple-pencil-1', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Apple Pencil 第1世代', name: 'Apple Pencil 第1世代', model: 'MK0C2J/A', marketBase: 7200, keywords: ['apple pencil 1', '第1世代'] },
  { id: 'apple-pencil-2', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Apple Pencil 第2世代', name: 'Apple Pencil 第2世代', model: 'MU8F2J/A', marketBase: 10800, keywords: ['apple pencil 2', '第2世代'] },
  { id: 'apple-pencil-pro', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Apple Pencil Pro', name: 'Apple Pencil Pro', model: 'MX2D3ZA/A', marketBase: 14200, keywords: ['apple pencil pro', 'pencil pro'] },
  { id: 'magic-keyboard-ipad-pro11', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Magic Keyboard for iPad Pro 11インチ', name: 'Magic Keyboard iPad Pro 11インチ用', model: 'MXQT2J/A', marketBase: 16800, keywords: ['magic keyboard ipad pro 11', '11インチ'] },
  { id: 'magic-keyboard-ipad-pro129', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Magic Keyboard for iPad Pro 12.9インチ', name: 'Magic Keyboard iPad Pro 12.9インチ用', model: 'MJQK3J/A', marketBase: 19800, keywords: ['magic keyboard ipad pro 12.9', '12.9インチ'] },
  { id: 'magic-keyboard-ipad-air11', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Magic Keyboard for iPad Air 11インチ', name: 'Magic Keyboard iPad Air 11インチ用', model: 'MDFV4J/A', marketBase: 22800, keywords: ['magic keyboard ipad air 11', '11インチ'] },
  { id: 'magic-keyboard-ipad-air13', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', brand: 'Apple', series: 'Magic Keyboard for iPad Air 13インチ', name: 'Magic Keyboard iPad Air 13インチ用', model: 'MDFW4J/A', marketBase: 24800, keywords: ['magic keyboard ipad air 13', '13インチ'] }
];
for (const item of appleAccessoryLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    category: item.category,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), ...item.keywords],
    searchTokens: ['apple', item.model.toLowerCase(), ...item.keywords],
    specs: { generation: item.series, connectivity: 'Bluetooth/磁気接続', edition: item.model },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.85), Math.round(item.marketBase * 1.02)],
      rakuma: [Math.round(item.marketBase * 0.78), Math.round(item.marketBase * 0.95)],
      buyback: [Math.round(item.marketBase * 0.48), Math.round(item.marketBase * 0.64)],
      shipping: 750
    }),
    descriptionHints: ['対応機種を必ず明記', '箱・充電ケーブル・替えチップの有無を記載', '刻印有無や傷を写真で補足'],
    titleKeywords: [item.model, '純正', '対応機種確認']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    category: item.snapshotCategory,
    brand: item.brand,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.model,
    storage: null,
    connectivity: 'Bluetooth/磁気接続',
    color: 'ホワイト',
    searchKeywords: [item.series.toLowerCase(), item.name.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    excludeKeywords: ['箱のみ', '替芯のみ', 'ケースのみ', 'ジャンク'],
    requiredKeywords: item.keywords.slice(0, 1),
    preferredKeywords: [item.model.toLowerCase(), '純正']
  });
  addProduct(product, snapshot);
}

const headphonesLines = [
  { id: 'beats-studio-pro-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Beats', series: 'Beats Studio Pro', name: 'Beats Studio Pro ブラック', model: 'MQTP3PA/A', marketBase: 26800, keywords: ['beats studio pro', 'black'] },
  { id: 'beats-solo4-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Beats', series: 'Beats Solo 4', name: 'Beats Solo 4 マットブラック', model: 'MUW23PA/A', marketBase: 18200, keywords: ['beats solo 4', 'black'] },
  { id: 'beats-fit-pro-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Beats', series: 'Beats Fit Pro', name: 'Beats Fit Pro ブラック', model: 'MK2F3PA/A', marketBase: 14200, keywords: ['beats fit pro', 'black'] },
  { id: 'beats-studio-buds-plus-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Beats', series: 'Beats Studio Buds +', name: 'Beats Studio Buds + トランスペアレントブラック', model: 'MQLJ3PA/A', marketBase: 12800, keywords: ['beats studio buds plus', 'transparent'] },
  { id: 'powerbeats-pro-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Beats', series: 'Powerbeats Pro', name: 'Powerbeats Pro ブラック', model: 'MV6Y2PA/A', marketBase: 11800, keywords: ['powerbeats pro', 'black'] },
  { id: 'bose-qc-ultra-headphones-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Bose', series: 'Bose QuietComfort Ultra Headphones', name: 'Bose QuietComfort Ultra Headphones ブラック', model: '880066-0100', marketBase: 35800, keywords: ['bose qc ultra headphones', 'black'] },
  { id: 'bose-qc-ultra-earbuds-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Bose', series: 'Bose QuietComfort Ultra Earbuds', name: 'Bose QuietComfort Ultra Earbuds ブラック', model: '882826-0010', marketBase: 22800, keywords: ['bose qc ultra earbuds', 'black'] },
  { id: 'bose-qc45-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Bose', series: 'Bose QuietComfort 45', name: 'Bose QuietComfort 45 ブラック', model: '866724-0100', marketBase: 20200, keywords: ['bose qc45', 'black'] },
  { id: 'bose-quietcomfort-sc-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Bose', series: 'Bose QuietComfort SC', name: 'Bose QuietComfort SC ブラック', model: '884367-0100', marketBase: 18800, keywords: ['bose quietcomfort sc', 'black'] },
  { id: 'sony-wh1000xm4-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Sony', series: 'Sony WH-1000XM4', name: 'Sony WH-1000XM4 ブラック', model: 'WH-1000XM4', marketBase: 20800, keywords: ['wh-1000xm4', 'black'] },
  { id: 'sony-wh1000xm5-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Sony', series: 'Sony WH-1000XM5', name: 'Sony WH-1000XM5 ブラック', model: 'WH-1000XM5', marketBase: 28800, keywords: ['wh-1000xm5', 'black'] },
  { id: 'sony-wf1000xm4-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Sony', series: 'Sony WF-1000XM4', name: 'Sony WF-1000XM4 ブラック', model: 'WF-1000XM4', marketBase: 9800, keywords: ['wf-1000xm4', 'black'] },
  { id: 'sony-wf1000xm5-black', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Sony', series: 'Sony WF-1000XM5', name: 'Sony WF-1000XM5 ブラック', model: 'WF-1000XM5', marketBase: 16800, keywords: ['wf-1000xm5', 'black'] },
  { id: 'sony-inzone-buds-white', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'earbuds', brand: 'Sony', series: 'Sony INZONE Buds', name: 'Sony INZONE Buds ホワイト', model: 'WF-G700N', marketBase: 14200, keywords: ['inzone buds', 'white'] },
  { id: 'sony-inzone-h9-white', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc', category: 'イヤホン', snapshotCategory: 'headphones', brand: 'Sony', series: 'Sony INZONE H9', name: 'Sony INZONE H9 ホワイト', model: 'WH-G900N', marketBase: 19800, keywords: ['inzone h9', 'white'] }
];
for (const item of headphonesLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    category: item.category,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), item.series.toLowerCase(), ...item.keywords],
    searchTokens: [item.brand.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    specs: { generation: item.series, connectivity: 'Bluetooth', edition: item.brand },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.86), Math.round(item.marketBase * 1.02)],
      rakuma: [Math.round(item.marketBase * 0.8), Math.round(item.marketBase * 0.96)],
      buyback: [Math.round(item.marketBase * 0.5), Math.round(item.marketBase * 0.66)],
      shipping: 650
    }),
    descriptionHints: ['型番・カラーを明記', 'イヤーパッド劣化やバッテリー持ちを記載', 'ケース・USBケーブル・ドングル有無を補足'],
    titleKeywords: [item.brand, item.model, '動作確認済み']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    category: item.snapshotCategory,
    brand: item.brand,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.model,
    storage: null,
    connectivity: 'Bluetooth',
    color: item.name.split(' ').at(-1),
    searchKeywords: [item.series.toLowerCase(), item.name.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    excludeKeywords: ['箱のみ', 'ケースのみ', '左耳のみ', '右耳のみ', 'イヤーパッドのみ', 'ジャンク'],
    requiredKeywords: item.keywords.slice(0, 1),
    preferredKeywords: [item.model.toLowerCase(), item.brand.toLowerCase()]
  });
  addProduct(product, snapshot);
}

const vrLines = [
  { id: 'meta-quest2-128', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 2', name: 'Meta Quest 2 128GB', model: '899-00183-02', marketBase: 22800, keywords: ['meta quest 2', '128gb'] },
  { id: 'meta-quest2-256', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 2', name: 'Meta Quest 2 256GB', model: '899-00184-02', marketBase: 26800, keywords: ['meta quest 2', '256gb'] },
  { id: 'meta-quest3-128', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 3', name: 'Meta Quest 3 128GB', model: '899-00579-01', marketBase: 54800, keywords: ['meta quest 3', '128gb'] },
  { id: 'meta-quest3-512', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 3', name: 'Meta Quest 3 512GB', model: '899-00580-01', marketBase: 68800, keywords: ['meta quest 3', '512gb'] },
  { id: 'meta-quest3s-128', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 3S', name: 'Meta Quest 3S 128GB', model: 'SK-1000203-01', marketBase: 41800, keywords: ['meta quest 3s', '128gb'] },
  { id: 'meta-quest3s-256', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest 3S', name: 'Meta Quest 3S 256GB', model: 'SK-1000204-01', marketBase: 48800, keywords: ['meta quest 3s', '256gb'] },
  { id: 'meta-quest-pro-256', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', category: 'VR', snapshotCategory: 'vr', brand: 'Meta', series: 'Meta Quest Pro', name: 'Meta Quest Pro 256GB', model: '899-00412-01', marketBase: 78800, keywords: ['meta quest pro', '256gb'] },
  { id: 'playstation-vr2', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', category: 'VR', snapshotCategory: 'vr', brand: 'Sony', series: 'PlayStation VR2', name: 'PlayStation VR2 CFIJ-17000', model: 'CFIJ-17000', marketBase: 44800, keywords: ['ps vr2', 'playstation vr2'] }
];
for (const item of vrLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    category: item.category,
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), item.series.toLowerCase(), ...item.keywords],
    searchTokens: [item.brand.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    specs: { generation: item.series, storage: item.name.includes('GB') ? item.name.match(/\d+(?:TB|GB)/)?.[0] ?? null : null, edition: item.brand },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.86), Math.round(item.marketBase * 1.02)],
      rakuma: [Math.round(item.marketBase * 0.8), Math.round(item.marketBase * 0.95)],
      buyback: [Math.round(item.marketBase * 0.52), Math.round(item.marketBase * 0.68)],
      shipping: 1200
    }),
    descriptionHints: ['ストラップ・充電器・コントローラーの有無を明記', 'フェイスクッションやレンズ状態を記載', 'Metaアカウント/初期化済みを補足'],
    titleKeywords: [item.brand, item.model, '動作確認済み']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    category: item.snapshotCategory,
    brand: item.brand,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.model,
    storage: item.name.includes('GB') ? item.name.match(/\d+(?:TB|GB)/)?.[0] ?? null : null,
    connectivity: null,
    color: 'ホワイト',
    searchKeywords: [item.series.toLowerCase(), item.name.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    excludeKeywords: ['箱のみ', 'コントローラーのみ', 'ケーブルのみ', 'ジャンク'],
    requiredKeywords: item.keywords.slice(0, 1),
    preferredKeywords: [item.model.toLowerCase(), item.brand.toLowerCase()]
  });
  addProduct(product, snapshot);
}

const goproLines = [
  { id: 'gopro-hero10-black', brand: 'GoPro', series: 'GoPro HERO10 Black', name: 'GoPro HERO10 Black', model: 'CHDHX-101-FW', marketBase: 24200 },
  { id: 'gopro-hero11-black', brand: 'GoPro', series: 'GoPro HERO11 Black', name: 'GoPro HERO11 Black', model: 'CHDHX-111-FW', marketBase: 29800 },
  { id: 'gopro-hero11-black-mini', brand: 'GoPro', series: 'GoPro HERO11 Black Mini', name: 'GoPro HERO11 Black Mini', model: 'CHDHF-111-FW', marketBase: 23800 },
  { id: 'gopro-hero12-black', brand: 'GoPro', series: 'GoPro HERO12 Black', name: 'GoPro HERO12 Black', model: 'CHDHX-121-FW', marketBase: 35800 },
  { id: 'gopro-hero13-black', brand: 'GoPro', series: 'GoPro HERO13 Black', name: 'GoPro HERO13 Black', model: 'CHDHX-131-FW', marketBase: 46800 },
  { id: 'gopro-max-360', brand: 'GoPro', series: 'GoPro MAX', name: 'GoPro MAX 360', model: 'CHDHZ-202-FX', marketBase: 32800 }
];
for (const item of goproLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct('switch-oled-white', {
    id: item.id,
    category: 'カメラ',
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), item.series.toLowerCase(), item.model.toLowerCase()],
    searchTokens: ['gopro', item.model.toLowerCase(), 'action camera'],
    specs: { generation: item.series, color: 'ブラック', edition: item.model },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.86), Math.round(item.marketBase * 1.01)],
      rakuma: [Math.round(item.marketBase * 0.8), Math.round(item.marketBase * 0.95)],
      buyback: [Math.round(item.marketBase * 0.5), Math.round(item.marketBase * 0.66)],
      shipping: 850
    }),
    descriptionHints: ['バッテリー本数・マウント類の有無を明記', 'レンズ傷や端子カバー状態を記載', '撮影・録画・手ぶれ補正の動作確認を補足'],
    titleKeywords: [item.model, 'アクションカメラ', '動作確認済み']
  });
  const snapshot = cloneSnapshot('switch-oled-white', {
    id: item.id,
    category: 'camera',
    brand: item.brand,
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.model,
    storage: null,
    connectivity: null,
    color: 'ブラック',
    searchKeywords: [item.series.toLowerCase(), item.name.toLowerCase(), item.model.toLowerCase(), 'gopro'],
    excludeKeywords: ['箱のみ', 'バッテリーのみ', 'マウントのみ', 'ジャンク'],
    requiredKeywords: ['gopro'],
    preferredKeywords: [item.model.toLowerCase(), 'black']
  });
  addProduct(product, snapshot);
}

const surfaceProLines = [
  { series: 'Surface Pro 8', slug: 'surface-pro8', cpu: ['Core i5', 'Core i7'], ram: ['8GB', '16GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 98000, makerModel: '1983' },
  { series: 'Surface Pro 9', slug: 'surface-pro9', cpu: ['Core i5', 'Core i7'], ram: ['8GB', '16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 128000, makerModel: '2038' },
  { series: 'Surface Pro 10', slug: 'surface-pro10', cpu: ['Core Ultra 5', 'Core Ultra 7'], ram: ['16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 168000, makerModel: '2076' },
  { series: 'Surface Pro 11', slug: 'surface-pro11', cpu: ['Snapdragon X Plus', 'Snapdragon X Elite'], ram: ['16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 182000, makerModel: '2109' }
];
for (const line of surfaceProLines) {
  for (const cpu of line.cpu) {
    for (const ram of line.ram) {
      for (const storage of line.storage) {
        const id = `${line.slug}-${cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
        if (existingProductMap.has(id)) continue;
        const basePrice = line.priceBase + storageIndex(storage) * 18000 + ramIndex(ram) * 12000 + (cpu.includes('7') || cpu.includes('Elite') ? 26000 : 0);
        const product = cloneProduct('ipad-air5-64-wifi', {
          id,
          category: 'パソコン',
          series: line.series,
          name: `${line.series} ${cpu} ${ram} ${storage}`,
          aliases: [`${line.series.toLowerCase()} ${cpu.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`],
          searchTokens: ['surface pro', cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel],
          specs: { generation: line.series, chip: cpu, memory: ram, storage, size: '13インチ' },
          market: buildMarket({
            yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)],
            rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)],
            buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)],
            shipping: 1500
          }),
          descriptionHints: ['CPU・RAM・SSD容量を明記', 'タイプカバー有無・ペン有無を記載', 'バッテリー状態とキックスタンド傷を補足'],
          titleKeywords: [cpu, ram, storage]
        });
        const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
          id,
          category: 'computer',
          brand: 'Microsoft',
          series: line.series,
          displayName: `${line.series} ${cpu} ${ram} ${storage}`,
          canonicalModel: `${line.slug.toUpperCase()}-${cpu.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${ram}-${storage}`,
          makerModel: line.makerModel,
          storage,
          connectivity: 'Wi‑Fi',
          color: 'プラチナ',
          searchKeywords: [line.series.toLowerCase(), 'surface pro', cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()],
          excludeKeywords: ['ジャンク', 'タイプカバーのみ', 'ペンのみ', 'キーボードのみ'],
          requiredKeywords: ['surface pro', storage.toLowerCase()],
          preferredKeywords: [cpu.toLowerCase(), ram.toLowerCase(), line.makerModel]
        });
        addProduct(product, snapshot);
      }
    }
  }
}

const surfaceLaptopLines = [
  { series: 'Surface Laptop 4 13.5インチ', slug: 'surface-laptop4-13', cpu: ['Ryzen 5', 'Core i5'], ram: ['8GB', '16GB'], storage: ['256GB', '512GB'], priceBase: 88000, makerModel: '1950' },
  { series: 'Surface Laptop 5 13.5インチ', slug: 'surface-laptop5-13', cpu: ['Core i5', 'Core i7'], ram: ['8GB', '16GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 118000, makerModel: '2037' },
  { series: 'Surface Laptop 6 13.5インチ', slug: 'surface-laptop6-13', cpu: ['Core Ultra 5', 'Core Ultra 7'], ram: ['16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 158000, makerModel: '2095' },
  { series: 'Surface Laptop 7 13.8インチ', slug: 'surface-laptop7-13', cpu: ['Snapdragon X Plus', 'Snapdragon X Elite'], ram: ['16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 172000, makerModel: '2103' },
  { series: 'Surface Laptop 7 15インチ', slug: 'surface-laptop7-15', cpu: ['Snapdragon X Plus', 'Snapdragon X Elite'], ram: ['16GB', '32GB'], storage: ['256GB', '512GB', '1TB'], priceBase: 196000, makerModel: '2104' }
];
for (const line of surfaceLaptopLines) {
  for (const cpu of line.cpu) {
    for (const ram of line.ram) {
      for (const storage of line.storage) {
        const id = `${line.slug}-${cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
        if (existingProductMap.has(id)) continue;
        const basePrice = line.priceBase + storageIndex(storage) * 18000 + ramIndex(ram) * 12000 + (cpu.includes('7') || cpu.includes('Elite') ? 22000 : 0);
        const product = cloneProduct('ipad-air5-64-wifi', {
          id,
          category: 'パソコン',
          series: line.series,
          name: `${line.series} ${cpu} ${ram} ${storage}`,
          aliases: [`${line.series.toLowerCase()} ${cpu.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`],
          searchTokens: ['surface laptop', cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel],
          specs: { generation: line.series, chip: cpu, memory: ram, storage, size: line.series.includes('15') ? '15インチ' : '13インチ' },
          market: buildMarket({
            yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)],
            rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)],
            buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)],
            shipping: 1500
          }),
          descriptionHints: ['CPU・RAM・SSD容量を明記', '充放電回数・US/日本語キーボードを記載', 'ACアダプタ有無と天板傷を補足'],
          titleKeywords: [cpu, ram, storage]
        });
        const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
          id,
          category: 'computer',
          brand: 'Microsoft',
          series: line.series,
          displayName: `${line.series} ${cpu} ${ram} ${storage}`,
          canonicalModel: `${line.slug.toUpperCase()}-${cpu.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${ram}-${storage}`,
          makerModel: line.makerModel,
          storage,
          connectivity: 'Wi‑Fi',
          color: 'プラチナ',
          searchKeywords: [line.series.toLowerCase(), 'surface laptop', cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()],
          excludeKeywords: ['ジャンク', 'キーボードのみ', '液晶のみ'],
          requiredKeywords: ['surface laptop', storage.toLowerCase()],
          preferredKeywords: [cpu.toLowerCase(), ram.toLowerCase(), line.makerModel]
        });
        addProduct(product, snapshot);
      }
    }
  }
}

const gamingAccessoryLines = [
  { id: 'switch-pro-controller', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Nintendo Switch Proコントローラー', name: 'Nintendo Switch Proコントローラー', model: 'HAC-A-FSSKA', marketBase: 6200, keywords: ['switch pro controller', 'proコン'] },
  { id: 'joycon-neon-red-blue', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Joy-Con(L)/(R)', name: 'Joy-Con ネオンレッド/ネオンブルー', model: 'HAC-A-JAEAA', marketBase: 5200, keywords: ['joy-con', 'ネオン'] },
  { id: 'joycon-pastel-purple-green', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Joy-Con(L)/(R)', name: 'Joy-Con パステルパープル/パステルグリーン', model: 'HAC-A-JAYAF', marketBase: 5680, keywords: ['joy-con pastel', 'パステル'] },
  { id: 'switch-dock-oled', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Nintendo Switch ドック 有機ELモデル', name: 'Nintendo Switch ドック 有機ELモデル', model: 'HEG-A-PSAAA', marketBase: 5200, keywords: ['switch dock oled', 'ドック'] },
  { id: 'ring-fit-adventure-set', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', series: 'Ring Fit Adventure セット', name: 'Ring Fit Adventure リングコン・レッグバンド付き', model: 'HAC-R-AL3PA', marketBase: 5200, keywords: ['ring fit adventure', 'リングフィット'] },
  { id: 'ps5-dualsense-cosmic-red', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'DualSense ワイヤレスコントローラー', name: 'DualSense ワイヤレスコントローラー コズミック レッド', model: 'CFI-ZCT1J02', marketBase: 7480, keywords: ['dualsense cosmic red', 'red'] },
  { id: 'ps5-dualsense-galactic-purple', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'DualSense ワイヤレスコントローラー', name: 'DualSense ワイヤレスコントローラー ギャラクティック パープル', model: 'CFI-ZCT1J04', marketBase: 7680, keywords: ['dualsense galactic purple', 'purple'] },
  { id: 'ps5-pulse3d-headset', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', series: 'PULSE 3D ワイヤレスヘッドセット', name: 'PULSE 3D ワイヤレスヘッドセット', model: 'CFI-ZWH1J', marketBase: 7200, keywords: ['pulse 3d headset', 'headset'] },
  { id: 'ps5-dualsense-charging-station', baseId: 'ps5-slim-digital', snapshotBase: 'ps5-slim-digital', series: 'DualSense 充電スタンド', name: 'DualSense 充電スタンド CFI-ZDS1J', model: 'CFI-ZDS1J', marketBase: 3980, keywords: ['dualsense charging station', '充電スタンド'] },
  { id: 'ps5-access-controller', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', series: 'Access コントローラー', name: 'Access コントローラー CFI-ZAC1J', model: 'CFI-ZAC1J', marketBase: 6980, keywords: ['access controller', 'アクセシビリティ'] }
];
for (const item of gamingAccessoryLines) {
  if (existingProductMap.has(item.id)) continue;
  const product = cloneProduct(item.baseId, {
    id: item.id,
    category: 'ゲーム',
    series: item.series,
    name: item.name,
    aliases: [item.name.toLowerCase(), item.series.toLowerCase(), ...item.keywords],
    searchTokens: [item.model.toLowerCase(), ...item.keywords],
    specs: { generation: item.series, model: item.model },
    market: buildMarket({
      yahoo: [Math.round(item.marketBase * 0.88), Math.round(item.marketBase * 1.05)],
      rakuma: [Math.round(item.marketBase * 0.82), Math.round(item.marketBase * 0.98)],
      buyback: [Math.round(item.marketBase * 0.5), Math.round(item.marketBase * 0.66)],
      shipping: 750
    }),
    descriptionHints: ['型番とカラーを明記', 'ケーブル・ストラップ・ドングル有無を記載', 'ボタン/スティック動作を補足'],
    titleKeywords: [item.model, '純正', '動作確認済み']
  });
  const snapshot = cloneSnapshot(item.snapshotBase, {
    id: item.id,
    category: 'game-accessory',
    brand: item.id.startsWith('ps5') ? 'Sony' : 'Nintendo',
    series: item.series,
    displayName: item.name,
    canonicalModel: item.model,
    makerModel: item.model,
    storage: null,
    connectivity: null,
    color: item.name.split(' ').at(-1),
    searchKeywords: [item.series.toLowerCase(), item.name.toLowerCase(), item.model.toLowerCase(), ...item.keywords],
    excludeKeywords: ['箱のみ', 'ケースのみ', 'ジャンク'],
    requiredKeywords: item.keywords.slice(0, 1),
    preferredKeywords: [item.model.toLowerCase(), '純正']
  });
  addProduct(product, snapshot);
}


const macbookAirColorMap = {
  'MacBook Air 13インチ M1': ['スペースグレイ', 'シルバー', 'ゴールド'],
  'MacBook Air 13インチ M2': ['ミッドナイト', 'スターライト', 'シルバー', 'スペースグレイ'],
  'MacBook Air 15インチ M2': ['ミッドナイト', 'スターライト', 'シルバー', 'スペースグレイ'],
  'MacBook Air 13インチ M3': ['ミッドナイト', 'スターライト', 'シルバー', 'スペースグレイ'],
  'MacBook Air 15インチ M3': ['ミッドナイト', 'スターライト', 'シルバー', 'スペースグレイ'],
  'MacBook Air 13インチ M4': ['ミッドナイト', 'スターライト', 'シルバー', 'スカイブルー'],
  'MacBook Air 15インチ M4': ['ミッドナイト', 'スターライト', 'シルバー', 'スカイブルー']
};
for (const line of macbookAirLines) {
  const colors = macbookAirColorMap[line.series] ?? ['シルバー'];
  for (const color of colors) {
    for (const ram of line.ram) {
      for (const storage of line.storage) {
        const id = `${line.slug}-${color.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
        if (existingProductMap.has(id)) continue;
        const basePrice = line.priceBase + storageIndex(storage) * 26000 + ramIndex(ram) * 14000 + (color === 'ミッドナイト' || color === 'スカイブルー' ? 2000 : 0);
        const product = cloneProduct('ipad-air5-64-wifi', {
          id,
          category: 'パソコン',
          series: line.series,
          name: `${line.series} ${color} ${ram} ${storage}`,
          aliases: [`${line.series.toLowerCase()} ${color} ${ram.toLowerCase()} ${storage.toLowerCase()}`, `macbook air ${line.chip.toLowerCase()} ${color}`],
          searchTokens: ['macbook', 'air', line.chip.toLowerCase(), color, ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()],
          specs: { generation: line.year, chip: line.chip, memory: ram, storage, size: line.screen, color },
          market: buildMarket({ yahoo: [Math.round(basePrice * 0.84), Math.round(basePrice * 0.99)], rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)], buyback: [Math.round(basePrice * 0.63), Math.round(basePrice * 0.76)], shipping: 1500 }),
          descriptionHints: ['色・RAM・SSD容量を明記', 'キーボード言語と充放電回数を記載', 'ACアダプタ欠品有無を補足'],
          titleKeywords: [color, line.chip, storage]
        });
        const snapshot = cloneSnapshot('ipad-air5-64-wifi', {
          id,
          category: 'computer', brand: 'Apple', series: line.series, displayName: `${line.series} ${color} ${ram} ${storage}`,
          canonicalModel: `${line.slug.toUpperCase()}-${color}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: null, color,
          searchKeywords: [line.series.toLowerCase(), 'macbook air', color, line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()],
          excludeKeywords: ['ジャンク', '空箱', '液晶のみ'], requiredKeywords: ['macbook air', storage.toLowerCase()], preferredKeywords: [color, ram.toLowerCase(), line.makerModel.toLowerCase()]
        });
        addProduct(product, snapshot);
      }
    }
  }
}

const macbookProColors = ['シルバー', 'スペースブラック'];
for (const line of macbookProLines) {
  for (const color of macbookProColors) {
    for (const ram of line.ram) {
      for (const storage of line.storage) {
        const id = `${line.slug}-${color.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
        if (existingProductMap.has(id)) continue;
        const basePrice = line.priceBase + storageIndex(storage) * 38000 + ramIndex(ram) * 18000 + (color === 'スペースブラック' ? 4000 : 0);
        const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${color} ${ram} ${storage}`, aliases: [`${line.series.toLowerCase()} ${color} ${ram.toLowerCase()} ${storage.toLowerCase()}`], searchTokens: ['macbook', 'pro', line.chip.toLowerCase(), color, ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()], specs: { generation: line.year, chip: line.chip, memory: ram, storage, size: line.screen, color }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.84), Math.round(basePrice * 0.99)], rakuma: [Math.round(basePrice * 0.8), Math.round(basePrice * 0.95)], buyback: [Math.round(basePrice * 0.65), Math.round(basePrice * 0.78)], shipping: 1600 }), descriptionHints: ['色・チップ・RAM・SSDを明記', '充放電回数・キーボード配列を記載', '電源アダプタ有無を補足'], titleKeywords: [color, line.chip, storage] });
        const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: 'Apple', series: line.series, displayName: `${line.series} ${color} ${ram} ${storage}`, canonicalModel: `${line.slug.toUpperCase()}-${color}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: null, color, searchKeywords: [line.series.toLowerCase(), 'macbook pro', color, line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()], excludeKeywords: ['ジャンク', '空箱', '液晶のみ'], requiredKeywords: ['macbook pro', storage.toLowerCase()], preferredKeywords: [color, ram.toLowerCase(), line.makerModel.toLowerCase()] });
        addProduct(product, snapshot);
      }
    }
  }
}

const iMacLines = [
  { series: 'iMac 24インチ M1', slug: 'imac-24-m1', chip: 'M1', ram: ['8GB', '16GB'], storage: ['256GB', '512GB', '1TB'], colors: ['ブルー', 'グリーン', 'ピンク', 'シルバー'], priceBase: 132000, makerModel: 'A2438' },
  { series: 'iMac 24インチ M3', slug: 'imac-24-m3', chip: 'M3', ram: ['8GB', '16GB', '24GB'], storage: ['256GB', '512GB', '1TB', '2TB'], colors: ['ブルー', 'グリーン', 'ピンク', 'シルバー'], priceBase: 188000, makerModel: 'A2873' }
];
for (const line of iMacLines) {
  for (const color of line.colors) {
    for (const ram of line.ram) {
      for (const storage of line.storage) {
        const id = `${line.slug}-${color}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
        if (existingProductMap.has(id)) continue;
        const basePrice = line.priceBase + storageIndex(storage) * 24000 + ramIndex(ram) * 14000;
        const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${color} ${ram} ${storage}`, aliases: [`${line.series.toLowerCase()} ${color} ${ram.toLowerCase()} ${storage.toLowerCase()}`], searchTokens: ['imac', line.chip.toLowerCase(), color, ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()], specs: { generation: line.series, chip: line.chip, memory: ram, storage, size: '24インチ', color }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)], rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)], buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)], shipping: 2200 }), descriptionHints: ['カラー・RAM・SSDを明記', 'Magic Keyboard/Mouse有無を記載', '液晶ムラやスタンド傷を補足'], titleKeywords: [color, line.chip, storage] });
        const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: 'Apple', series: line.series, displayName: `${line.series} ${color} ${ram} ${storage}`, canonicalModel: `${line.slug.toUpperCase()}-${color}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: null, color, searchKeywords: [line.series.toLowerCase(), 'imac', color, line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()], excludeKeywords: ['ジャンク', 'キーボードのみ', 'マウスのみ'], requiredKeywords: ['imac', storage.toLowerCase()], preferredKeywords: [color, ram.toLowerCase(), line.makerModel.toLowerCase()] });
        addProduct(product, snapshot);
      }
    }
  }
}

const macStudioLines = [
  { series: 'Mac Studio M1 Max', slug: 'mac-studio-m1max', chip: 'M1 Max', ram: ['32GB', '64GB'], storage: ['512GB', '1TB', '2TB', '4TB'], priceBase: 248000, makerModel: 'A2615' },
  { series: 'Mac Studio M1 Ultra', slug: 'mac-studio-m1ultra', chip: 'M1 Ultra', ram: ['64GB', '128GB'], storage: ['1TB', '2TB', '4TB', '8TB'], priceBase: 398000, makerModel: 'A2615' },
  { series: 'Mac Studio M2 Max', slug: 'mac-studio-m2max', chip: 'M2 Max', ram: ['32GB', '64GB', '96GB'], storage: ['512GB', '1TB', '2TB', '4TB', '8TB'], priceBase: 298000, makerModel: 'A2901' },
  { series: 'Mac Studio M2 Ultra', slug: 'mac-studio-m2ultra', chip: 'M2 Ultra', ram: ['64GB', '128GB', '192GB'], storage: ['1TB', '2TB', '4TB', '8TB'], priceBase: 458000, makerModel: 'A2901' }
];
for (const line of macStudioLines) {
  for (const ram of line.ram) {
    for (const storage of line.storage) {
      const id = `${line.slug}-${ram.toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.priceBase + storageIndex(storage) * 42000 + ramIndex(ram) * 18000;
      const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${ram} ${storage}`, aliases: [`${line.series.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`], searchTokens: ['mac studio', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel.toLowerCase()], specs: { generation: line.series, chip: line.chip, memory: ram, storage, size: 'デスクトップ' }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.83), Math.round(basePrice * 0.98)], rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)], buyback: [Math.round(basePrice * 0.61), Math.round(basePrice * 0.75)], shipping: 1800 }), descriptionHints: ['チップ・RAM・SSDを明記', '電源ケーブル・外箱有無を記載', '初期化済みを補足'], titleKeywords: [line.chip, ram, storage] });
      const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: 'Apple', series: line.series, displayName: `${line.series} ${ram} ${storage}`, canonicalModel: `${line.slug.toUpperCase()}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: null, color: 'シルバー', searchKeywords: [line.series.toLowerCase(), 'mac studio', line.chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()], excludeKeywords: ['ジャンク', '空箱', '基板のみ'], requiredKeywords: ['mac studio', storage.toLowerCase()], preferredKeywords: [line.chip.toLowerCase(), ram.toLowerCase(), line.makerModel.toLowerCase()] });
      addProduct(product, snapshot);
    }
  }
}

const surfaceProColors = ['プラチナ', 'グラファイト'];
for (const line of surfaceProLines) {
  for (const color of surfaceProColors) {
    for (const cpu of line.cpu) {
      for (const ram of line.ram) {
        for (const storage of line.storage) {
          const id = `${line.slug}-${color}-${cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
          if (existingProductMap.has(id)) continue;
          const basePrice = line.priceBase + storageIndex(storage) * 18000 + ramIndex(ram) * 12000 + (cpu.includes('7') || cpu.includes('Elite') ? 26000 : 0);
          const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${color} ${cpu} ${ram} ${storage}`, aliases: [`${line.series.toLowerCase()} ${color} ${cpu.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`], searchTokens: ['surface pro', color, cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel], specs: { generation: line.series, chip: cpu, memory: ram, storage, size: '13インチ', color }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)], rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)], buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)], shipping: 1500 }), descriptionHints: ['カラー・CPU・RAM・SSDを明記', 'タイプカバー有無を記載', 'キックスタンド傷を補足'], titleKeywords: [color, cpu, storage] });
          const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: 'Microsoft', series: line.series, displayName: `${line.series} ${color} ${cpu} ${ram} ${storage}`, canonicalModel: `${line.slug.toUpperCase()}-${color}-${cpu.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: 'Wi‑Fi', color, searchKeywords: [line.series.toLowerCase(), 'surface pro', color, cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()], excludeKeywords: ['ジャンク', 'タイプカバーのみ', 'ペンのみ'], requiredKeywords: ['surface pro', storage.toLowerCase()], preferredKeywords: [color, cpu.toLowerCase(), line.makerModel] });
          addProduct(product, snapshot);
        }
      }
    }
  }
}

const surfaceLaptopColors = ['プラチナ', 'サファイア', 'ブラック'];
for (const line of surfaceLaptopLines) {
  for (const color of surfaceLaptopColors) {
    for (const cpu of line.cpu) {
      for (const ram of line.ram) {
        for (const storage of line.storage) {
          const id = `${line.slug}-${color}-${cpu.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ram.replace('GB', '').toLowerCase()}-${storage.toLowerCase().replace('gb', '').replace('tb', 'tb')}`;
          if (existingProductMap.has(id)) continue;
          const basePrice = line.priceBase + storageIndex(storage) * 18000 + ramIndex(ram) * 12000 + (cpu.includes('7') || cpu.includes('Elite') ? 22000 : 0);
          const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${color} ${cpu} ${ram} ${storage}`, aliases: [`${line.series.toLowerCase()} ${color} ${cpu.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()}`], searchTokens: ['surface laptop', color, cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), line.makerModel], specs: { generation: line.series, chip: cpu, memory: ram, storage, size: line.series.includes('15') ? '15インチ' : '13インチ', color }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)], rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)], buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)], shipping: 1500 }), descriptionHints: ['カラー・CPU・RAM・SSDを明記', '充放電回数とキーボード配列を記載', 'ACアダプタ有無を補足'], titleKeywords: [color, cpu, storage] });
          const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: 'Microsoft', series: line.series, displayName: `${line.series} ${color} ${cpu} ${ram} ${storage}`, canonicalModel: `${line.slug.toUpperCase()}-${color}-${cpu.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${ram}-${storage}`, makerModel: line.makerModel, storage, connectivity: 'Wi‑Fi', color, searchKeywords: [line.series.toLowerCase(), 'surface laptop', color, cpu.toLowerCase(), ram.toLowerCase(), storage.toLowerCase()], excludeKeywords: ['ジャンク', 'キーボードのみ', '液晶のみ'], requiredKeywords: ['surface laptop', storage.toLowerCase()], preferredKeywords: [color, cpu.toLowerCase(), line.makerModel] });
          addProduct(product, snapshot);
        }
      }
    }
  }
}

const headphoneColors = {
  'beats-studio-pro-black': ['サンドストーン', 'ディープブラウン', 'ネイビー'],
  'beats-solo4-black': ['クラウドピンク', 'スレートブルー'],
  'beats-fit-pro-black': ['ホワイト', 'セージグレイ'],
  'beats-studio-buds-plus-black': ['アイボリー', 'コズミックシルバー'],
  'powerbeats-pro-black': ['アイボリー', 'ネイビー'],
  'bose-qc-ultra-headphones-black': ['ホワイトスモーク', 'サンドストーン'],
  'bose-qc-ultra-earbuds-black': ['ホワイトスモーク', 'ムーンストーンブルー'],
  'bose-qc45-black': ['ホワイトスモーク'],
  'bose-quietcomfort-sc-black': ['チルドライラック'],
  'sony-wh1000xm4-black': ['プラチナシルバー'],
  'sony-wh1000xm5-black': ['プラチナシルバー', 'スモーキーピンク'],
  'sony-wf1000xm4-black': ['プラチナシルバー'],
  'sony-wf1000xm5-black': ['プラチナシルバー'],
  'sony-inzone-buds-white': ['ブラック'],
  'sony-inzone-h9-white': ['ブラック']
};
for (const base of headphonesLines) {
  for (const color of (headphoneColors[base.id] ?? [])) {
    const id = `${base.id}-${slugifyAscii(color)}`;
    if (existingProductMap.has(id)) continue;
    const product = cloneProduct(base.baseId, { id, category: base.category, series: base.series, name: `${base.series} ${color}`, aliases: [`${base.series.toLowerCase()} ${color}`, ...base.keywords], searchTokens: [base.brand.toLowerCase(), base.model.toLowerCase(), color, ...base.keywords], specs: { generation: base.series, connectivity: 'Bluetooth', edition: base.brand, color }, market: buildMarket({ yahoo: [Math.round(base.marketBase * 0.86), Math.round(base.marketBase * 1.02)], rakuma: [Math.round(base.marketBase * 0.8), Math.round(base.marketBase * 0.96)], buyback: [Math.round(base.marketBase * 0.5), Math.round(base.marketBase * 0.66)], shipping: 650 }), descriptionHints: ['カラーと型番を明記', 'イヤーパッド・ケース有無を記載', 'バッテリー持ちを補足'], titleKeywords: [base.brand, color, '動作確認済み'] });
    const snapshot = cloneSnapshot(base.snapshotBase, { id, category: base.snapshotCategory, brand: base.brand, series: base.series, displayName: `${base.series} ${color}`, canonicalModel: `${base.model}-${slugifyAscii(color)}`, makerModel: base.model, storage: null, connectivity: 'Bluetooth', color, searchKeywords: [base.series.toLowerCase(), color, base.model.toLowerCase(), ...base.keywords], excludeKeywords: ['箱のみ', 'ケースのみ', 'ジャンク'], requiredKeywords: base.keywords.slice(0,1), preferredKeywords: [base.model.toLowerCase(), color] });
    addProduct(product, snapshot);
  }
}

const iphoneColorMap = {
  se2: ['black', 'white', 'red'],
  se3: ['midnight', 'starlight', 'red'],
  11: ['black', 'white', 'green', 'purple', 'yellow', 'red'],
  '11pro': ['graphite', 'silver', 'gold', 'midnight-green'],
  '11promax': ['graphite', 'silver', 'gold', 'midnight-green'],
  12: ['black', 'white', 'blue', 'green', 'purple', 'red'],
  13: ['midnight', 'starlight', 'blue', 'pink', 'green', 'red'],
  '13mini': ['midnight', 'starlight', 'blue', 'pink', 'green', 'red'],
  14: ['midnight', 'starlight', 'blue', 'purple', 'yellow', 'red'],
  '14plus': ['midnight', 'starlight', 'blue', 'purple', 'yellow', 'red'],
  '14pro': ['space-black', 'silver', 'gold', 'deep-purple'],
  '14promax': ['space-black', 'silver', 'gold', 'deep-purple'],
  15: ['black', 'blue', 'green', 'yellow', 'pink'],
  '15plus': ['black', 'blue', 'green', 'yellow', 'pink'],
  '15pro': ['black-titanium', 'white-titanium', 'blue-titanium', 'natural-titanium'],
  '15promax': ['black-titanium', 'white-titanium', 'blue-titanium', 'natural-titanium'],
  16: ['black', 'white', 'pink', 'teal', 'ultramarine'],
  '16plus': ['black', 'white', 'pink', 'teal', 'ultramarine'],
  '16pro': ['black-titanium', 'white-titanium', 'natural-titanium', 'desert-titanium'],
  '16promax': ['black-titanium', 'white-titanium', 'natural-titanium', 'desert-titanium']
};
for (const line of iphoneLines) {
  const band = iphonePriceBands[line.key];
  for (const storage of line.storage) {
    for (const color of (iphoneColorMap[line.key] ?? [])) {
      const stepIndex = storageOrder.indexOf(storage);
      const storageSlug = storage.toLowerCase().replace('gb', '').replace('tb', 'tb');
      const id = `${line.slug}-${storageSlug}-${color}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = band.base + band.step * stepIndex + (color.includes('titanium') ? 2000 : 0);
      const product = cloneProduct(line.baseId, {
        id,
        series: line.series,
        name: `${line.nameBase} ${storage} ${color} SIMフリー`,
        aliases: [`${line.slug} ${storageSlug} ${color}`, `${line.nameBase.toLowerCase()} ${storage.toLowerCase()} ${color}`],
        searchTokens: ['simフリー', storage.toLowerCase(), 'apple', color, line.makerModel.toLowerCase()],
        specs: { generation: line.series, storage, connectivity: 'SIMフリー', color },
        market: buildMarket({ yahoo: [basePrice - 12000, basePrice + 1800], rakuma: [Math.round(basePrice * 0.77), Math.round(basePrice * 0.92)], buyback: [band.buyback + stepIndex * Math.round(band.step * 0.7) - 5000, band.buyback + stepIndex * Math.round(band.step * 0.7) + 5000] }),
        descriptionHints: ['容量・色・SIMフリーを明記', 'バッテリー最大容量を記載', '残債なし・初期化済みを補足'],
        titleKeywords: [storage, color, 'SIMフリー']
      });
      const snapshot = cloneSnapshot(line.baseId, {
        id,
        series: line.series,
        displayName: `${line.nameBase} ${storage} ${color} SIMフリー`,
        canonicalModel: `${line.canonicalPrefix}-${storage}-${color}`,
        makerModel: line.makerModel,
        storage,
        connectivity: 'SIMフリー',
        color,
        searchKeywords: [line.nameBase.toLowerCase(), line.slug, storage.toLowerCase(), color, 'simフリー', line.makerModel.toLowerCase()],
        excludeKeywords: ['空箱', '箱のみ', '部品', '画面のみ', 'ロックあり', '残債あり', 'ジャンク', ...line.excludes],
        requiredKeywords: [line.nameBase.toLowerCase(), storage.toLowerCase()],
        preferredKeywords: ['simフリー', color, line.makerModel.toLowerCase()]
      });
      addProduct(product, snapshot);
    }
  }
}

const cameraFamilies = [
  { brand: 'Sony', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'sony-a7c2', series: 'Sony α7C II', model: 'ILCE-7CM2', bodyBase: 242000, variants: { colors: ['black', 'silver'], kits: [['body', 0], ['28-60-kit', 32000]] } },
  { brand: 'Sony', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'sony-a7iv', series: 'Sony α7 IV', model: 'ILCE-7M4', bodyBase: 238000, variants: { colors: ['black'], kits: [['body', 0], ['28-70-kit', 28000]] } },
  { brand: 'Sony', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'sony-zve1', series: 'Sony ZV-E1', model: 'ZV-E1', bodyBase: 228000, variants: { colors: ['black', 'white'], kits: [['body', 0], ['28-60-kit', 26000]] } },
  { brand: 'Sony', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'sony-zve10ii', series: 'Sony ZV-E10 II', model: 'ZV-E10M2', bodyBase: 116000, variants: { colors: ['black', 'white'], kits: [['body', 0], ['16-50-kit', 18000]] } },
  { brand: 'Fujifilm', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'fujifilm-xs20', series: 'Fujifilm X-S20', model: 'X-S20', bodyBase: 182000, variants: { colors: ['black'], kits: [['body', 0], ['15-45-kit', 22000], ['18-55-kit', 36000]] } },
  { brand: 'Fujifilm', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'fujifilm-xt5', series: 'Fujifilm X-T5', model: 'X-T5', bodyBase: 236000, variants: { colors: ['black', 'silver'], kits: [['body', 0], ['16-80-kit', 52000]] } },
  { brand: 'Canon', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'canon-r6m2', series: 'Canon EOS R6 Mark II', model: 'EOS R6 Mark II', bodyBase: 262000, variants: { colors: ['black'], kits: [['body', 0], ['24-105-kit', 62000]] } },
  { brand: 'Canon', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'canon-r8', series: 'Canon EOS R8', model: 'EOS R8', bodyBase: 178000, variants: { colors: ['black'], kits: [['body', 0], ['24-50-kit', 26000]] } },
  { brand: 'Nikon', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'nikon-zf', series: 'Nikon Z f', model: 'Z f', bodyBase: 238000, variants: { colors: ['black'], kits: [['body', 0], ['40-kit', 26000]] } },
  { brand: 'Nikon', category: 'カメラ', snapshotCategory: 'camera', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', slug: 'nikon-z6iii', series: 'Nikon Z6 III', model: 'Z6III', bodyBase: 298000, variants: { colors: ['black'], kits: [['body', 0], ['24-120-kit', 78000]] } }
];
for (const line of cameraFamilies) {
  for (const color of line.variants.colors) {
    for (const [kit, premium] of line.variants.kits) {
      const id = `${line.slug}-${color}-${kit}`;
      if (existingProductMap.has(id)) continue;
      const basePrice = line.bodyBase + premium;
      const product = cloneProduct(line.baseId, { id, category: line.category, series: line.series, name: `${line.series} ${color} ${kit}`, aliases: [`${line.series.toLowerCase()} ${color} ${kit}`, `${line.model.toLowerCase()} ${kit}`], searchTokens: [line.brand.toLowerCase(), line.model.toLowerCase(), color, kit], specs: { generation: line.series, color, edition: kit }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.84), Math.round(basePrice * 0.98)], rakuma: [Math.round(basePrice * 0.79), Math.round(basePrice * 0.94)], buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)], shipping: 1500 }), descriptionHints: ['ボディ/レンズキットを明記', 'シャッター回数・センサー状態を記載', 'バッテリー・充電器有無を補足'], titleKeywords: [line.brand, color, kit] });
      const snapshot = cloneSnapshot(line.snapshotBase, { id, category: line.snapshotCategory, brand: line.brand, series: line.series, displayName: `${line.series} ${color} ${kit}`, canonicalModel: `${line.model}-${color}-${kit}`, makerModel: line.model, storage: null, connectivity: null, color, searchKeywords: [line.series.toLowerCase(), line.model.toLowerCase(), color, kit], excludeKeywords: ['箱のみ', 'レンズのみ', 'ボディキャップのみ', 'ジャンク'], requiredKeywords: [line.model.toLowerCase()], preferredKeywords: [color, kit, line.brand.toLowerCase()] });
      addProduct(product, snapshot);
    }
  }
}

const extraPcFamilies = [
  { brand: 'Apple', slug: 'macbook-pro-14-m4', series: 'MacBook Pro 14インチ M4', makerModel: 'A3401', basePrice: 258000, chips: ['M4'], rams: ['16GB', '24GB', '32GB'], storages: ['512GB', '1TB', '2TB'], colors: ['silver', 'space-black'] },
  { brand: 'Apple', slug: 'macbook-pro-16-m4', series: 'MacBook Pro 16インチ M4', makerModel: 'A3403', basePrice: 318000, chips: ['M4'], rams: ['24GB', '36GB'], storages: ['512GB', '1TB', '2TB'], colors: ['silver', 'space-black'] },
  { brand: 'Apple', slug: 'imac-24-m4', series: 'iMac 24インチ M4', makerModel: 'A3246', basePrice: 218000, chips: ['M4'], rams: ['16GB', '24GB', '32GB'], storages: ['256GB', '512GB', '1TB', '2TB'], colors: ['blue', 'green', 'pink', 'silver', 'purple'] },
  { brand: 'Microsoft', slug: 'surface-laptop7-15-business', series: 'Surface Laptop 7 15インチ Business', makerModel: '2105', basePrice: 214000, chips: ['Core Ultra 7', 'Snapdragon X Elite'], rams: ['16GB', '32GB', '64GB'], storages: ['256GB', '512GB', '1TB'], colors: ['black', 'platinum'] },
  { brand: 'Microsoft', slug: 'surface-pro11-oled', series: 'Surface Pro 11 OLED', makerModel: '2110', basePrice: 228000, chips: ['Snapdragon X Elite'], rams: ['16GB', '32GB'], storages: ['512GB', '1TB'], colors: ['black', 'platinum'] },
  { brand: 'Lenovo', slug: 'thinkpad-x1-carbon-g12', series: 'ThinkPad X1 Carbon Gen 12', makerModel: '21KC', basePrice: 198000, chips: ['Core Ultra 5', 'Core Ultra 7'], rams: ['16GB', '32GB', '64GB'], storages: ['512GB', '1TB', '2TB'], colors: ['black'] },
  { brand: 'Dell', slug: 'xps-13-9340', series: 'Dell XPS 13 9340', makerModel: '9340', basePrice: 188000, chips: ['Core Ultra 5', 'Core Ultra 7'], rams: ['16GB', '32GB', '64GB'], storages: ['512GB', '1TB', '2TB'], colors: ['graphite', 'platinum'] },
  { brand: 'HP', slug: 'spectre-x360-14-2024', series: 'HP Spectre x360 14 2024', makerModel: '14-eu', basePrice: 182000, chips: ['Core Ultra 5', 'Core Ultra 7'], rams: ['16GB', '32GB'], storages: ['512GB', '1TB', '2TB'], colors: ['nightfall-black', 'slate-blue'] },
  { brand: 'Asus', slug: 'rog-ally-x', series: 'ASUS ROG Ally X', makerModel: 'RC72LA', basePrice: 118000, chips: ['Ryzen Z1 Extreme'], rams: ['24GB'], storages: ['1TB', '2TB'], colors: ['black'] },
  { brand: 'Valve', slug: 'steam-deck-oled', series: 'Steam Deck OLED', makerModel: 'OLED', basePrice: 76000, chips: ['AMD Aerith'], rams: ['16GB'], storages: ['512GB', '1TB'], colors: ['black'] }
];
for (const line of extraPcFamilies) {
  for (const chip of line.chips) for (const ram of line.rams) for (const storage of line.storages) for (const color of line.colors) {
    const id = `${line.slug}-${slugifyAscii(chip)}-${ram.replace('GB','').toLowerCase()}-${storage.toLowerCase().replace('gb','').replace('tb','tb')}-${color}`;
    if (existingProductMap.has(id)) continue;
    const basePrice = line.basePrice + storageIndex(storage) * 22000 + ramIndex(ram) * 12000 + (chip.includes('7') || chip.includes('Elite') || chip.includes('Extreme') ? 22000 : 0);
    const product = cloneProduct('ipad-air5-64-wifi', { id, category: 'パソコン', series: line.series, name: `${line.series} ${chip} ${ram} ${storage} ${color}`, aliases: [`${line.series.toLowerCase()} ${chip.toLowerCase()} ${ram.toLowerCase()} ${storage.toLowerCase()} ${color}`], searchTokens: [line.brand.toLowerCase(), chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), color, line.makerModel.toLowerCase()], specs: { generation: line.series, chip, memory: ram, storage, color }, market: buildMarket({ yahoo: [Math.round(basePrice * 0.82), Math.round(basePrice * 0.97)], rakuma: [Math.round(basePrice * 0.78), Math.round(basePrice * 0.93)], buyback: [Math.round(basePrice * 0.58), Math.round(basePrice * 0.72)], shipping: 1500 }), descriptionHints: ['CPU・RAM・SSD・色を明記', 'バッテリーや付属品を記載', '傷や使用感を補足'], titleKeywords: [line.brand, chip, storage] });
    const snapshot = cloneSnapshot('ipad-air5-64-wifi', { id, category: 'computer', brand: line.brand, series: line.series, displayName: `${line.series} ${chip} ${ram} ${storage} ${color}`, canonicalModel: `${line.slug.toUpperCase()}-${slugifyAscii(chip).toUpperCase()}-${ram}-${storage}-${color.toUpperCase()}`, makerModel: line.makerModel, storage, connectivity: 'Wi‑Fi', color, searchKeywords: [line.series.toLowerCase(), chip.toLowerCase(), ram.toLowerCase(), storage.toLowerCase(), color], excludeKeywords: ['ジャンク', '液晶のみ', 'キーボードのみ'], requiredKeywords: [storage.toLowerCase()], preferredKeywords: [chip.toLowerCase(), color, line.makerModel.toLowerCase()] });
    addProduct(product, snapshot);
  }
}

const accessoryFamilies = [
  { brand: 'Apple', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', prefix: 'airtag', series: 'AirTag', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', basePrice: 3200, variants: [{ slug: '1pack', label: '1個入り', bump: 0 }, { slug: '4pack', label: '4個入り', bump: 7800 }] },
  { brand: 'Apple', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', prefix: 'magic-trackpad', series: 'Magic Trackpad USB-C', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', basePrice: 10800, variants: [{ slug: 'white', label: 'ホワイト', bump: 0 }, { slug: 'black', label: 'ブラック', bump: 1200 }] },
  { brand: 'Apple', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', prefix: 'magic-mouse', series: 'Magic Mouse USB-C', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', basePrice: 6800, variants: [{ slug: 'white', label: 'ホワイト', bump: 0 }, { slug: 'black', label: 'ブラック', bump: 1200 }] },
  { brand: 'Apple', category: 'タブレットアクセサリ', snapshotCategory: 'tablet-accessory', prefix: 'magic-keyboard-mac', series: 'Magic Keyboard USB-C', baseId: 'ipad-air5-64-wifi', snapshotBase: 'ipad-air5-64-wifi', basePrice: 11800, variants: [{ slug: 'jis-white', label: 'JIS ホワイト', bump: 0 }, { slug: 'jis-black', label: 'JIS ブラック', bump: 1600 }, { slug: 'us-black', label: 'US ブラック', bump: 1800 }] },
  { brand: 'Sony', category: 'ゲーム', snapshotCategory: 'game-accessory', prefix: 'ps5-cover', series: 'PS5 本体カバー', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard', basePrice: 5200, variants: [{ slug: 'slim-white', label: 'Slim ホワイト', bump: 0 }, { slug: 'slim-black', label: 'Slim ブラック', bump: 600 }, { slug: 'slim-red', label: 'Slim コズミックレッド', bump: 1000 }] },
  { brand: 'Meta', category: 'VR', snapshotCategory: 'vr', prefix: 'quest-accessory', series: 'Meta Quest アクセサリー', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white', basePrice: 4200, variants: [{ slug: 'quest3-elite-strap', label: 'Quest 3 Elite Strap', bump: 2800 }, { slug: 'quest3-charging-dock', label: 'Quest 3 Charging Dock', bump: 7800 }, { slug: 'quest3-carry-case', label: 'Quest 3 Carrying Case', bump: 1800 }, { slug: 'quest2-elite-strap', label: 'Quest 2 Elite Strap', bump: 1600 }] }
];
for (const family of accessoryFamilies) {
  for (const variant of family.variants) {
    const id = `${family.prefix}-${variant.slug}`;
    if (existingProductMap.has(id)) continue;
    const price = family.basePrice + variant.bump;
    const product = cloneProduct(family.baseId, { id, category: family.category, series: family.series, name: `${family.series} ${variant.label}`, aliases: [`${family.series.toLowerCase()} ${variant.label.toLowerCase()}`], searchTokens: [family.brand.toLowerCase(), variant.slug], specs: { generation: family.series, edition: variant.label }, market: buildMarket({ yahoo: [Math.round(price * 0.88), Math.round(price * 1.05)], rakuma: [Math.round(price * 0.82), Math.round(price * 0.98)], buyback: [Math.round(price * 0.46), Math.round(price * 0.6)], shipping: 750 }), descriptionHints: ['対応モデルを明記', '付属品有無を記載', '割れや欠品を補足'], titleKeywords: [family.brand, variant.label, '純正'] });
    const snapshot = cloneSnapshot(family.snapshotBase, { id, category: family.snapshotCategory, brand: family.brand, series: family.series, displayName: `${family.series} ${variant.label}`, canonicalModel: `${family.prefix.toUpperCase()}-${variant.slug.toUpperCase()}`, makerModel: `${family.prefix}-${variant.slug}`, storage: null, connectivity: null, color: null, searchKeywords: [family.series.toLowerCase(), variant.slug, variant.label.toLowerCase()], excludeKeywords: ['箱のみ', 'ケースのみ', 'ジャンク'], requiredKeywords: [variant.slug.split('-')[0]], preferredKeywords: [variant.slug, family.brand.toLowerCase()] });
    addProduct(product, snapshot);
  }
}

const combinedProductsForVariants = [...existingProducts, ...generated];
const combinedSnapshotsForVariants = [...existingSnapshots, ...generatedSnapshots];
const combinedProductMapForVariants = byId(combinedProductsForVariants);
const combinedSnapshotMapForVariants = byId(combinedSnapshotsForVariants);

const laptopLayouts = [
  ['jis', 'JISキーボード', 0],
  ['us', 'USキーボード', 2000]
];
for (const product of combinedProductsForVariants) {
  if (product.category !== 'パソコン') continue;
  const series = String(product.series ?? '');
  const isLaptop = /(MacBook|Surface Laptop|ThinkPad|XPS 13|Spectre|ROG Ally|Steam Deck)/.test(series);
  if (!isLaptop) continue;
  const snapshot = combinedSnapshotMapForVariants.get(product.id);
  if (!snapshot) continue;
  const baseYahoo = product.market?.yahooShopping?.max ?? 0;
  for (const [layoutSlug, layoutLabel, premium] of laptopLayouts) {
    const id = `${product.id}-${layoutSlug}`;
    if (existingProductMap.has(id) || generatedProductMap.has(id)) continue;
    const newProduct = cloneProduct(product.id, {
      id,
      name: `${product.name} ${layoutLabel}`,
      aliases: [...(product.aliases ?? []), `${product.name.toLowerCase()} ${layoutSlug}`],
      searchTokens: [...(product.searchTokens ?? []), layoutSlug, layoutLabel],
      specs: { ...(product.specs ?? {}), keyboard: layoutLabel },
      market: buildMarket({
        yahoo: [Math.max(1000, Math.round((product.market.yahooShopping.min ?? baseYahoo) + premium)), Math.round(baseYahoo + premium)],
        rakuma: [Math.max(1000, Math.round((product.market.rakuma.min ?? baseYahoo * 0.85) + premium)), Math.round((product.market.rakuma.max ?? baseYahoo * 0.95) + premium)],
        buyback: [Math.max(1000, Math.round((product.market.buyback.min ?? baseYahoo * 0.7) + premium * 0.5)), Math.round((product.market.buyback.max ?? baseYahoo * 0.78) + premium * 0.5)],
        shipping: product.market.yahooShopping.shipping ?? 1500
      }),
      descriptionHints: [...(product.descriptionHints ?? []), 'キーボード配列を明記'],
      titleKeywords: [...(product.titleKeywords ?? []), layoutLabel]
    });
    const newSnapshot = cloneSnapshot(snapshot.id, {
      id,
      displayName: `${snapshot.displayName} ${layoutLabel}`,
      canonicalModel: `${snapshot.canonicalModel}-${layoutSlug.toUpperCase()}`,
      searchKeywords: [...(snapshot.searchKeywords ?? []), layoutSlug, layoutLabel.toLowerCase()],
      preferredKeywords: [...(snapshot.preferredKeywords ?? []), layoutSlug]
    });
    addProduct(newProduct, newSnapshot);
  }
}

const pcColorOptions = {
  'MacBook Air': ['silver', 'space-gray', 'starlight', 'midnight'],
  'MacBook Pro': ['silver', 'space-black'],
  'Surface Laptop': ['platinum', 'black', 'sapphire'],
  'ThinkPad': ['black'],
  'XPS 13': ['graphite', 'platinum'],
  'Spectre': ['nightfall-black', 'slate-blue'],
  'ROG Ally': ['black'],
  'Steam Deck': ['black']
};
for (const product of combinedProductsForVariants) {
  if (product.category !== 'パソコン') continue;
  if (product.specs?.color || product.specs?.keyboard) continue;
  const series = String(product.series ?? '');
  const snapshot = combinedSnapshotMapForVariants.get(product.id) ?? generatedSnapshots.find((item) => item.id === product.id);
  if (!snapshot) continue;
  const matchedKey = Object.keys(pcColorOptions).find((key) => series.includes(key));
  if (!matchedKey) continue;
  for (const color of pcColorOptions[matchedKey]) {
    const id = `${product.id}-${color}`;
    if (existingProductMap.has(id) || generatedProductMap.has(id)) continue;
    const newProduct = cloneProduct(product.id, {
      id,
      name: `${product.name} ${color}`,
      aliases: [...(product.aliases ?? []), `${product.name.toLowerCase()} ${color}`],
      searchTokens: [...(product.searchTokens ?? []), color],
      specs: { ...(product.specs ?? {}), color },
      descriptionHints: [...(product.descriptionHints ?? []), 'カラーを明記'],
      titleKeywords: [...(product.titleKeywords ?? []), color]
    });
    const newSnapshot = cloneSnapshot(snapshot.id, {
      id,
      displayName: `${snapshot.displayName} ${color}`,
      canonicalModel: `${snapshot.canonicalModel}-${color.toUpperCase()}`,
      color,
      searchKeywords: [...(snapshot.searchKeywords ?? []), color],
      preferredKeywords: [...(snapshot.preferredKeywords ?? []), color]
    });
    addProduct(newProduct, newSnapshot);
  }
}

const broadCategoryFamilies = [
  {
    category: '生活家電', snapshotCategory: 'home-appliance', brand: 'Dyson',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'dyson-v8', series: 'Dyson V8', models: ['Fluffy', 'Origin', 'Slim Fluffy'], colors: ['silver', 'red'], bundles: [['standard', 0], ['extra-battery', 5000], ['complete', 9000]], basePrice: 16800 },
      { slug: 'dyson-v10', series: 'Dyson Cyclone V10', models: ['Fluffy', 'AbsolutePro', 'Motorhead'], colors: ['copper', 'black'], bundles: [['standard', 0], ['extra-battery', 6000], ['complete', 11000]], basePrice: 24800 },
      { slug: 'dyson-v11', series: 'Dyson V11', models: ['Fluffy', 'Absolute', 'Complete'], colors: ['nickel', 'blue'], bundles: [['standard', 0], ['extra-battery', 7000], ['complete', 13000]], basePrice: 33800 },
      { slug: 'dyson-v12', series: 'Dyson V12 Detect Slim', models: ['Fluffy', 'Absolute', 'Complete'], colors: ['gold', 'silver'], bundles: [['standard', 0], ['extra-battery', 8000], ['complete', 14000]], basePrice: 44800 },
      { slug: 'dyson-v15', series: 'Dyson V15 Detect', models: ['Fluffy', 'Absolute', 'Complete'], colors: ['yellow', 'nickel'], bundles: [['standard', 0], ['extra-battery', 9000], ['complete', 16000]], basePrice: 54800 }
    ]
  },
  {
    category: '生活家電', snapshotCategory: 'home-appliance', brand: 'Shark',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'shark-evoflex', series: 'Shark EVOFLEX', models: ['S20', 'S30', 'S50'], colors: ['gray', 'blue'], bundles: [['standard', 0], ['pet-tool', 3500], ['multi-tool', 6000]], basePrice: 17800 },
      { slug: 'shark-evopower-system', series: 'Shark EVOPOWER SYSTEM', models: ['STD', 'ADV', 'NEO'], colors: ['gray', 'white'], bundles: [['standard', 0], ['double-battery', 4500], ['pet-tool', 3000]], basePrice: 23800 }
    ]
  },
  {
    category: '生活家電', snapshotCategory: 'home-appliance', brand: 'Panasonic',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'panasonic-rice-cooker', series: 'Panasonic 炊飯器', models: ['5.5go-basic', '5.5go-ih', '5.5go-pressure', '1sho-ih'], colors: ['white', 'black'], bundles: [['main-unit', 0], ['with-inner-pot', 2500]], basePrice: 9800 },
      { slug: 'panasonic-microwave', series: 'Panasonic オーブンレンジ', models: ['20l', '23l', '26l', '30l'], colors: ['white', 'black'], bundles: [['main-unit', 0], ['with-tray', 2000]], basePrice: 14800 },
      { slug: 'panasonic-hair-dryer', series: 'Panasonic ナノケア ドライヤー', models: ['EH-NA0J', 'EH-NA0G', 'EH-NA9G', 'EH-NA2K'], colors: ['navy', 'white', 'pink'], bundles: [['main-unit', 0], ['box-set', 1800]], basePrice: 12800 }
    ]
  },
  {
    category: '美容家電', snapshotCategory: 'beauty-device', brand: 'YA-MAN',
    baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    seriesList: [
      { slug: 'yaman-photoplus', series: 'YA-MAN フォトプラス', models: ['EX', 'Prestige', 'Shiny', 'Bright'], colors: ['champagne', 'black'], bundles: [['main-unit', 0], ['gel-set', 2500]], basePrice: 18800 },
      { slug: 'yaman-medispa', series: 'YA-MAN メディリフト', models: ['Plus', 'Aqua', 'Neck', 'Eye'], colors: ['black', 'pink'], bundles: [['main-unit', 0], ['mask-set', 3000]], basePrice: 13800 }
    ]
  },
  {
    category: '美容家電', snapshotCategory: 'beauty-device', brand: 'Panasonic',
    baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    seriesList: [
      { slug: 'panasonic-beauty-face', series: 'Panasonic 美顔器', models: ['EH-SR75', 'EH-ST99', 'EH-SM50', 'RF-Face'], colors: ['gold', 'white'], bundles: [['main-unit', 0], ['gel-set', 2000]], basePrice: 11800 },
      { slug: 'panasonic-lamshdash', series: 'Panasonic ラムダッシュ', models: ['3-blade', '5-blade', '6-blade'], colors: ['silver', 'black'], bundles: [['main-unit', 0], ['with-cleaner', 2500], ['travel-set', 1800]], basePrice: 8800 }
    ]
  },
  {
    category: 'オーディオ', snapshotCategory: 'audio', brand: 'Sony',
    baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    seriesList: [
      { slug: 'sony-walkman', series: 'Sony Walkman', models: ['A306', 'ZX707', 'WM1AM2', 'NW-S315'], colors: ['black', 'blue'], bundles: [['main-unit', 0], ['case-set', 1500]], basePrice: 9800 },
      { slug: 'sony-speaker', series: 'Sony ワイヤレススピーカー', models: ['SRS-XB23', 'SRS-XG300', 'ULT-Field1', 'ULT-Field7'], colors: ['black', 'gray', 'blue'], bundles: [['main-unit', 0], ['strap-set', 1200]], basePrice: 7800 }
    ]
  },
  {
    category: 'オーディオ', snapshotCategory: 'audio', brand: 'Bose',
    baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    seriesList: [
      { slug: 'bose-speaker', series: 'Bose ポータブルスピーカー', models: ['SoundLink-Flex', 'SoundLink-Revolve-II', 'Portable-Smart', 'SoundLink-Max'], colors: ['black', 'white', 'blue'], bundles: [['main-unit', 0], ['charger-set', 1800]], basePrice: 12800 }
    ]
  },
  {
    category: 'カメラアクセサリ', snapshotCategory: 'camera-accessory', brand: 'Canon',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'canon-rf-lens', series: 'Canon RF レンズ', models: ['24-105-f4', '24-70-f2-8', '50-f1-8', '70-200-f4', '100-400'], colors: ['black'], bundles: [['lens-only', 0], ['hood-set', 2500]], basePrice: 24800 },
      { slug: 'canon-speedlite', series: 'Canon Speedlite', models: ['EL-5', '430EXIII', '470EX-AI'], colors: ['black'], bundles: [['flash-only', 0], ['case-set', 1200]], basePrice: 10800 }
    ]
  },
  {
    category: 'カメラアクセサリ', snapshotCategory: 'camera-accessory', brand: 'Sony',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'sony-fe-lens', series: 'Sony FE レンズ', models: ['24-70-gm2', '70-200-gm2', '35-f1-4-gm', '50-f1-8', '20-70-f4'], colors: ['black'], bundles: [['lens-only', 0], ['hood-set', 2500]], basePrice: 22800 },
      { slug: 'sony-vlog-accessory', series: 'Sony Vlog アクセサリー', models: ['gp-vpt2bt', 'ecm-m1', 'ecm-b10', 'xlr-h1'], colors: ['black'], bundles: [['main-unit', 0], ['case-set', 1000]], basePrice: 8800 }
    ]
  },
  {
    category: 'スマートホーム', snapshotCategory: 'smart-home', brand: 'Google',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'google-nest', series: 'Google Nest', models: ['Hub2', 'Mini2', 'Audio', 'Cam-Battery', 'Doorbell'], colors: ['chalk', 'charcoal', 'mist'], bundles: [['standard', 0], ['with-adapter', 1200]], basePrice: 4200 }
    ]
  },
  {
    category: 'スマートホーム', snapshotCategory: 'smart-home', brand: 'Amazon',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'amazon-echo', series: 'Amazon Echo', models: ['Dot5', 'Pop', 'Show5', 'Show8', 'Studio'], colors: ['black', 'white', 'blue'], bundles: [['standard', 0], ['with-stand', 1000]], basePrice: 3800 },
      { slug: 'ring-device', series: 'Ring デバイス', models: ['Battery-Doorbell', 'Indoor-Cam', 'Stick-Up-Cam', 'Alarm-Set'], colors: ['black', 'white'], bundles: [['standard', 0], ['solar-set', 1800]], basePrice: 5200 }
    ]
  },
  {
    category: 'ウェアラブル', snapshotCategory: 'wearable', brand: 'Garmin',
    baseId: 'apple-watch-s9-45-gps', snapshotBase: 'apple-watch-s9-45-gps',
    seriesList: [
      { slug: 'garmin-fenix', series: 'Garmin fenix', models: ['7S', '7', '7X', '8-47mm'], colors: ['black', 'silver'], bundles: [['watch-only', 0], ['band-set', 1800]], basePrice: 26800 },
      { slug: 'garmin-forerunner', series: 'Garmin Forerunner', models: ['255', '265', '955', '965'], colors: ['black', 'white', 'aqua'], bundles: [['watch-only', 0], ['band-set', 1500]], basePrice: 19800 }
    ]
  },
  {
    category: 'ウェアラブル', snapshotCategory: 'wearable', brand: 'Fitbit',
    baseId: 'apple-watch-se2-40-gps', snapshotBase: 'apple-watch-se2-40-gps',
    seriesList: [
      { slug: 'fitbit-device', series: 'Fitbit', models: ['Charge6', 'Sense2', 'Versa4', 'Inspire3'], colors: ['black', 'white', 'pink'], bundles: [['watch-only', 0], ['band-set', 1200]], basePrice: 7800 }
    ]
  },
  {
    category: '小型家電', snapshotCategory: 'small-electronics', brand: 'Anker',
    baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    seriesList: [
      { slug: 'anker-powerbank', series: 'Anker モバイルバッテリー', models: ['Nano-5000', 'Nano-10000', 'Prime-12000', '737-24000'], colors: ['black', 'white', 'blue'], bundles: [['main-unit', 0], ['cable-set', 800]], basePrice: 2800 },
      { slug: 'anker-charger', series: 'Anker 充電器', models: ['Nano-30w', 'Nano-65w', 'Prime-100w', 'Prime-200w'], colors: ['black', 'white'], bundles: [['main-unit', 0], ['cable-set', 1000]], basePrice: 2200 }
    ]
  },
  {
    category: '小型家電', snapshotCategory: 'small-electronics', brand: 'DJI',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'dji-gimbal', series: 'DJI ジンバル', models: ['Osmo-Mobile-6', 'Osmo-Mobile-SE', 'RS3-Mini', 'Pocket3'], colors: ['gray', 'black'], bundles: [['main-unit', 0], ['tripod-set', 1400], ['creator-combo', 6200]], basePrice: 9800 },
      { slug: 'dji-mic', series: 'DJI Mic', models: ['Mic', 'Mic2', 'Mic-Mini'], colors: ['black', 'white'], bundles: [['standard', 0], ['combo', 4800]], basePrice: 12800 }
    ]
  },
  {
    category: 'ゲーム', snapshotCategory: 'game-handheld', brand: 'Nintendo',
    baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    seriesList: [
      { slug: 'nintendo-retro', series: 'Nintendo レトロ本体', models: ['new3dsll', '2dsll', 'switch-lite-hyrule', 'switch-lite-zacian'], colors: ['black', 'white', 'blue'], bundles: [['standard', 0], ['box-set', 2200]], basePrice: 11800 }
    ]
  }
];

for (const familyGroup of broadCategoryFamilies) {
  for (const line of familyGroup.seriesList) {
    for (const model of line.models) {
      for (const color of line.colors) {
        for (const [bundleSlug, premium] of line.bundles) {
          const id = `${line.slug}-${slugifyAscii(model)}-${slugifyAscii(color)}-${bundleSlug}`;
          if (existingProductMap.has(id)) continue;
          const priceBase = line.basePrice + premium + (String(model).includes('Pro') || String(model).includes('Ultra') || String(model).includes('Max') ? 4000 : 0);
          const brandLc = familyGroup.brand.toLowerCase();
          const modelLc = String(model).toLowerCase();
          const product = cloneProduct(familyGroup.baseId, {
            id,
            category: familyGroup.category,
            series: line.series,
            name: `${line.series} ${model} ${color} ${bundleSlug}`,
            aliases: [`${line.series.toLowerCase()} ${modelLc} ${color} ${bundleSlug}`, `${brandLc} ${modelLc}`],
            searchTokens: [brandLc, modelLc, color, bundleSlug],
            specs: { generation: line.series, model, color, edition: bundleSlug },
            market: buildMarket({
              yahoo: [Math.round(priceBase * 0.84), Math.round(priceBase * 1.01)],
              rakuma: [Math.round(priceBase * 0.79), Math.round(priceBase * 0.95)],
              buyback: [Math.round(priceBase * 0.48), Math.round(priceBase * 0.66)],
              shipping: familyGroup.category === '生活家電' ? 1600 : 750
            }),
            descriptionHints: ['型番・色・構成を明記', '付属品の有無を記載', '傷や動作確認結果を補足'],
            titleKeywords: [familyGroup.brand, model, color]
          });
          const snapshot = cloneSnapshot(familyGroup.snapshotBase, {
            id,
            category: familyGroup.snapshotCategory,
            brand: familyGroup.brand,
            series: line.series,
            displayName: `${line.series} ${model} ${color} ${bundleSlug}`,
            canonicalModel: `${line.slug.toUpperCase()}-${slugifyAscii(model).toUpperCase()}-${slugifyAscii(color).toUpperCase()}-${bundleSlug.toUpperCase()}`,
            makerModel: model,
            storage: null,
            connectivity: null,
            color,
            searchKeywords: [line.series.toLowerCase(), modelLc, color, bundleSlug, brandLc],
            excludeKeywords: ['箱のみ', '付属品のみ', 'ケースのみ', 'ジャンク'],
            requiredKeywords: [modelLc],
            preferredKeywords: [color, bundleSlug, brandLc]
          });
          addProduct(product, snapshot);
        }
      }
    }
  }
}

const megaCatalogFamilies = [
  {
    category: '生活家電', snapshotCategory: 'home-appliance', brand: 'Panasonic', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    slug: 'home-appliance-panasonic', series: 'Panasonic 生活家電',
    models: ['washer-8kg', 'washer-10kg', 'fridge-300l', 'fridge-450l', 'airpurifier-basic', 'airpurifier-premium', 'dehumidifier', 'dishwasher', 'breadmaker', 'coffee-maker'],
    colors: ['white', 'black', 'beige'], grades: ['standard', 'premium'], bundles: ['main-unit', 'full-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 9800
  },
  {
    category: '美容家電', snapshotCategory: 'beauty-device', brand: 'ReFa', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    slug: 'beauty-refa', series: 'ReFa 美容家電',
    models: ['beautech-dryer', 'beautech-iron', 'fine-bubble', 'head-spa', 'facial-roller', 'epi-cool'],
    colors: ['white', 'black', 'pink'], grades: ['standard', 'pro'], bundles: ['main-unit', 'box-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 8800
  },
  {
    category: 'オーディオ', snapshotCategory: 'audio', brand: 'JBL', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    slug: 'audio-jbl', series: 'JBL オーディオ',
    models: ['flip6', 'charge5', 'xtreme3', 'partybox-110', 'tour-pro2', 'live-beam3', 'soundbar-1000'],
    colors: ['black', 'blue', 'white'], grades: ['standard', 'premium'], bundles: ['main-unit', 'case-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 6800
  },
  {
    category: 'カメラアクセサリ', snapshotCategory: 'camera-accessory', brand: 'Sigma', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    slug: 'camera-accessory-sigma', series: 'Sigma レンズ',
    models: ['16-f1-4', '18-50-f2-8', '24-70-f2-8', '56-f1-4', '85-f1-4', '100-400'],
    colors: ['black'], grades: ['contemporary', 'art', 'sports'], bundles: ['lens-only', 'hood-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 14800
  },
  {
    category: 'スマートホーム', snapshotCategory: 'smart-home', brand: 'SwitchBot', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    slug: 'smarthome-switchbot', series: 'SwitchBot',
    models: ['hub2', 'curtain3', 'lock-pro', 'camera-pan-tilt', 'plug-mini', 'robot-vacuum'],
    colors: ['white', 'black'], grades: ['standard', 'combo'], bundles: ['main-unit', 'with-hub'], years: ['2021', '2022', '2023', '2024'], basePrice: 3200
  },
  {
    category: 'ウェアラブル', snapshotCategory: 'wearable', brand: 'Huawei', baseId: 'apple-watch-se2-40-gps', snapshotBase: 'apple-watch-se2-40-gps',
    slug: 'wearable-huawei', series: 'Huawei Wearable',
    models: ['watch-gt4-41', 'watch-gt4-46', 'watch-fit3', 'band9', 'watch-d2'],
    colors: ['black', 'white', 'green'], grades: ['standard', 'classic'], bundles: ['watch-only', 'band-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 7200
  },
  {
    category: '小型家電', snapshotCategory: 'small-electronics', brand: 'TP-Link', baseId: 'switch-oled-white', snapshotBase: 'switch-oled-white',
    slug: 'small-tplink', series: 'TP-Link ネットワーク機器',
    models: ['deco-x50', 'deco-xe75', 'archer-ax80', 'tapo-c210', 'tapo-rv20', 'uh720'],
    colors: ['white', 'black'], grades: ['standard', 'pro'], bundles: ['main-unit', '2pack'], years: ['2021', '2022', '2023', '2024'], basePrice: 2800
  },
  {
    category: 'ゲーム', snapshotCategory: 'game-accessory', brand: 'Razer', baseId: 'ps5-slim-standard', snapshotBase: 'ps5-slim-standard',
    slug: 'gaming-razer', series: 'Razer ゲーミング機器',
    models: ['kitsune', 'kishi-v2', 'blackshark-v2', 'wolverine-v2', 'stream-controller', 'seiren-v3'],
    colors: ['black', 'white'], grades: ['standard', 'pro'], bundles: ['main-unit', 'bundle'], years: ['2021', '2022', '2023', '2024'], basePrice: 6200
  },
  {
    category: 'ヘルスケア', snapshotCategory: 'healthcare-device', brand: 'Omron', baseId: 'airpodspro2-usbc', snapshotBase: 'airpodspro2-usbc',
    slug: 'health-omron', series: 'Omron ヘルスケア',
    models: ['bp-monitor-arm', 'bp-monitor-wrist', 'body-composition', 'low-frequency', 'nebulizer', 'sleep-tracker'],
    colors: ['white', 'black'], grades: ['standard', 'premium'], bundles: ['main-unit', 'case-set'], years: ['2021', '2022', '2023', '2024'], basePrice: 2400
  }
];

for (const family of megaCatalogFamilies) {
  for (const model of family.models) {
    for (const color of family.colors) {
      for (const grade of family.grades) {
        for (const bundle of family.bundles) {
          for (const year of family.years) {
            const id = `${family.slug}-${model}-${color}-${grade}-${bundle}-${year}`;
            if (existingProductMap.has(id)) continue;
            const priceBase = family.basePrice + (family.models.indexOf(model) * 2200) + (family.colors.indexOf(color) * 500) + (family.grades.indexOf(grade) * 1800) + (family.bundles.indexOf(bundle) * 1500) + ((Number(year) - 2021) * 700);
            const product = cloneProduct(family.baseId, {
              id,
              category: family.category,
              series: family.series,
              name: `${family.brand} ${model} ${color} ${grade} ${bundle} ${year}`,
              aliases: [`${family.brand.toLowerCase()} ${model} ${color} ${grade}`, `${family.series.toLowerCase()} ${model}`],
              searchTokens: [family.brand.toLowerCase(), model, color, grade, bundle, year],
              specs: { generation: year, model, color, edition: `${grade} ${bundle}` },
              market: buildMarket({
                yahoo: [Math.round(priceBase * 0.85), Math.round(priceBase * 1.02)],
                rakuma: [Math.round(priceBase * 0.8), Math.round(priceBase * 0.96)],
                buyback: [Math.round(priceBase * 0.46), Math.round(priceBase * 0.64)],
                shipping: family.category === '生活家電' ? 1800 : 750
              }),
              descriptionHints: ['型番・色・年式・構成を明記', '付属品の有無を記載', '状態と動作確認を補足'],
              titleKeywords: [family.brand, model, year]
            });
            const snapshot = cloneSnapshot(family.snapshotBase, {
              id,
              category: family.snapshotCategory,
              brand: family.brand,
              series: family.series,
              displayName: `${family.brand} ${model} ${color} ${grade} ${bundle} ${year}`,
              canonicalModel: `${family.slug.toUpperCase()}-${model.toUpperCase()}-${color.toUpperCase()}-${grade.toUpperCase()}-${bundle.toUpperCase()}-${year}`,
              makerModel: model,
              storage: null,
              connectivity: null,
              color,
              searchKeywords: [family.brand.toLowerCase(), family.series.toLowerCase(), model, color, grade, bundle, year],
              excludeKeywords: ['箱のみ', '付属品のみ', 'ケースのみ', 'ジャンク'],
              requiredKeywords: [model],
              preferredKeywords: [color, grade, year]
            });
            addProduct(product, snapshot);
          }
        }
      }
    }
  }
}

const productMap = byId(existingProducts);
for (const item of generated) productMap.set(item.id, item);
const snapshotMap = byId(existingSnapshots);
for (const item of generatedSnapshots) snapshotMap.set(item.id, item);

const finalProducts = [...productMap.values()].sort((a, b) => a.category.localeCompare(b.category, 'ja') || a.series.localeCompare(b.series, 'ja') || a.name.localeCompare(b.name, 'ja'));
const finalSnapshots = [...snapshotMap.values()].sort((a, b) => a.category.localeCompare(b.category, 'ja') || a.series.localeCompare(b.series, 'ja') || a.displayName.localeCompare(b.displayName, 'ja'));

await fs.writeFile(productsPath, `${JSON.stringify(finalProducts, null, 2)}\n`);
await fs.writeFile(snapshotPath, `${JSON.stringify(finalSnapshots, null, 2)}\n`);

console.log(JSON.stringify({
  rawExistingProducts: rawExistingProducts.length,
  existingProducts: existingProducts.length,
  addedProducts: generated.length,
  totalProducts: finalProducts.length,
  rawExistingSnapshots: rawExistingSnapshots.length,
  existingSnapshots: existingSnapshots.length,
  addedSnapshots: generatedSnapshots.length,
  totalSnapshots: finalSnapshots.length
}, null, 2));
