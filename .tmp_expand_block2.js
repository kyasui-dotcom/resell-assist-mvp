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
    const id = `${base.id}-${color}`;
    if (existingProductMap.has(id)) continue;
    const product = cloneProduct(base.baseId, { id, category: base.category, series: base.series, name: `${base.series} ${color}`, aliases: [`${base.series.toLowerCase()} ${color}`, ...base.keywords], searchTokens: [base.brand.toLowerCase(), base.model.toLowerCase(), color, ...base.keywords], specs: { generation: base.series, connectivity: 'Bluetooth', edition: base.brand, color }, market: buildMarket({ yahoo: [Math.round(base.marketBase * 0.86), Math.round(base.marketBase * 1.02)], rakuma: [Math.round(base.marketBase * 0.8), Math.round(base.marketBase * 0.96)], buyback: [Math.round(base.marketBase * 0.5), Math.round(base.marketBase * 0.66)], shipping: 650 }), descriptionHints: ['カラーと型番を明記', 'イヤーパッド・ケース有無を記載', 'バッテリー持ちを補足'], titleKeywords: [base.brand, color, '動作確認済み'] });
    const snapshot = cloneSnapshot(base.snapshotBase, { id, category: base.snapshotCategory, brand: base.brand, series: base.series, displayName: `${base.series} ${color}`, canonicalModel: `${base.model}-${color}`, makerModel: base.model, storage: null, connectivity: 'Bluetooth', color, searchKeywords: [base.series.toLowerCase(), color, base.model.toLowerCase(), ...base.keywords], excludeKeywords: ['箱のみ', 'ケースのみ', 'ジャンク'], requiredKeywords: base.keywords.slice(0,1), preferredKeywords: [base.model.toLowerCase(), color] });
    addProduct(product, snapshot);
  }
}
