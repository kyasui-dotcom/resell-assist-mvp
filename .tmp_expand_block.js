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
