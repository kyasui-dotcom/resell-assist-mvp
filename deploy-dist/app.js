import {
  computeMarkets,
  effortLabels,
  marketLabels,
  marketSourceLabels,
  priceSuggestions,
  rankRecommendations,
  speedLabels
} from './lib/core.js';
import { buildTrendSummary } from './lib/core/price-trend.js';

const searchForm = document.getElementById('searchForm');
const searchCard = document.querySelector('.searchCard');
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchCatalogMeta = document.getElementById('searchCatalogMeta');
const emptyState = document.getElementById('emptyState');
const resultSection = document.getElementById('resultSection');
const searchStatus = document.getElementById('searchStatus');
const searchFeedback = document.getElementById('searchFeedback');
const searchLiveSuggestions = document.getElementById('searchLiveSuggestions');
const productName = document.getElementById('productName');
const productBreadcrumbs = document.getElementById('productBreadcrumbs');
const productCategory = document.getElementById('productCategory');
const priceRange = document.getElementById('priceRange');
const marketGrid = document.getElementById('marketGrid');
const recommendations = document.getElementById('recommendations');
const priceCards = document.getElementById('priceCards');
const confidenceBanner = document.getElementById('confidenceBanner');
const confidenceBadge = document.getElementById('confidenceBadge');
const confidenceText = document.getElementById('confidenceText');
const heroStandardPrice = document.getElementById('heroStandardPrice');
const heroStandardNote = document.getElementById('heroStandardNote');
const heroQuickPrice = document.getElementById('heroQuickPrice');
const heroQuickNote = document.getElementById('heroQuickNote');
const heroUpsidePrice = document.getElementById('heroUpsidePrice');
const heroUpsideNote = document.getElementById('heroUpsideNote');
const heroBestMarket = document.getElementById('heroBestMarket');
const heroBestMarketNote = document.getElementById('heroBestMarketNote');
const sellingFitCard = document.getElementById('sellingFitCard');
const sellingFitBadge = document.getElementById('sellingFitBadge');
const sellingFitText = document.getElementById('sellingFitText');
const decisionNextStep = document.getElementById('decisionNextStep');
const decisionNextStepText = document.getElementById('decisionNextStepText');
const decisionNextStepLink = document.getElementById('decisionNextStepLink');
const decisionNextStepSectionLink = document.getElementById('decisionNextStepSectionLink');
const decisionMemo = document.getElementById('decisionMemo');
const decisionMemoList = document.getElementById('decisionMemoList');
const titleOutput = document.getElementById('titleOutput');
const titleOutputMeta = document.getElementById('titleOutputMeta');
const descriptionOutput = document.getElementById('descriptionOutput');
const descriptionOutputMeta = document.getElementById('descriptionOutputMeta');
const listingNoteOutput = document.getElementById('listingNoteOutput');
const listingNoteOutputMeta = document.getElementById('listingNoteOutputMeta');
const listingReadinessSummary = document.getElementById('listingReadinessSummary');
const listingReadinessTitle = document.getElementById('listingReadinessTitle');
const listingReadinessDescription = document.getElementById('listingReadinessDescription');
const listingReadinessMemo = document.getElementById('listingReadinessMemo');
const listingReadinessDraftState = document.getElementById('listingReadinessDraftState');
const listingReadinessSavedState = document.getElementById('listingReadinessSavedState');
const checklist = document.getElementById('checklist');
const productSpecs = document.getElementById('productSpecs');
const snapshotSummary = document.getElementById('snapshotSummary');
const snapshotDate = document.getElementById('snapshotDate');
const snapshotTags = document.getElementById('snapshotTags');
const snapshotNotes = document.getElementById('snapshotNotes');
const trendSummary = document.getElementById('trendSummary');
const trendBadge = document.getElementById('trendBadge');
const trendMeta = document.getElementById('trendMeta');
const trendNotes = document.getElementById('trendNotes');
const categorySections = document.getElementById('categorySections');
const categorySummary = document.getElementById('categorySummary');
const seoHubSections = document.getElementById('seoHubSections');
const seoHubSummary = document.getElementById('seoHubSummary');
const trendHub = document.getElementById('trendHub');
const trendHubSummary = document.getElementById('trendHubSummary');
const trendUpdateNote = document.getElementById('trendUpdateNote');
const referenceLinks = document.getElementById('referenceLinks');
const relatedGuideLinks = document.getElementById('relatedGuideLinks');
const relatedProductLinks = document.getElementById('relatedProductLinks');
const recentSearchBlock = document.getElementById('recentSearchBlock');
const recentSearchLinks = document.getElementById('recentSearchLinks');
const recentSearchLabel = recentSearchBlock?.querySelector('.popularSearchLabel');
const clearRecentSearchesBtn = document.getElementById('clearRecentSearchesBtn');
const querySuggestions = document.getElementById('querySuggestions');
const copyResultLinkBtn = document.getElementById('copyResultLinkBtn');
const copyListingBundleBtn = document.getElementById('copyListingBundleBtn');
const resetListingDraftsBtn = document.getElementById('resetListingDraftsBtn');
const focusSearchBtn = document.getElementById('focusSearchBtn');
const liveStatus = document.getElementById('liveStatus');
const resultJumpLinks = Array.from(document.querySelectorAll('.resultJumpLink'));
const listingCopyButtons = Array.from(document.querySelectorAll('[data-copy-target]'));

const RECENT_PRODUCTS_STORAGE_KEY = 'resellAssistRecentProducts';
const LISTING_DRAFT_STORAGE_KEY = 'resellAssistListingDrafts';
const RECENT_PRODUCTS_LIMIT = 6;
const DEFAULT_META = {
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? window.location.href,
  ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? document.title,
  ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
  ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? window.location.href,
  twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ?? document.title,
  twitterDescription: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ?? ''
};
const DYNAMIC_STRUCTURED_DATA_ID = 'dynamic-product-structured-data';

let products = [];
let productsLoaded = false;
let snapshotMap = new Map();
let snapshotHistoryMap = new Map();
let snapshotGeneratedAt = null;
let categorySummaryData = [];
let isSearchLoading = false;
let isQueryComposing = false;
let currentProductId = null;
let isInternalProductNavigationPending = false;
let currentGeneratedListingDrafts = {
  title: '',
  description: '',
  listingNote: ''
};
let currentSavedListingDraftUpdatedAt = null;
let currentSavedListingDraftRestored = false;

searchBtn.disabled = true;
searchBtn.textContent = '読み込み中…';

function normalizeSearchQuery(value = '') {
  return value
    .normalize('NFKC')
    .replace(/[‐‑‒–—―ーｰ−]+/g, '-')
    .replace(/[／/・,，]+/g, ' ')
    .replace(/[+＋]+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

function normalizeSearchMatchText(value = '') {
  return normalizeSearchQuery(value)
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

function syncNormalizedQueryValue() {
  if (!queryInput) return '';

  const normalized = normalizeSearchQuery(queryInput.value);
  if (queryInput.value !== normalized) {
    queryInput.value = normalized;
  }
  return normalized;
}

function updateClearButtonVisibility() {
  clearSearchBtn?.classList.toggle('hidden', !normalizeSearchQuery(queryInput?.value ?? ''));
}

function getSearchDiscoverySelectors() {
  return [
    '#recentSearchLinks a',
    '.popularSearchLinks a',
    '.browseCategories a'
  ];
}

function getSearchDiscoveryTargets() {
  return getSearchDiscoverySelectors()
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .filter((element) => element instanceof HTMLElement && !element.closest('.hidden'));
}

function getFirstSearchDiscoveryTarget() {
  return getSearchDiscoveryTargets()[0] ?? null;
}

function isSearchDiscoveryTarget(element) {
  if (!(element instanceof HTMLElement)) return false;
  return getSearchDiscoverySelectors().some((selector) => element.matches(selector));
}

function focusAdjacentSearchDiscoveryTarget(currentTarget, direction = 1) {
  if (!(currentTarget instanceof HTMLElement)) return false;

  const targets = getSearchDiscoveryTargets();
  const currentIndex = targets.indexOf(currentTarget);
  if (currentIndex === -1) return false;

  const nextTarget = targets[currentIndex + direction];
  if (!(nextTarget instanceof HTMLElement)) return false;

  nextTarget.focus();
  announceStatus(direction > 0 ? '次の候補へ移動しました' : '前の候補へ移動しました');
  return true;
}

function announceStatus(message) {
  if (!liveStatus || !message) return;

  liveStatus.textContent = '';
  requestAnimationFrame(() => {
    liveStatus.textContent = message;
  });
}

function getResultJumpCountUnit(baseLabel) {
  if (baseLabel === '関連ガイド') return '本';
  if (baseLabel === '出品文') return '点';
  if (baseLabel === 'おすすめ販路') return '件';
  return '件';
}

function formatResultJumpCount(baseLabel, count) {
  if (!Number.isFinite(count) || count <= 0 || baseLabel === '概要') return baseLabel;

  return `${baseLabel} ${count}${getResultJumpCountUnit(baseLabel)}`;
}

function getExternalSourceLabel(href = '') {
  if (!href) return '';

  try {
    const url = new URL(href, window.location.origin);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function syncOptionalResultSections(counts = {}) {
  const optionalSectionIds = [
    'related-guides',
    'related-products',
    'reference-links'
  ];

  optionalSectionIds.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (!(section instanceof HTMLElement)) return;

    const count = counts[sectionId];
    section.hidden = Number.isFinite(count) ? count <= 0 : false;
  });
}

function updateResultJumpCounts(counts = {}) {
  syncOptionalResultSections(counts);

  if (!resultJumpLinks.length) return;

  resultJumpLinks.forEach((link) => {
    const targetId = link.getAttribute('href')?.replace(/^#/, '');
    const baseLabel = link.dataset.baseLabel ?? link.textContent?.trim() ?? '';
    const count = counts[targetId];
    const isOverview = baseLabel === '概要';
    const section = targetId ? document.getElementById(targetId) : null;
    const isSectionHidden = section instanceof HTMLElement ? section.hidden : false;
    const hasContent = isOverview || (!isSectionHidden && (!Number.isFinite(count) || count > 0));
    const label = formatResultJumpCount(baseLabel, count);

    link.hidden = !hasContent;
    link.textContent = label;

    if (!hasContent) {
      link.removeAttribute('aria-current');
      link.classList.remove('is-active');
      link.setAttribute('tabindex', '-1');
      link.setAttribute('aria-hidden', 'true');
      link.setAttribute('aria-label', `${baseLabel} は現在準備中`);
      return;
    }

    link.removeAttribute('tabindex');
    link.removeAttribute('aria-hidden');
    const shouldAnnounceCount = Number.isFinite(count) && count > 0 && !isOverview;
    const countUnit = getResultJumpCountUnit(baseLabel);
    link.setAttribute('aria-label', shouldAnnounceCount
      ? `${baseLabel} セクションへ移動（${count}${countUnit}）`
      : `${baseLabel} セクションへ移動`);
  });
}

function getCurrentResultJumpCounts() {
  return {
    'result-overview': resultSection?.classList.contains('hidden') ? 0 : 1,
    'market-comparison': marketGrid?.children.length ?? 0,
    'recommended-markets': recommendations?.children.length ?? 0,
    'related-guides': relatedGuideLinks?.querySelectorAll('.guideCard').length ?? 0,
    'related-products': relatedProductLinks?.querySelectorAll('.relatedProductCard').length ?? 0,
    'reference-links': referenceLinks?.querySelectorAll('.referenceCard').length ?? 0,
    'recommended-prices': priceCards?.children.length ?? 0,
    'listing-copy': [titleOutput?.value, descriptionOutput?.value, listingNoteOutput?.value]
      .filter((value) => value?.trim())
      .length,
    'selling-checklist': checklist?.querySelectorAll('.actionChecklistItem').length ?? 0
  };
}

function refreshResultJumpCounts() {
  updateResultJumpCounts(getCurrentResultJumpCounts());
}

function setSearchFeedback(message = '', { emphasis = '' } = {}) {
  if (!searchFeedback) return;

  if (!message) {
    searchFeedback.textContent = '';
    searchFeedback.classList.add('hidden');
    return;
  }

  searchFeedback.innerHTML = emphasis
    ? `<strong>${escapeHtml(emphasis)}</strong> ${escapeHtml(message)}`
    : escapeHtml(message);
  searchFeedback.classList.remove('hidden');
}

function queryNeedsMoreDetail(query = '') {
  return !/(?:\b(?:64|128|256|512)\s?gb\b|\b1\s?tb\b|第\s?\d+世代|\b\d+世代\b|\b(?:pro|max|mini|plus|lite|ultra|slim|wifi|cellular|gps)\b|\b\d{2}mm\b|ブラック|ホワイト|レッド|ブルー|グリーン|パープル|イエロー|ピンク|ネオン|グレー|スターライト|ミッドナイト|スペースグレイ|シルバー)/iu.test(query);
}

function renderSearchLiveSuggestions(query, suggestions = [], totalCount = 0) {
  if (!searchLiveSuggestions) return;

  if (!query || isSearchLoading || !suggestions.length) {
    searchLiveSuggestions.innerHTML = '';
    searchLiveSuggestions.classList.add('hidden');
    return;
  }

  const countLabel = Number.isFinite(totalCount) && totalCount > suggestions.length
    ? `ほか${Math.max(totalCount - suggestions.length, 0)}件`
    : '';

  searchLiveSuggestions.innerHTML = `
    <div class="searchLiveSuggestionsHead">
      <strong>近い商品候補</strong>
      <span>${totalCount ? `${totalCount}件中` : ''} タップでそのまま開けます</span>
    </div>
    <div class="searchLiveSuggestionsChips">
      ${suggestions.map((product) => {
        const metaText = [product?.category, product?.series].filter(Boolean).join(' / ');
        const ariaLabel = metaText
          ? `${product.name} を直接開く（${metaText}）`
          : `${product.name} を直接開く`;
        return `
          <button class="chip chipSubtle searchSuggestionChip" type="button" data-product-id="${escapeHtml(product.id ?? '')}" title="${escapeHtml(ariaLabel)}" aria-label="${escapeHtml(ariaLabel)}">${escapeHtml(product.name ?? '')}</button>
        `;
      }).join('')}
      ${countLabel ? `<span class="searchSuggestionMore">${countLabel}</span>` : ''}
    </div>
  `;
  searchLiveSuggestions.classList.remove('hidden');
  bindDirectProductButtons(searchLiveSuggestions);
  bindLinearKeyboardNavigation(searchLiveSuggestions, '[data-product-id]', { axis: 'horizontal' });
}

function updateSearchDraftHint() {
  if (!searchFeedback || isSearchLoading) return;

  const query = normalizeSearchQuery(queryInput?.value ?? '');
  if (!query) {
    renderSearchLiveSuggestions('', [], 0);
    if (!currentProductId) {
      setSearchFeedback('商品名・型番・容量を入れると比較しやすくなります。', { emphasis: '検索準備OK' });
    }
    return;
  }

  const suggestions = buildLocalProductSuggestions(query, 3);
  const suggestionNames = suggestions.map((product) => product.name);
  const suggestionCount = countLocalProductMatches(query);
  const suggestionCountLabel = suggestionCount ? `近い候補 ${suggestionCount}件。` : '';

  renderSearchLiveSuggestions(query, suggestions, suggestionCount);

  if (queryNeedsMoreDetail(query) && suggestionNames.length) {
    setSearchFeedback(`${suggestionCountLabel}候補例: ${suggestionNames.join(' / ')}。容量や世代まで入れると一発で開きやすくなります。`, { emphasis: '入力ヒント' });
    return;
  }

  if (queryNeedsMoreDetail(query)) {
    setSearchFeedback(`${suggestionCountLabel}容量・世代・カラーまで足すと、候補の絞り込みがかなり安定します。`, { emphasis: '入力ヒント' });
    return;
  }

  if (!currentProductId && suggestionNames.length && !suggestionNames.includes(query)) {
    setSearchFeedback(`${suggestionCountLabel}候補例: ${suggestionNames.join(' / ')}。そのまま検索すると候補一覧を出せます。`, { emphasis: '入力ヒント' });
    return;
  }

  if (!currentProductId) {
    setSearchFeedback(`${suggestionCountLabel}そのまま検索すれば、相場・販路・関連記事までまとめて見られます。`, { emphasis: '入力ヒント' });
  }
}

function updateSearchCatalogMeta() {
  if (!searchCatalogMeta) return;

  if (!productsLoaded || !categorySummaryData.length) {
    searchCatalogMeta.textContent = '検索できる商品データを読み込み中です…';
    return;
  }

  const totalProducts = categorySummaryData.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
  const sourceLabel = window.__categorySummarySource === 'static-fallback'
    ? '静的データ'
    : 'APIデータ';

  searchCatalogMeta.textContent = `${categorySummaryData.length.toLocaleString('ja-JP')}カテゴリ / ${totalProducts.toLocaleString('ja-JP')}SKU を${sourceLabel}から検索できます。入力補完には人気モデルや最近見た商品も出ます。`;
}

function updateSearchControls() {
  const hasQuery = Boolean(normalizeSearchQuery(queryInput?.value ?? ''));
  searchBtn.disabled = isSearchLoading || !productsLoaded || !hasQuery;
  searchBtn.textContent = isSearchLoading
    ? '相場を確認中…'
    : (!productsLoaded ? '読み込み中…' : (hasQuery ? '相場をみる' : '商品名を入力'));
  if (clearSearchBtn) clearSearchBtn.disabled = isSearchLoading;
  searchStatus.classList.toggle('hidden', !isSearchLoading);
  updateClearButtonVisibility();
  updateSearchCatalogMeta();
}

function setSearchLoading(isLoading) {
  isSearchLoading = isLoading;

  if (isLoading) {
    renderSearchLiveSuggestions('', [], 0);
  }

  if (searchForm) {
    searchForm.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  searchCard?.classList.toggle('is-loading', isLoading);
  queryInput?.classList.toggle('is-loading', isLoading);
  resultSection?.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  updateSearchControls();
}

function bindAsyncButtonAction(button, action, { disableWhilePending = true } = {}) {
  if (!button || typeof action !== 'function') return;

  button.addEventListener('click', async () => {
    if (button.dataset.pending === 'true') return;

    button.dataset.pending = 'true';
    button.classList.add('is-pending');
    button.setAttribute('aria-busy', 'true');
    const previousDisabled = button.disabled;
    if (disableWhilePending) button.disabled = true;

    try {
      await action(button);
    } finally {
      button.dataset.pending = 'false';
      button.classList.remove('is-pending');
      button.removeAttribute('aria-busy');
      if (disableWhilePending) button.disabled = previousDisabled;
    }
  });
}

async function copyText(text) {
  if (!text) throw new Error('missing-copy-text');

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for browsers/webviews with restricted clipboard access.
    }
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.setAttribute('aria-hidden', 'true');
  helper.style.position = 'fixed';
  helper.style.top = '-9999px';
  helper.style.left = '-9999px';
  document.body.appendChild(helper);
  helper.focus();
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('execCommand-copy-failed');
    return true;
  } finally {
    helper.remove();
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function fetchProductById(productId) {
  const payload = await fetchJson(`./api/products/${encodeURIComponent(productId)}`);
  return payload.product;
}

function updateSearchState({ productId = null, query = null, historyMode = 'replace' } = {}) {
  const url = new URL(window.location.href);

  if (productId) {
    url.searchParams.set('product', productId);
  } else {
    url.searchParams.delete('product');
  }

  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.delete('q');
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) return;

  if (historyMode === 'push') {
    window.history.pushState({}, '', url);
    return;
  }

  window.history.replaceState({}, '', url);
}

function updateProductUrl(productId, options = {}) {
  updateSearchState({ productId, query: normalizeSearchQuery(queryInput?.value ?? '') || null, ...options });
}

function buildProductHref(product) {
  if (!product?.id) return './';

  const url = new URL('./', window.location.href);
  url.searchParams.set('product', product.id);
  url.searchParams.set('q', product.name ?? product.id);
  return `${url.pathname}${url.search}`;
}

function buildAbsoluteProductUrl(product) {
  if (!product?.id) return new URL('./', window.location.href).href;
  return new URL(buildProductHref(product), window.location.href).href;
}

function getInternalProductUrlFromLink(link) {
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname !== window.location.pathname) return null;

  const productId = url.searchParams.get('product');
  if (!productId) return null;

  return url;
}

function updateCurrentProductLinkHighlights(productId = currentProductId) {
  document.querySelectorAll('a[href]').forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;

    const url = getInternalProductUrlFromLink(link);
    const isCurrent = Boolean(productId && url?.searchParams.get('product') === productId);

    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('is-current-product-link');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('is-current-product-link');
    }
  });
}

async function handleInternalProductNavigation(event) {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  const url = getInternalProductUrlFromLink(link);

  if (!url || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const productId = url.searchParams.get('product');
  const query = url.searchParams.get('q')?.trim();
  const hash = url.hash;
  if (!productId || isInternalProductNavigationPending) return;

  event.preventDefault();

  if (productId === currentProductId) {
    if (query) {
      queryInput.value = query;
      updateSearchControls();
    }

    if (hash) {
      window.history.replaceState({}, '', `${url.pathname}${url.search}${hash}`);
      expandHashTargetDetails();
      focusHashTarget();
    } else {
      focusHeroSummary();
    }
    return;
  }

  isInternalProductNavigationPending = true;
  setSearchLoading(true);

  try {
    const product = await fetchProductById(productId);
    if (!product) throw new Error('missing-product');
    if (query) queryInput.value = query;
    renderProduct(product, { historyMode: 'push' });

    if (hash) {
      window.history.replaceState({}, '', `${url.pathname}${url.search}${hash}`);
      expandHashTargetDetails();
      focusHashTarget();
    }

    announceStatus(`${product.name} の比較ページを開きました`);
  } catch {
    window.location.href = `${url.pathname}${url.search}${hash}`;
  } finally {
    isInternalProductNavigationPending = false;
    setSearchLoading(false);
  }
}

function getDocumentUrl({ includeHash = false } = {}) {
  const url = new URL(window.location.href);
  if (!includeHash) url.hash = '';
  return url.href;
}

function setMetaTag(selector, content) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.setAttribute('content', content);
}

function setCanonicalUrl(href) {
  const element = document.querySelector('link[rel="canonical"]');
  if (!element) return;
  element.setAttribute('href', href);
}

function setRobotsMeta(content = 'index,follow') {
  let element = document.querySelector('meta[name="robots"]');
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', 'robots');
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function updatePageMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogUrl,
  twitterTitle,
  twitterDescription,
  robots = 'index,follow'
} = {}) {
  document.title = title ?? DEFAULT_META.title;
  setMetaTag('meta[name="description"]', description ?? DEFAULT_META.description);
  setCanonicalUrl(canonical ?? DEFAULT_META.canonical);
  setMetaTag('meta[property="og:title"]', ogTitle ?? title ?? DEFAULT_META.ogTitle);
  setMetaTag('meta[property="og:description"]', ogDescription ?? description ?? DEFAULT_META.ogDescription);
  setMetaTag('meta[property="og:url"]', ogUrl ?? canonical ?? DEFAULT_META.ogUrl);
  setMetaTag('meta[name="twitter:title"]', twitterTitle ?? ogTitle ?? title ?? DEFAULT_META.twitterTitle);
  setMetaTag('meta[name="twitter:description"]', twitterDescription ?? ogDescription ?? description ?? DEFAULT_META.twitterDescription);
  setRobotsMeta(robots);
}

function resetPageMeta() {
  updatePageMeta({ ...DEFAULT_META, robots: 'index,follow' });
}

function upsertStructuredData(payload) {
  let script = document.getElementById(DYNAMIC_STRUCTURED_DATA_ID);

  if (!payload) {
    script?.remove();
    return;
  }

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = DYNAMIC_STRUCTURED_DATA_ID;
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(payload);
}

function getCategoryPageMeta(product) {
  const categoryText = `${product?.category ?? ''} ${product?.series ?? ''}`.toLowerCase();
  const categoryMappings = [
    { keywords: ['iphone', 'pixel', 'xperia', 'galaxy', 'smartphone', 'スマホ'], path: './categories/smartphone.html', label: 'スマホ買取価格比較' },
    { keywords: ['airpods', 'earphone', 'earbud', 'イヤホン', 'ヘッドホン'], path: './categories/earphone.html', label: 'イヤホン買取価格比較' },
    { keywords: ['switch', 'ps5', 'ps4', 'game', 'ゲーム'], path: './categories/game.html', label: 'ゲーム買取価格比較' },
    { keywords: ['ipad', 'tablet', 'タブレット'], path: './categories/tablet.html', label: 'タブレット買取価格比較' },
    { keywords: ['apple watch', 'watch', '腕時計', 'ウォッチ'], path: './categories/watch.html', label: 'Apple Watch買取価格比較' },
    { keywords: ['macbook', 'surface', 'laptop', 'notebook', 'pc', 'パソコン'], path: './categories/computer.html', label: 'PC買取価格比較' }
  ];

  const matched = categoryMappings.find(({ keywords }) => keywords.some((keyword) => categoryText.includes(keyword)));
  if (!matched) {
    return {
      href: 'https://kaitorihikaku.net/',
      label: 'カテゴリ一覧'
    };
  }

  return {
    href: new URL(matched.path, window.location.href).href,
    label: matched.label
  };
}

function getCategoryCanonicalUrl(product) {
  return getCategoryPageMeta(product).href;
}

function inferProductBrand(product) {
  const text = [
    product?.name,
    product?.category,
    product?.series,
    ...(product?.searchTokens ?? []),
    ...(product?.specBadges ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const brandMappings = [
    { keywords: ['iphone', 'ipad', 'macbook', 'airpods', 'apple watch', 'apple'], name: 'Apple' },
    { keywords: ['switch', 'nintendo'], name: 'Nintendo' },
    { keywords: ['playstation', 'ps5', 'ps4', 'walkman', 'xperia', 'sony'], name: 'Sony' },
    { keywords: ['pixel', 'google'], name: 'Google' },
    { keywords: ['surface', 'xbox', 'microsoft'], name: 'Microsoft' },
    { keywords: ['galaxy', 'samsung'], name: 'Samsung' },
    { keywords: ['wf-1000xm', 'wh-1000xm', 'linkbuds'], name: 'Sony' }
  ];

  return brandMappings.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)))?.name ?? null;
}

function buildProductStructuredData(product, status, snapshot) {
  const canonicalUrl = getDocumentUrl();
  const categoryUrl = getCategoryCanonicalUrl(product);
  const publishedAt = snapshot?.snapshotAt || null;
  const organizationNodeId = 'https://kaitorihikaku.net/#organization';
  const brandName = inferProductBrand(product);
  const brandNodeId = brandName ? `${canonicalUrl}#brand` : null;
  const standardPrice = status.isAvailable ? snapshot?.suggested?.standard : null;
  const quickSalePrice = status.isAvailable ? snapshot?.suggested?.quickSale : null;
  const aggressivePrice = status.isAvailable ? snapshot?.suggested?.aggressive : null;
  const offerLowPrice = [quickSalePrice, standardPrice, aggressivePrice]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[0] ?? null;
  const offerHighPrice = [aggressivePrice, standardPrice, quickSalePrice]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? null;
  const productNodeId = `${canonicalUrl}#product`;
  const faqNodeId = `${canonicalUrl}#faq`;
  const breadcrumbs = [
    {
      '@type': 'ListItem',
      position: 1,
      name: '買取比較.net',
      item: 'https://kaitorihikaku.net/'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: product.category,
      item: categoryUrl
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: `${product.name} 買取価格比較`,
      item: canonicalUrl
    }
  ];
  const faqEntities = [
    {
      '@type': 'Question',
      name: `${product.name} の標準相場はいくらですか？`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: standardPrice
          ? `${product.name}の標準相場の目安は${yen(standardPrice)}です。状態や付属品、バッテリー、傷の有無によって上下します。`
          : `${product.name}は比較データがまだ薄いため、現時点ではローカルSKU辞書ベースの目安表示を中心に案内しています。`
      }
    },
    {
      '@type': 'Question',
      name: `${product.name} はどこで売るのが向いていますか？`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: quickSalePrice && offerHighPrice
          ? `早く売るなら買取店、価格重視ならフリマやオークションが向きます。${product.name}では、すぐ売る価格の目安は${yen(quickSalePrice)}前後、強気で狙う価格帯は${yen(offerHighPrice)}前後です。`
          : `${product.name}は売却スピード重視なら買取店、価格重視ならフリマやオークションを比較するのが基本です。ページ内で販路ごとの向き不向きをまとめて確認できます。`
      }
    },
    {
      '@type': 'Question',
      name: `${product.name} の掲載価格は確定額ですか？`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${product.name}の掲載価格は参考値です。状態、付属品、欠品、ネットワーク利用制限、相場変動によって実際の査定額は上下します。`
      }
    }
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbs
      },
      {
        '@type': 'Organization',
        '@id': organizationNodeId,
        name: '買取比較.net',
        url: 'https://kaitorihikaku.net/',
        description: 'iPhone・AirPods・Switchなどの買取価格比較と売却相場を確認できる中古売却比較サイト。'
      },
      ...(brandName ? [{
        '@type': 'Brand',
        '@id': brandNodeId,
        name: brandName
      }] : []),
      {
        '@type': 'Product',
        '@id': productNodeId,
        name: product.name,
        category: product.category,
        url: canonicalUrl,
        ...(brandNodeId ? {
          brand: {
            '@id': brandNodeId
          }
        } : {}),
        additionalProperty: [
          ...(product.series ? [{ '@type': 'PropertyValue', name: 'シリーズ', value: product.series }] : []),
          ...(standardPrice ? [{ '@type': 'PropertyValue', name: '標準相場', value: String(standardPrice), unitText: 'JPY' }] : []),
          ...(quickSalePrice ? [{ '@type': 'PropertyValue', name: 'すぐ売る価格', value: String(quickSalePrice), unitText: 'JPY' }] : []),
          ...(status?.label ? [{ '@type': 'PropertyValue', name: 'データ状態', value: status.label }] : [])
        ],
        ...(offerLowPrice && offerHighPrice ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'JPY',
            lowPrice: String(offerLowPrice),
            highPrice: String(offerHighPrice),
            offerCount: String(Math.max(status?.totalComparableCount ?? 0, 1)),
            url: canonicalUrl
          }
        } : {})
      },
      {
        '@type': 'FAQPage',
        '@id': faqNodeId,
        mainEntity: faqEntities
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${product.name} の買取価格比較・売却相場 | 買取比較.net`,
        description: `${product.name}の標準相場・即売り価格・おすすめ販路をまとめた比較ページ。`,
        inLanguage: 'ja-JP',
        isPartOf: {
          '@type': 'WebSite',
          name: '買取比較.net',
          url: 'https://kaitorihikaku.net/'
        },
        breadcrumb: {
          '@id': `${canonicalUrl}#breadcrumb`
        },
        about: {
          '@id': productNodeId
        },
        mainEntity: [
          {
            '@id': productNodeId
          },
          {
            '@id': faqNodeId
          }
        ],
        publisher: {
          '@id': organizationNodeId
        },
        ...(publishedAt ? {
          datePublished: publishedAt,
          dateModified: publishedAt
        } : {})
      }
    ]
  };
}

function buildSuggestionStructuredData(candidates, title, query = '') {
  const canonicalUrl = getDocumentUrl();
  const normalizedQuery = query.trim();
  const pageName = normalizedQuery
    ? `「${normalizedQuery}」の${title} | 買取比較.net`
    : `${title} | 買取比較.net`;
  const description = normalizedQuery
    ? `「${normalizedQuery}」に近い商品候補を比較しながら、容量・世代・snapshot反映状況の違いを見て選べます。`
    : '近い商品候補を比較しながら、容量・世代・snapshot反映状況の違いを見て選べます。';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SearchResultsPage',
        '@id': `${canonicalUrl}#search-results`,
        url: canonicalUrl,
        name: pageName,
        description,
        inLanguage: 'ja-JP',
        isPartOf: {
          '@type': 'WebSite',
          name: '買取比較.net',
          url: 'https://kaitorihikaku.net/'
        },
        mainEntity: {
          '@id': `${canonicalUrl}#candidate-list`
        }
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#candidate-list`,
        name: normalizedQuery ? `「${normalizedQuery}」の${title}` : `${title} 候補一覧`,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: candidates.length,
        itemListElement: candidates.map(({ product }, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: buildAbsoluteProductUrl(product),
          item: {
            '@type': 'Product',
            name: product.name,
            category: product.category
          }
        }))
      }
    ]
  };
}

function buildNoResultStructuredData(query, suggestions = []) {
  const canonicalUrl = getDocumentUrl();
  const normalizedQuery = query.trim();

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SearchResultsPage',
        '@id': `${canonicalUrl}#no-result`,
        url: canonicalUrl,
        name: `「${normalizedQuery}」の買取相場候補を探す | 買取比較.net`,
        description: `「${normalizedQuery}」に近い買取相場候補や人気カテゴリへの導線を表示しています。`,
        inLanguage: 'ja-JP',
        isPartOf: {
          '@type': 'WebSite',
          name: '買取比較.net',
          url: 'https://kaitorihikaku.net/'
        },
        about: {
          '@type': 'Thing',
          name: normalizedQuery
        },
        mainEntity: suggestions.length
          ? { '@id': `${canonicalUrl}#related-candidates` }
          : undefined
      },
      ...(suggestions.length
        ? [{
            '@type': 'ItemList',
            '@id': `${canonicalUrl}#related-candidates`,
            name: `「${normalizedQuery}」に近い商品候補`,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: suggestions.length,
            itemListElement: suggestions.map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: buildAbsoluteProductUrl(product),
              item: {
                '@type': 'Product',
                name: product.name,
                category: product.category
              }
            }))
          }]
        : [])
    ]
  };
}

function updateProductMeta(product, status, snapshot) {
  const currentUrl = getDocumentUrl();
  const statusText = status.isAvailable && snapshot?.suggested?.standard
    ? `標準相場は${yen(snapshot.suggested.standard)}`
    : '標準相場・即売り価格・おすすめ販路を確認';
  const description = `${product.name}の買取価格比較ページ。${statusText}。${product.category}の売却相場、高く売るコツ、関連記事への導線をまとめて見られます。`;
  updatePageMeta({
    title: `${product.name} の買取価格比較・売却相場 | 買取比較.net`,
    description,
    canonical: currentUrl,
    ogTitle: `${product.name} の買取価格比較 | 買取比較.net`,
    ogDescription: description,
    ogUrl: currentUrl
  });
}

function clearProductUrl() {
  updateSearchState({ query: normalizeSearchQuery(queryInput?.value ?? '') || null });
}

function focusSearchField({ shouldSelect = false } = {}) {
  queryInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  queryInput?.focus();
  if (shouldSelect && typeof queryInput?.select === 'function') {
    queryInput.select();
  }
}

function buildRefineSearchActions({ includeClear = false } = {}) {
  return `
    <div class="emptyStateActions">
      <button class="secondary" type="button" data-refine-search="true">検索欄に戻る</button>
      ${includeClear ? '<button class="textButton" type="button" data-clear-search="true">入力をクリア</button>' : ''}
    </div>
  `;
}

function bindRefineSearchActions(root = document) {
  root.querySelectorAll('[data-refine-search]').forEach((btn) => {
    btn.addEventListener('click', () => {
      focusSearchField({ shouldSelect: true });
      announceStatus('検索欄に戻りました');
    });
  });

  root.querySelectorAll('[data-clear-search]').forEach((btn) => {
    btn.addEventListener('click', () => {
      resetSearch();
      announceStatus('検索条件をクリアしました');
    });
  });
}

function resetSearch(options = {}) {
  const { focus = true, clearUrl = true } = options;

  currentProductId = null;
  queryInput.value = '';
  if (clearUrl) clearProductUrl();
  resetPageMeta();
  updateClearButtonVisibility();
  setSearchLoading(false);
  renderQuerySuggestions('');
  renderRecentProducts();
  renderEmptyQueryState();
  updateSearchDraftHint();
  if (focus) focusSearchField();
}

function buildListingBundleText() {
  const title = titleOutput?.value?.trim() ?? '';
  const description = descriptionOutput?.value?.trim() ?? '';
  const listingNote = listingNoteOutput?.value?.trim() ?? '';

  return [
    title ? `【タイトル案】\n${title}` : '',
    description ? `【説明文】\n${description}` : '',
    listingNote ? `【出品メモ】\n${listingNote}` : ''
  ].filter(Boolean).join('\n\n');
}

function getResultShareButtonDefaultLabel() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    ? '共有'
    : '要点つきコピー';
}

function syncResultShareButtonLabel() {
  if (!copyResultLinkBtn) return;

  const defaultLabel = getResultShareButtonDefaultLabel();
  copyResultLinkBtn.textContent = defaultLabel;
  copyResultLinkBtn.setAttribute('aria-label', defaultLabel === '共有'
    ? 'この比較ページを共有'
    : 'この比較ページの要点とリンクをコピー');
  copyResultLinkBtn.title = defaultLabel === '共有'
    ? 'この比較ページを共有'
    : 'この比較ページの要点とリンクをコピー';
}

function getListingBundleParts() {
  return [
    titleOutput?.value?.trim() ? 'タイトル案' : '',
    descriptionOutput?.value?.trim() ? '説明文' : '',
    listingNoteOutput?.value?.trim() ? '出品メモ' : ''
  ].filter(Boolean);
}

function updateListingBundleButtonLabel() {
  if (!copyListingBundleBtn) return;

  const bundleParts = getListingBundleParts();

  if (!bundleParts.length) {
    copyListingBundleBtn.textContent = 'まとめてコピー';
    copyListingBundleBtn.setAttribute('aria-label', '出品文をまとめてコピー');
    return;
  }

  const shortLabel = bundleParts.length === 1
    ? `${bundleParts[0]}をコピー`
    : `${bundleParts.length}点まとめてコピー`;
  const ariaLabel = `${bundleParts.join('・')}をまとめてコピー`;

  copyListingBundleBtn.textContent = shortLabel;
  copyListingBundleBtn.setAttribute('aria-label', ariaLabel);
}

function getEditedListingDraftParts() {
  return [
    (titleOutput?.value ?? '') !== (currentGeneratedListingDrafts.title ?? '') ? 'タイトル案' : '',
    (descriptionOutput?.value ?? '') !== (currentGeneratedListingDrafts.description ?? '') ? '説明文' : '',
    (listingNoteOutput?.value ?? '') !== (currentGeneratedListingDrafts.listingNote ?? '') ? '出品メモ' : ''
  ].filter(Boolean);
}

function updateResetListingDraftsButtonLabel() {
  if (!resetListingDraftsBtn) return;

  const editedParts = getEditedListingDraftParts();

  if (!editedParts.length) {
    resetListingDraftsBtn.textContent = 'たたき台に戻す';
    resetListingDraftsBtn.setAttribute('aria-label', '出品文を生成したたたき台に戻す');
    return;
  }

  const shortLabel = editedParts.length === 1
    ? `${editedParts[0]}を戻す`
    : `${editedParts.length}点を戻す`;
  const ariaLabel = `${editedParts.join('・')}を生成したたたき台に戻す`;

  resetListingDraftsBtn.textContent = shortLabel;
  resetListingDraftsBtn.setAttribute('aria-label', ariaLabel);
}

function setGeneratedListingDrafts({ title = '', description = '', listingNote = '' } = {}) {
  currentGeneratedListingDrafts = {
    title,
    description,
    listingNote
  };
}

function readListingDraftStorage() {
  try {
    const raw = window.localStorage.getItem(LISTING_DRAFT_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeListingDraftStorage(records = {}) {
  try {
    const hasRecords = Object.keys(records).length > 0;
    if (!hasRecords) {
      window.localStorage.removeItem(LISTING_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(LISTING_DRAFT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage write failures
  }
}

function getSavedListingDraft(productId) {
  if (!productId) return null;

  const record = readListingDraftStorage()?.[productId];
  if (!record || typeof record !== 'object') return null;

  return {
    title: typeof record.title === 'string' ? record.title : '',
    description: typeof record.description === 'string' ? record.description : '',
    listingNote: typeof record.listingNote === 'string' ? record.listingNote : '',
    updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : null
  };
}

function persistCurrentListingDraft() {
  if (!currentProductId) return;

  const records = readListingDraftStorage();
  const nextDraft = {
    title: titleOutput?.value ?? '',
    description: descriptionOutput?.value ?? '',
    listingNote: listingNoteOutput?.value ?? ''
  };
  const matchesGenerated = nextDraft.title === (currentGeneratedListingDrafts.title ?? '')
    && nextDraft.description === (currentGeneratedListingDrafts.description ?? '')
    && nextDraft.listingNote === (currentGeneratedListingDrafts.listingNote ?? '');

  if (matchesGenerated || (!nextDraft.title && !nextDraft.description && !nextDraft.listingNote)) {
    currentSavedListingDraftUpdatedAt = null;
    currentSavedListingDraftRestored = false;
    if (records[currentProductId]) {
      delete records[currentProductId];
      writeListingDraftStorage(records);
    }
    return;
  }

  const updatedAt = Date.now();
  records[currentProductId] = {
    ...nextDraft,
    updatedAt
  };
  currentSavedListingDraftUpdatedAt = updatedAt;
  currentSavedListingDraftRestored = false;
  writeListingDraftStorage(records);
}

function restoreSavedListingDraft(productId) {
  currentSavedListingDraftUpdatedAt = null;
  currentSavedListingDraftRestored = false;

  const savedDraft = getSavedListingDraft(productId);
  if (!savedDraft) return false;

  if (titleOutput) titleOutput.value = savedDraft.title;
  if (descriptionOutput) descriptionOutput.value = savedDraft.description;
  if (listingNoteOutput) listingNoteOutput.value = savedDraft.listingNote;
  currentSavedListingDraftUpdatedAt = savedDraft.updatedAt;
  currentSavedListingDraftRestored = true;
  return true;
}

function getTitleReadiness(length = 0) {
  if (!length) {
    return {
      tone: 'empty',
      shortLabel: 'タイトル 未作成',
      summaryLabel: 'タイトル未作成',
      detail: 'タイトル案を作ると、ここで長さの目安を確認できます。'
    };
  }

  if (length > 40) {
    return {
      tone: 'warn',
      shortLabel: `タイトル ${length}文字・長め`,
      summaryLabel: 'タイトルは少し長め',
      detail: '一覧で収まりやすくするなら、重複語を1〜2個削るのが無難です。'
    };
  }

  if (length >= 24) {
    return {
      tone: 'good',
      shortLabel: `タイトル ${length}文字・使いやすい`,
      summaryLabel: 'タイトルは使いやすい長さ',
      detail: '型番・容量・状態が入っていれば、そのまま使いやすい長さです。'
    };
  }

  return {
    tone: 'seed',
    shortLabel: `タイトル ${length}文字・短め`,
    summaryLabel: 'タイトルは短め',
    detail: '容量・カラー・付属品を1つ足すと、検索で見つけられやすくなります。'
  };
}

function getDescriptionReadiness(length = 0) {
  if (!length) {
    return {
      tone: 'empty',
      shortLabel: '説明文 未作成',
      summaryLabel: '説明文未作成',
      detail: '説明文を作ると、情報量の目安をここで確認できます。'
    };
  }

  if (length < 120) {
    return {
      tone: 'seed',
      shortLabel: `説明文 ${length}文字・短め`,
      summaryLabel: '説明文は少し短め',
      detail: '傷・バッテリー・付属品を足すと、質問されにくい説明文になります。'
    };
  }

  if (length <= 260) {
    return {
      tone: 'good',
      shortLabel: `説明文 ${length}文字・使いやすい`,
      summaryLabel: '説明文は扱いやすい分量',
      detail: '状態や付属品だけ実機に合わせれば、そのまま出品しやすい分量です。'
    };
  }

  return {
    tone: 'warn',
    shortLabel: `説明文 ${length}文字・詳しめ`,
    summaryLabel: '説明文はやや詳しめ',
    detail: '発送文や定型句を少し削ると、読みやすさを保ちやすくなります。'
  };
}

function getListingNoteReadiness(length = 0) {
  if (!length) {
    return {
      tone: 'empty',
      shortLabel: 'メモ 未作成',
      summaryLabel: '出品メモ未作成',
      detail: '出品メモを作ると、相場要点のまとまり具合をここで見られます。'
    };
  }

  if (length <= 180) {
    return {
      tone: 'good',
      shortLabel: `メモ ${length}文字・短く確認向き`,
      summaryLabel: 'メモは短く見返しやすい',
      detail: '出品前の最終確認メモとして、そのまま使いやすい長さです。'
    };
  }

  return {
    tone: 'seed',
    shortLabel: `メモ ${length}文字・情報多め`,
    summaryLabel: 'メモは情報しっかりめ',
    detail: '別タブで比較しながら出品するときのメモ向きです。'
  };
}

function applyListingReadinessChip(element, readiness) {
  if (!element || !readiness) return;

  element.textContent = readiness.shortLabel;
  element.className = `listingReadinessChip is-${readiness.tone}`;
}

function hasListingDraftEdits() {
  return (titleOutput?.value ?? '') !== (currentGeneratedListingDrafts.title ?? '')
    || (descriptionOutput?.value ?? '') !== (currentGeneratedListingDrafts.description ?? '')
    || (listingNoteOutput?.value ?? '') !== (currentGeneratedListingDrafts.listingNote ?? '');
}

function autoResizeListingField(field) {
  if (!(field instanceof HTMLTextAreaElement)) return;

  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight}px`;
}

function syncListingDraftFieldHeights() {
  [titleOutput, descriptionOutput, listingNoteOutput].forEach((field) => {
    autoResizeListingField(field);
  });
}

function updateListingActionStates() {
  listingCopyButtons.forEach((button) => {
    const targetId = button.dataset.copyTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    const hasValue = Boolean(target?.value?.trim());
    button.disabled = !hasValue;
    button.setAttribute('aria-disabled', hasValue ? 'false' : 'true');
  });

  if (copyListingBundleBtn) {
    const hasBundleText = Boolean(buildListingBundleText().trim());
    copyListingBundleBtn.disabled = !hasBundleText;
    copyListingBundleBtn.setAttribute('aria-disabled', hasBundleText ? 'false' : 'true');
  }

  updateListingBundleButtonLabel();
}

function updateListingCopyMeta() {
  const titleLength = titleOutput?.value?.trim().length ?? 0;
  const descriptionLength = descriptionOutput?.value?.trim().length ?? 0;
  const listingNoteLength = listingNoteOutput?.value?.trim().length ?? 0;
  const titleReadiness = getTitleReadiness(titleLength);
  const descriptionReadiness = getDescriptionReadiness(descriptionLength);
  const listingNoteReadiness = getListingNoteReadiness(listingNoteLength);
  const draftEdited = hasListingDraftEdits();

  if (titleOutputMeta) {
    const titleTargetLength = 40;
    const titleRoom = titleTargetLength - titleLength;

    if (!titleLength) {
      titleOutputMeta.textContent = 'タイトル案を作ると、文字数の目安をここに表示します。';
    } else if (titleLength > titleTargetLength) {
      titleOutputMeta.textContent = `${titleLength}文字。目安の${titleTargetLength}文字より${Math.abs(titleRoom)}文字長めです。型番と状態を残しつつ、重複語を1〜2個削ると一覧で収まりやすくなります。`;
    } else if (titleLength >= 24) {
      titleOutputMeta.textContent = `${titleLength}文字。見やすい長さです。目安まであと${titleRoom}文字入れられます。型番・容量・状態の3点が入っていれば、そのまま出品タイトルに使いやすいです。`;
    } else {
      titleOutputMeta.textContent = `${titleLength}文字。かなり短めです。目安まであと${titleRoom}文字あるので、必要なら容量・カラー・付属品を1つ足すと検索されやすくなります。`;
    }
  }

  if (descriptionOutputMeta) {
    if (!descriptionLength) {
      descriptionOutputMeta.textContent = '説明文を作ると、使い方の目安をここに表示します。';
    } else if (descriptionLength < 120) {
      descriptionOutputMeta.textContent = `${descriptionLength}文字。少し短めです。傷・バッテリー・付属品の3点を足すと、質問されにくい説明文になります。`;
    } else if (descriptionLength <= 260) {
      descriptionOutputMeta.textContent = `${descriptionLength}文字。扱いやすい分量です。コピペ前に状態・傷・付属品だけ実機に合わせれば、そのまま出品しやすいです。`;
    } else {
      descriptionOutputMeta.textContent = `${descriptionLength}文字。かなり詳しめです。発送文や定型句を少し削ると、読みやすさを保ちやすくなります。`;
    }
  }

  if (listingNoteOutputMeta) {
    if (!listingNoteLength) {
      listingNoteOutputMeta.textContent = '出品メモを作ると、相場の要点をここに表示します。';
    } else if (listingNoteLength <= 180) {
      listingNoteOutputMeta.textContent = `${listingNoteLength}文字。短く要点だけ見返したいとき向きです。出品前の最終確認メモとしてそのまま使えます。`;
    } else {
      listingNoteOutputMeta.textContent = `${listingNoteLength}文字。相場・販路・確認項目までまとまっています。別タブで比較しながら出品するときのメモ向きです。`;
    }
  }

  applyListingReadinessChip(listingReadinessTitle, titleReadiness);
  applyListingReadinessChip(listingReadinessDescription, descriptionReadiness);
  applyListingReadinessChip(listingReadinessMemo, listingNoteReadiness);

  if (listingReadinessDraftState) {
    listingReadinessDraftState.textContent = draftEdited ? 'たたき台 編集済み' : 'たたき台 そのまま';
    listingReadinessDraftState.className = `listingReadinessChip ${draftEdited ? 'is-info' : 'is-empty'}`;
  }

  if (listingReadinessSavedState) {
    const savedDraftLabel = currentSavedListingDraftUpdatedAt
      ? formatRelativeDateLabel(currentSavedListingDraftUpdatedAt).replace(/に更新$/, 'に保存')
      : '';
    const restoredLabel = currentSavedListingDraftRestored && savedDraftLabel
      ? `保存下書き 復元済み（${savedDraftLabel}）`
      : (savedDraftLabel ? `保存下書き ${savedDraftLabel}` : '保存下書き なし');

    listingReadinessSavedState.textContent = restoredLabel;
    listingReadinessSavedState.className = `listingReadinessChip ${savedDraftLabel ? 'is-info' : 'is-empty'}`;
  }

  if (resetListingDraftsBtn) {
    resetListingDraftsBtn.disabled = !(currentGeneratedListingDrafts.title || currentGeneratedListingDrafts.description || currentGeneratedListingDrafts.listingNote) || !draftEdited;
    updateResetListingDraftsButtonLabel();
  }

  if (listingReadinessSummary) {
    if (!titleLength && !descriptionLength && !listingNoteLength) {
      listingReadinessSummary.textContent = 'タイトル案と説明文を作ると、ここにコピペ前の目安を表示します。';
    } else {
      const summaryParts = [titleReadiness.summaryLabel, descriptionReadiness.summaryLabel, listingNoteReadiness.summaryLabel]
        .filter(Boolean)
        .join(' / ');
      const guidance = [titleReadiness, descriptionReadiness, listingNoteReadiness]
        .find((item) => item.tone === 'warn')
        ?? [titleReadiness, descriptionReadiness, listingNoteReadiness].find((item) => item.tone === 'seed')
        ?? titleReadiness;
      const savedDraftPrefix = currentSavedListingDraftRestored && currentSavedListingDraftUpdatedAt
        ? '保存していた下書きを復元しています。 '
        : '';

      listingReadinessSummary.textContent = `${savedDraftPrefix}${summaryParts}。${guidance.detail}`;
    }
  }

  syncListingDraftFieldHeights();
  updateListingActionStates();
  refreshResultJumpCounts();
}

async function syncUiWithUrl() {
  const url = new URL(window.location.href);
  const productId = url.searchParams.get('product');
  const query = url.searchParams.get('q')?.trim();

  if (!productId && !query) {
    resetSearch({ focus: false, clearUrl: false });
    return;
  }

  await restoreStateFromUrl();
}

function expandHashTargetDetails() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return;

  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!(target instanceof HTMLDetailsElement)) return;
  if (!target.open) target.open = true;
}

function getHashTarget() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return null;
  return document.getElementById(decodeURIComponent(hash.slice(1)));
}

function focusHashTarget({ updateJumpNav = true } = {}) {
  const target = getHashTarget();
  if (!(target instanceof HTMLElement)) return;
  if (target.classList.contains('hidden')) return;

  expandHashTargetDetails();
  focusRegion(target);

  if (!updateJumpNav) return;
  const targetId = target.id || '';
  if (targetId) updateActiveResultJumpLink(targetId);
}

async function restoreStateFromUrl() {
  const url = new URL(window.location.href);
  const productId = url.searchParams.get('product');
  const query = url.searchParams.get('q')?.trim();

  if (productId) {
    try {
      setSearchLoading(true);
      const product = await fetchProductById(productId);
      setSearchLoading(false);
      if (product) {
        if (query) queryInput.value = query;
        renderProduct(product);
      }
      return;
    } catch {
      setSearchLoading(false);
    }
  }

  if (query && productsLoaded) {
    queryInput.value = query;
    await runSearch();
  }
}

fetchJson('./api/categories/summary')
  .catch(() => fetchJson('./fallback-category-summary.json'))
  .then((summary) => {
    window.__categorySummarySource = summary.source ?? 'api';
    categorySummaryData = summary.categories ?? [];
    products = categorySummaryData.flatMap((entry) => entry.topItems ?? []);
    productsLoaded = true;
    setSearchLoading(false);
    renderCategorySections();
    renderTrendHub();
    renderSeoHubSections();
    renderQuerySuggestions();
    enhancePopularSearchLinks();
    restoreStateFromUrl();
  })
  .catch(() => {
    emptyState.classList.remove('hidden');
    resultSection.classList.add('hidden');
    emptyState.innerHTML = '<h2>データを読み込めない</h2><p>ページを再読み込みしてください。</p>';
    isSearchLoading = false;
    searchBtn.disabled = false;
    searchBtn.textContent = '再試行';
    searchStatus.classList.add('hidden');
    if (searchCatalogMeta) {
      searchCatalogMeta.textContent = '商品データの読み込みに失敗しました。再読み込みすると検索できるようになることがあります。';
    }
  });

function yen(value) {
  return `¥${Math.round(value).toLocaleString('ja-JP')}`;
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatchedText(text = '', tokens = []) {
  if (!text) return '';

  const normalizedTokens = [...new Set(tokens.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((token) => escapeRegExp(token));

  if (!normalizedTokens.length) return escapeHtml(text);

  const matcher = new RegExp(normalizedTokens.join('|'), 'giu');
  let cursor = 0;
  let html = '';

  for (const match of text.matchAll(matcher)) {
    const [value] = match;
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(cursor, index));
    html += `<mark class="matchMark">${escapeHtml(value)}</mark>`;
    cursor = index + value.length;
  }

  html += escapeHtml(text.slice(cursor));
  return html;
}

function formatSnapshotDate(value) {
  if (!value) return 'ローカル既定値';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ローカル既定値';
  return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatRelativeDateLabel(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return '更新待ち';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'たった今更新';
  if (diffMinutes < 60) return `${diffMinutes}分前に更新`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前に更新`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}日前に更新`;

  return `${Math.floor(diffDays / 7)}週間前に更新`;
}

function getSnapshotFreshnessInfo(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return {
      level: 'scheduled',
      tag: '更新待ち',
      note: '次回の価格取得が反映されるまで少し待つと見やすいです。'
    };
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays >= 21) {
    return {
      level: 'stale',
      tag: '更新から3週間超',
      note: '相場が動いている可能性があるので、強気価格は少し慎重に見るのが無難です。'
    };
  }

  if (diffDays >= 7) {
    return {
      level: 'aging',
      tag: '更新から1週間超',
      note: '直近の出品状況で上下している可能性があります。売る前に最新の掲載価格も軽く見直すと安心です。'
    };
  }

  return {
    level: 'fresh',
    tag: '比較データは比較的新しめ',
    note: ''
  };
}

function renderSpecTags(tags = [], className = 'tag') {
  return tags.map((tag) => `<span class="${className}">${escapeHtml(tag)}</span>`).join('');
}

function formatRelativeViewedTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'たった今見た商品';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'たった今見た商品';
  if (diffMinutes < 60) return `${diffMinutes}分前に見た商品`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前に見た商品`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}日前に見た商品`;

  return formatSnapshotDate(timestamp);
}

function getUniqueNormalizedValues(values = []) {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = normalizeSearchQuery(String(value ?? ''));
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function readRecentProducts() {
  try {
    const raw = window.localStorage.getItem(RECENT_PRODUCTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentProduct(product) {
  if (!product?.id || !product?.name) return;

  const nextItems = [
    {
      id: product.id,
      name: product.name,
      query: product.name,
      category: product.category ?? '',
      series: product.series ?? '',
      priceLabel: product.priceLabel ?? candidatePriceLabel(product) ?? '',
      viewedAt: Date.now()
    },
    ...readRecentProducts().filter((item) => item?.id !== product.id)
  ].slice(0, RECENT_PRODUCTS_LIMIT);

  try {
    window.localStorage.setItem(RECENT_PRODUCTS_STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // ignore storage errors and keep core search UX working
  }
}

function clearRecentProducts() {
  try {
    window.localStorage.removeItem(RECENT_PRODUCTS_STORAGE_KEY);
  } catch {
    // ignore storage errors and keep core search UX working
  }
}

function buildQuerySuggestionOptions(activeQuery = '') {
  const suggestions = [];
  const seen = new Set();
  const normalizedActiveQuery = normalizeSearchQuery(activeQuery);

  const pushSuggestion = (value, label = '') => {
    const normalized = normalizeSearchQuery(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    suggestions.push({ value: normalized, label: normalizeSearchQuery(label) });
  };

  if (normalizedActiveQuery) {
    buildLocalProductSuggestions(normalizedActiveQuery, 6).forEach((product) => {
      pushSuggestion(product?.name, [product?.category, product?.series].filter(Boolean).join(' / '));
    });
  }

  readRecentProducts().forEach((item) => {
    pushSuggestion(item?.query || item?.name, [item?.category, item?.series].filter(Boolean).join(' / '));
  });

  document.querySelectorAll('.popularSearchLinks a[href*="?product="]').forEach((link) => {
    pushSuggestion(link.textContent, '人気の比較ページ');
  });

  categorySummaryData
    .flatMap((entry) => entry.topItems ?? [])
    .forEach((product) => {
      pushSuggestion(product?.name, [product?.category, product?.series].filter(Boolean).join(' / '));
      pushSuggestion(product?.series, product?.category);
    });

  return suggestions.slice(0, 12);
}

function renderQuerySuggestions(activeQuery = queryInput?.value ?? '') {
  if (!querySuggestions) return;
  querySuggestions.innerHTML = buildQuerySuggestionOptions(activeQuery)
    .map(({ value, label }) => `<option value="${escapeHtml(value)}"${label ? ` label="${escapeHtml(label)}"` : ''}></option>`)
    .join('');
}

function buildPopularSearchFirstCheckLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return 'まず見る: 容量と1世代前後の差';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return 'まず見る: ケース違いと付属品差';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return 'まず見る: 通常版・型番違いの差';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return 'まず見る: 世代差と通信方式の差';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return 'まず見る: サイズ差とGPS差';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return 'まず見る: メモリとSSD構成の差';
  }

  return 'まず見る: 近いモデル同士の差';
}

function buildPopularSearchFitLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return '向いている人: 容量や世代が近いスマホで迷っている人';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '向いている人: ケース違いや付属品差が気になる人';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '向いている人: 版違いや型番差を売り分けたい人';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '向いている人: 世代や通信方式の差を整理したい人';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return '向いている人: サイズやGPS差で迷っている人';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return '向いている人: スペック差で価格差を見たい人';
  }

  return '向いている人: 近いモデル同士で迷っている人';
}

function buildPopularSearchNextStepLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return '次に見る: 容量差と世代差の売り値';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '次に見る: ケース違いと付属品の減額幅';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '次に見る: 本体版違いと売り先の差';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '次に見る: 世代差と通信方式の相場差';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return '次に見る: サイズ差とGPS差の相場';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return '次に見る: メモリ・SSD差の値幅';
  }

  return '次に見る: 近いモデルとの差と売り先';
}

function buildPopularSearchCautionLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return '注意点: 容量やキャリア差で値段がズレやすい';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '注意点: ケース欠品や使用感で差が出やすい';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '注意点: セット品や付属欠品で評価が変わる';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '注意点: 容量と通信方式の取り違えに注意';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return '注意点: サイズ違いとCellular有無で差が出る';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return '注意点: メモリやSSD違いで値幅が大きい';
  }

  return '注意点: 近いモデルでも条件差で値段が変わる';
}

function enhancePopularSearchLinks() {
  const productMap = new Map(categorySummaryData.flatMap((entry) => entry.topItems ?? []).map((product) => [product?.id, product]));

  document.querySelectorAll('.popularSearchLinks a[href*="?product="]').forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;

    const url = new URL(link.href, window.location.href);
    const productId = url.searchParams.get('product');
    const product = productId ? productMap.get(productId) : null;
    const existingMeta = link.querySelector('.popularSearchMeta');
    const existingPrice = link.querySelector('.popularSearchPrice');
    const existingFreshness = link.querySelector('.popularSearchFreshness');
    const existingConfidence = link.querySelector('.popularSearchConfidence');
    const existingBestMarket = link.querySelector('.popularSearchBestMarket');
    const existingTrend = link.querySelector('.popularSearchTrend');
    const existingFirstCheck = link.querySelector('.popularSearchFirstCheck');
    const existingFit = link.querySelector('.popularSearchFit');
    const existingNextStep = link.querySelector('.popularSearchNextStep');
    const existingCaution = link.querySelector('.popularSearchCaution');
    const existingAction = link.querySelector('.popularSearchAction');

    if (!product) {
      existingMeta?.remove();
      existingPrice?.remove();
      existingFreshness?.remove();
      existingBestMarket?.remove();
      existingTrend?.remove();
      existingFirstCheck?.remove();
      existingFit?.remove();
      existingNextStep?.remove();
      existingCaution?.remove();
      existingAction?.remove();
      return;
    }

    const snapshotStatus = getSnapshotStatus(product);
    const metaText = [product.category, product.series].filter(Boolean).join(' / ');
    const priceText = product.priceLabel ?? candidatePriceLabel(product);
    const freshnessText = snapshotStatus.isAvailable ? candidateFreshnessLabel(product) : '';
    const confidence = snapshotStatus.isAvailable ? confidenceSummary(snapshotStatus.snapshot) : null;
    const confidenceText = confidence?.label ?? '';
    const bestMarketText = candidateBestMarketLabel(product);
    const trendSummary = candidateTrendSummary(product);
    const trendText = trendSummary?.label ?? '';
    const firstCheckText = buildPopularSearchFirstCheckLabel({
      category: product.category ?? '',
      product
    });
    const fitText = buildPopularSearchFitLabel({
      category: product.category ?? '',
      product
    });
    const nextStepText = buildPopularSearchNextStepLabel({
      category: product.category ?? '',
      product
    });
    const cautionText = buildPopularSearchCautionLabel({
      category: product.category ?? '',
      product
    });
    const isCurrent = product.id === currentProductId;
    const actionText = isCurrent ? 'いま開いています' : 'この相場を見る';

    if (metaText) {
      if (existingMeta) {
        existingMeta.textContent = metaText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta">${escapeHtml(metaText)}</span>`);
      }
    } else {
      existingMeta?.remove();
    }

    if (priceText) {
      if (existingPrice) {
        existingPrice.textContent = priceText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta popularSearchPrice">${escapeHtml(priceText)}</span>`);
      }
    } else {
      existingPrice?.remove();
    }

    if (freshnessText) {
      if (existingFreshness) {
        existingFreshness.textContent = freshnessText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta popularSearchFreshness">${escapeHtml(freshnessText)}</span>`);
      }
    } else {
      existingFreshness?.remove();
    }

    if (confidenceText) {
      if (existingConfidence) {
        existingConfidence.textContent = confidenceText;
        existingConfidence.className = `popularSearchMeta popularSearchConfidence ${confidence?.tone ?? ''}`.trim();
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta popularSearchConfidence ${escapeHtml(confidence?.tone ?? '')}">${escapeHtml(confidenceText)}</span>`);
      }
    } else {
      existingConfidence?.remove();
    }

    if (bestMarketText) {
      if (existingBestMarket) {
        existingBestMarket.textContent = bestMarketText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta popularSearchBestMarket">${escapeHtml(bestMarketText)}</span>`);
      }
    } else {
      existingBestMarket?.remove();
    }

    if (trendText) {
      if (existingTrend) {
        existingTrend.textContent = trendText;
        existingTrend.className = `popularSearchMeta popularSearchTrend ${trendSummary?.toneClass ?? 'is-flat'}`;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchMeta popularSearchTrend ${escapeHtml(trendSummary?.toneClass ?? 'is-flat')}">${escapeHtml(trendText)}</span>`);
      }
    } else {
      existingTrend?.remove();
    }

    if (firstCheckText) {
      if (existingFirstCheck) {
        existingFirstCheck.textContent = firstCheckText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchFirstCheck">${escapeHtml(firstCheckText)}</span>`);
      }
    } else {
      existingFirstCheck?.remove();
    }

    if (fitText) {
      if (existingFit) {
        existingFit.textContent = fitText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchFit">${escapeHtml(fitText)}</span>`);
      }
    } else {
      existingFit?.remove();
    }

    if (nextStepText) {
      if (existingNextStep) {
        existingNextStep.textContent = nextStepText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchNextStep">${escapeHtml(nextStepText)}</span>`);
      }
    } else {
      existingNextStep?.remove();
    }

    if (cautionText) {
      if (existingCaution) {
        existingCaution.textContent = cautionText;
      } else {
        link.insertAdjacentHTML('beforeend', `<span class="popularSearchCaution">${escapeHtml(cautionText)}</span>`);
      }
    } else {
      existingCaution?.remove();
    }

    if (existingAction) {
      existingAction.textContent = actionText;
    } else {
      link.insertAdjacentHTML('beforeend', `<span class="popularSearchAction">${escapeHtml(actionText)}</span>`);
    }

    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('is-current-product-link');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('is-current-product-link');
    }

    const titleParts = [product.name, metaText, priceText, freshnessText, confidenceText, bestMarketText, trendText, firstCheckText, fitText, nextStepText, cautionText, actionText].filter(Boolean);
    const ariaDetails = [metaText, priceText, freshnessText, confidenceText, bestMarketText, trendText, firstCheckText, fitText, nextStepText, cautionText, actionText].filter(Boolean).join(' / ');
    link.setAttribute('title', titleParts.join(' / '));
    link.setAttribute('aria-label', ariaDetails
      ? `${product.name} の比較ページ（${ariaDetails}）`
      : `${product.name} の比較ページ`);
  });
}

function buildRecentSearchFitLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return '向いている人: 容量や世代が近いスマホで迷っている人';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '向いている人: 付属品や状態差の減額が気になる人';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '向いている人: 型番違いや版違いを売り分けたい人';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '向いている人: 世代や通信方式の差を整理したい人';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return '向いている人: サイズやGPS差で迷っている人';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return '向いている人: スペック差で価格の境目を見たい人';
  }

  return '向いている人: 近いモデルを見比べて戻りたい人';
}

function buildRecentSearchNextStepLabel({ category = '', product = null } = {}) {
  const haystack = `${category} ${product?.name ?? ''} ${product?.series ?? ''}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return '次に見る: 容量差と世代差の売り値';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '次に見る: ケース違いと付属品の減額幅';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '次に見る: 版違いと型番差の値幅';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '次に見る: 世代差と通信方式の相場差';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return '次に見る: サイズ差とGPS差の相場';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return '次に見る: メモリ・SSD差の値幅';
  }

  return '次に見る: 近いモデルとの差と売り先';
}

function renderRecentProducts() {
  if (!recentSearchBlock || !recentSearchLinks) return;

  const productMap = new Map(categorySummaryData.flatMap((entry) => entry.topItems ?? []).map((product) => [product?.id, product]));
  const recentItems = readRecentProducts();
  const hasItems = recentItems.length > 0;

  if (recentSearchLabel) {
    recentSearchLabel.innerHTML = hasItems
      ? `最近見た商品 <span class="popularSearchCount">${recentItems.length}件</span>`
      : '最近見た商品';
  }

  recentSearchBlock.classList.toggle('hidden', !hasItems);
  recentSearchLinks.innerHTML = hasItems
    ? recentItems.map((item) => {
      const linkedProduct = productMap.get(item.id);
      const snapshotStatus = linkedProduct ? getSnapshotStatus(linkedProduct) : null;
      const metaParts = [item.category || linkedProduct?.category, item.series || linkedProduct?.series].filter(Boolean);
      const metaText = metaParts.join(' / ');
      const priceText = item.priceLabel || linkedProduct?.priceLabel || candidatePriceLabel(linkedProduct);
      const freshnessText = snapshotStatus?.isAvailable ? candidateFreshnessLabel(linkedProduct) : '';
      const confidence = snapshotStatus?.isAvailable ? confidenceSummary(snapshotStatus.snapshot) : null;
      const confidenceText = confidence?.label ?? '';
      const bestMarketText = candidateBestMarketLabel(linkedProduct);
      const trendSummary = candidateTrendSummary(linkedProduct);
      const trendText = trendSummary?.label ?? '';
      const fitLabel = buildRecentSearchFitLabel({
        category: item.category || linkedProduct?.category || '',
        product: linkedProduct
      });
      const nextStepLabel = buildRecentSearchNextStepLabel({
        category: item.category || linkedProduct?.category || '',
        product: linkedProduct
      });
      const viewedLabel = formatRelativeViewedTime(item.viewedAt);
      const titleParts = [item.name, metaText, priceText, freshnessText, confidenceText, bestMarketText, trendText, fitLabel, nextStepLabel, viewedLabel].filter(Boolean);
      const title = titleParts.join(' / ');
      const isCurrent = item.id === currentProductId;
      const actionText = isCurrent ? 'いま開いています' : 'この相場に戻る';

      return `
        <a class="recentSearchCard ${isCurrent ? 'is-current' : ''}" href="./?product=${encodeURIComponent(item.id)}&q=${encodeURIComponent(item.query || item.name)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(`${item.name}を開く${metaText ? `（${metaText}）` : ''}${priceText ? ` / ${priceText}` : ''}${freshnessText ? ` / ${freshnessText}` : ''}${confidenceText ? ` / ${confidenceText}` : ''}${bestMarketText ? ` / ${bestMarketText}` : ''}${trendText ? ` / ${trendText}` : ''}${fitLabel ? ` / ${fitLabel}` : ''}${nextStepLabel ? ` / ${nextStepLabel}` : ''}${viewedLabel ? ` / ${viewedLabel}` : ''}`)}" ${isCurrent ? 'aria-current="page"' : ''}>
          <strong>${escapeHtml(item.name)}</strong>
          <span class="recentSearchMetaRow">
            ${metaText ? `<span class="recentSearchMeta">${escapeHtml(metaText)}</span>` : ''}
            ${priceText ? `<span class="recentSearchPrice">${escapeHtml(priceText)}</span>` : ''}
            ${freshnessText ? `<span class="recentSearchFreshness">${escapeHtml(freshnessText)}</span>` : ''}
            ${confidenceText ? `<span class="recentSearchConfidence ${escapeHtml(confidence?.tone ?? '')}">${escapeHtml(confidenceText)}</span>` : ''}
            ${bestMarketText ? `<span class="recentSearchBestMarket">${escapeHtml(bestMarketText)}</span>` : ''}
            ${trendText ? `<span class="recentSearchTrend ${escapeHtml(trendSummary?.toneClass ?? '')}">${escapeHtml(trendText)}</span>` : ''}
          </span>
          ${fitLabel ? `<span class="recentSearchFit">${escapeHtml(fitLabel)}</span>` : ''}
          ${nextStepLabel ? `<span class="recentSearchNextStep">${escapeHtml(nextStepLabel)}</span>` : ''}
          ${viewedLabel ? `<span class="recentSearchTime">${escapeHtml(viewedLabel)}</span>` : ''}
          <span class="recentSearchAction">${escapeHtml(actionText)}</span>
        </a>
      `;
    }).join('')
    : '';

  renderQuerySuggestions();
}

function sourceModeLabel(name, stats) {
  if (!stats || stats.mode === 'none') return `${name}: データなし`;
  if (stats.mode === 'live') return `${name}: live ${stats.live}件`;
  if (stats.mode === 'fallback') return `${name}: fallback ${stats.fallback}件`;
  return `${name}: live ${stats.live}件 / fallback ${stats.fallback}件`;
}

function sourceModeShort(stats) {
  if (!stats || stats.mode === 'none') return 'データなし';
  if (stats.mode === 'live') return `live ${stats.live}件`;
  if (stats.mode === 'fallback') return `fallback ${stats.fallback}件`;
  return `live ${stats.live} / fallback ${stats.fallback}`;
}

function confidenceSummary(snapshot) {
  const score = snapshot?.confidence ?? 0;
  if (score >= 0.85) return { label: '信頼度 高め', tone: 'is-high', text: '実データが厚く、相場の納得感はかなり高いです。' };
  if (score >= 0.65) return { label: '信頼度 ふつう', tone: 'is-medium', text: '参考には十分。ただし条件差で上下しやすいです。' };
  return { label: '信頼度 低め', tone: 'is-low', text: '比較データが薄いので、ざっくり目安として見てください。' };
}

function buildSnapshotHistoryMap(historyData) {
  const entries = historyData?.history ?? historyData?.snapshots ?? [];
  const map = new Map();

  entries.forEach((entry) => {
    if (!entry?.productId) return;
    const list = map.get(entry.productId) ?? [];
    list.push(entry);
    map.set(entry.productId, list);
  });

  for (const [productId, list] of map.entries()) {
    list.sort((a, b) => new Date(a.snapshotAt ?? 0).getTime() - new Date(b.snapshotAt ?? 0).getTime());
    map.set(productId, list);
  }

  return map;
}

function formatTrendDelta(deltaJpy, deltaRatio) {
  if (!Number.isFinite(deltaJpy) || !Number.isFinite(deltaRatio)) return '比較データ不足';
  const signedYen = `${deltaJpy > 0 ? '+' : deltaJpy < 0 ? '-' : ''}${yen(Math.abs(deltaJpy))}`;
  const signedRatio = `${deltaRatio > 0 ? '+' : deltaRatio < 0 ? '-' : ''}${Math.abs(deltaRatio * 100).toFixed(1)}%`;
  return `${signedYen} / ${signedRatio}`;
}

function getSnapshotStatus(product) {
  const snapshot = product.snapshot ?? snapshotMap.get(product.id) ?? null;
  const yahooCount = snapshot?.yahoo?.count ?? 0;
  const rakumaCount = snapshot?.rakuma?.count ?? 0;
  const buybackCount = snapshot?.janpara ? 1 : 0;
  const totalComparableCount = yahooCount + rakumaCount + buybackCount;

  if (!snapshot) {
    return {
      snapshot,
      isAvailable: false,
      totalComparableCount,
      state: 'missing',
      label: 'snapshot未対応',
      badge: 'ローカルSKUのみ',
      toneClass: 'is-unsupported',
      note: '価格取得コアは未連携。ローカルSKU辞書の既定レンジで表示します。'
    };
  }

  if (totalComparableCount === 0) {
    return {
      snapshot,
      isAvailable: false,
      totalComparableCount,
      state: 'seeded',
      label: 'snapshot候補化のみ',
      badge: '比較データなし',
      toneClass: 'is-seeded',
      note: 'SKUは追加済みですが、比較件数はまだ0件。いまはローカル既定レンジ中心です。'
    };
  }

  return {
    snapshot,
    isAvailable: true,
    totalComparableCount,
    state: 'supported',
    label: 'snapshot反映あり',
    badge: `比較データ ${totalComparableCount}件`,
    toneClass: 'is-supported',
    note: 'snapshotの比較データを反映しています。'
  };
}

function candidatePriceLabel(product) {
  const status = getSnapshotStatus(product);
  if (status.snapshot?.suggested?.standard && status.isAvailable) return `標準 ${yen(status.snapshot.suggested.standard)}`;
  const markets = computeMarkets(product);
  return `${yen(Math.min(...markets.map((m) => m.min)))}〜${yen(Math.max(...markets.map((m) => m.max)))}`;
}

function candidateFreshnessLabel(product) {
  const snapshotAt = getSnapshotStatus(product)?.snapshot?.snapshotAt;
  const relativeLabel = formatRelativeDateLabel(snapshotAt);
  return relativeLabel || 'ローカル価格レンジ';
}

function candidateBestMarketLabel(product) {
  if (!product) return '';

  const rankedRecommendations = rankRecommendations(computeMarkets(product));
  const bestRecommendation = rankedRecommendations.find((item) => item.title === '高く売りたい') ?? rankedRecommendations[0] ?? null;
  const marketLabel = bestRecommendation?.market?.key ? marketLabels[bestRecommendation.market.key] : '';
  return marketLabel ? `おすすめ ${marketLabel}` : '';
}

function candidateTrendSummary(product) {
  if (!product?.id) return null;

  const snapshot = getSnapshotStatus(product)?.snapshot ?? null;
  const trend = buildTrendSummary(snapshotHistoryMap.get(product.id) ?? [], snapshot);
  if (!trend || trend.status === 'insufficient') return null;

  return {
    label: `相場 ${trend.label}`,
    toneClass: trend.toneClass || 'is-flat'
  };
}

function presetToneLabel(product) {
  const status = getSnapshotStatus(product);
  if (status.state === 'supported') return 'snapshot反映';
  if (status.state === 'seeded') return 'SKU追加済み';
  return 'ローカルのみ';
}

function bindPresetButtons(root = document) {
  root.querySelectorAll('[data-preset]').forEach((btn) => {
    bindAsyncButtonAction(btn, async () => {
      queryInput.value = btn.dataset.preset;
      await runSearch();
    });
  });
}

function bindDirectProductButtons(root = document) {
  root.querySelectorAll('[data-product-id]').forEach((btn) => {
    bindAsyncButtonAction(btn, async () => {
      try {
        const product = await fetchProductById(btn.dataset.productId);
        if (product) renderProduct(product, { historyMode: 'push' });
      } catch {
        emptyState.innerHTML = '<h2>商品詳細を取得できない</h2><p>時間をおいて再試行してください。</p>';
      }
    });
  });
}

function bindLinearKeyboardNavigation(root = document, selector, { axis = 'vertical' } = {}) {
  if (!root || !selector) return;

  const getItems = () => Array.from(root.querySelectorAll(selector))
    .filter((item) => item instanceof HTMLElement && !item.closest('.hidden'));

  root.querySelectorAll(selector).forEach((item) => {
    if (!(item instanceof HTMLElement) || item.dataset.linearNavBound === 'true') return;

    item.dataset.linearNavBound = 'true';
    item.addEventListener('keydown', (event) => {
      const items = getItems();
      const currentIndex = items.indexOf(item);
      if (currentIndex === -1) return;

      const moveFocus = (nextIndex) => {
        const target = items[nextIndex];
        if (!(target instanceof HTMLElement)) return;
        event.preventDefault();
        target.focus();
      };

      if (event.key === 'Home') {
        moveFocus(0);
        return;
      }

      if (event.key === 'End') {
        moveFocus(items.length - 1);
        return;
      }

      const previousKeys = axis === 'horizontal' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp', 'ArrowLeft'];
      const nextKeys = axis === 'horizontal' ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown', 'ArrowRight'];

      if (previousKeys.includes(event.key) && currentIndex > 0) {
        moveFocus(currentIndex - 1);
        return;
      }

      if (nextKeys.includes(event.key) && currentIndex < items.length - 1) {
        moveFocus(currentIndex + 1);
      }
    });
  });
}

const browseCategoryRules = [
  { href: './categories/smartphone.html', matcher: ({ category, topItems = [] }) => category.includes('スマホ') || topItems.some((product) => /iphone|pixel|xperia|galaxy|smartphone|スマホ/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) },
  { href: './categories/earphone.html', matcher: ({ category, topItems = [] }) => category.includes('イヤホン') || topItems.some((product) => /airpods|earphone|earbud|イヤホン|ヘッドホン/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) },
  { href: './categories/game.html', matcher: ({ category, topItems = [] }) => category.includes('ゲーム') || topItems.some((product) => /switch|playstation|ps5|ps4|xbox|game|ゲーム/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) },
  { href: './categories/tablet.html', matcher: ({ category, topItems = [] }) => category.includes('タブレット') || topItems.some((product) => /ipad|tablet|タブレット/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) },
  { href: './categories/watch.html', matcher: ({ category, topItems = [] }) => category.includes('ウォッチ') || topItems.some((product) => /apple watch|watch|ウォッチ/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) },
  { href: './categories/computer.html', matcher: ({ category, topItems = [] }) => category.includes('パソコン') || topItems.some((product) => /macbook|surface|laptop|notebook|pc|パソコン/iu.test(`${product?.name ?? ''} ${product?.series ?? ''}`)) }
];

function getBrowseCategoryCountMap() {
  return browseCategoryRules.reduce((acc, { href, matcher }) => {
    const count = categorySummaryData
      .filter((entry) => matcher(entry))
      .reduce((sum, entry) => sum + (entry.count ?? 0), 0);

    acc.set(href, count);
    return acc;
  }, new Map());
}

function getCategoryShortcutCopy({ category = '', topItems = [] } = {}) {
  const haystack = `${category} ${topItems.map((product) => `${product?.name ?? ''} ${product?.series ?? ''}`).join(' ')}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return {
      eyebrow: '容量・世代違いをまとめて確認',
      cta: '近いスマホ相場をまとめて見る',
      meta: 'ストレージ違いまで並べて、売り先と相場差を比べやすくします',
      focusPills: ['容量違い', '世代差', '売り先比較']
    };
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return {
      eyebrow: '付属品・状態差を見比べやすい入口',
      cta: 'イヤホン相場をまとめて見る',
      meta: 'AirPods系の世代違いや状態差の比較にすぐ戻れます',
      focusPills: ['付属品差', '状態差', '世代違い']
    };
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return {
      eyebrow: '型番・セット違いの売り分け確認',
      cta: 'ゲーム機相場をまとめて見る',
      meta: '通常版・有機EL・デジタル版など近い本体差を追いやすくします',
      focusPills: ['型番違い', 'セット差', '本体比較']
    };
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return {
      eyebrow: '世代・容量・通信方式を整理',
      cta: 'タブレット相場をまとめて見る',
      meta: 'Wi‑Fi / Cellular や世代違いの価格差を探しやすくします',
      focusPills: ['世代差', '容量違い', '通信方式']
    };
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return {
      eyebrow: 'サイズ・通信方式を先に確認',
      cta: 'Apple Watch相場をまとめて見る',
      meta: 'GPS / Cellular やケースサイズ違いの比較にすぐ移れます',
      focusPills: ['サイズ差', 'GPS/Cellular', '世代違い']
    };
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return {
      eyebrow: 'スペック違いの価格差を探しやすい入口',
      cta: 'PC相場をまとめて見る',
      meta: 'メモリ・SSD・世代違いを見ながら近い機種を比較できます',
      focusPills: ['メモリ差', 'SSD差', '世代違い']
    };
  }

  return {
    eyebrow: '型番が違っても探しやすい入口',
    cta: 'このカテゴリをまとめて見る',
    meta: '近いモデルをカテゴリ単位で見比べられます',
    focusPills: ['近いモデル', 'カテゴリ比較']
  };
}

function getPrimaryCategoryShortcut({ href = '', category = '', topItems = [] } = {}) {
  const countMap = getBrowseCategoryCountMap();
  const resolvedHref = href || browseCategoryRules.find((rule) => rule.matcher({ category: '', topItems }))?.href || '';
  if (!resolvedHref) return '';

  const count = countMap.get(resolvedHref) ?? 0;
  const labelBase = browseCategories?.querySelector(`a[href="${resolvedHref}"]`)?.dataset.baseLabel
    || browseCategories?.querySelector(`a[href="${resolvedHref}"]`)?.textContent?.trim()
    || 'このカテゴリ';
  const countLabel = count ? `掲載 ${count}件` : 'カテゴリ一覧';
  const shortcutCopy = getCategoryShortcutCopy({ category, topItems });
  const shortcutCta = shortcutCopy.cta === 'このカテゴリをまとめて見る'
    ? `${labelBase}をまとめて見る`
    : shortcutCopy.cta;

  return `
    <a class="categoryHubShortcut" href="${escapeHtml(resolvedHref)}">
      <span class="categoryHubShortcutEyebrow">${escapeHtml(shortcutCopy.eyebrow)}</span>
      <strong>${escapeHtml(shortcutCta)}</strong>
      <span class="categoryHubShortcutPills" aria-label="このカテゴリで比較しやすい観点">
        <span class="categoryHubShortcutPill categoryHubShortcutPillCount">${escapeHtml(countLabel)}</span>
        ${(shortcutCopy.focusPills ?? []).map((pill) => `<span class="categoryHubShortcutPill">${escapeHtml(pill)}</span>`).join('')}
      </span>
      <span class="categoryHubShortcutMeta">${escapeHtml(shortcutCopy.meta)}</span>
    </a>
  `;
}

function getCategoryIntentCopy({ category = '', topItems = [] } = {}) {
  const haystack = `${category} ${topItems.map((product) => `${product?.name ?? ''} ${product?.series ?? ''}`).join(' ')}`.toLowerCase();

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    return 'iPhone・Androidの容量違いまでまとめて見比べたい人向け。';
  }
  if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    return '付属品や状態差で上下しやすいイヤホン相場を手早く見たい人向け。';
  }
  if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    return '本体型番やセット違いごとの売り分けを先に確認したい人向け。';
  }
  if (/ipad|tablet|タブレット/u.test(haystack)) {
    return '容量・世代・セルラー有無で変わる価格差を追いたい人向け。';
  }
  if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    return 'サイズやGPS / Cellularの違いをまとめて比較したい人向け。';
  }
  if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    return 'メモリ・ストレージ違いまで含めてPC相場を探したい人向け。';
  }

  return '近いモデルをカテゴリ単位で広めに見比べたい人向け。';
}

function getCategoryMicroCtas({ category = '', topItems = [] } = {}) {
  const starterProduct = topItems.find((product) => product?.id && product?.name);
  if (!starterProduct) return [];

  const haystack = `${category} ${topItems.map((product) => `${product?.name ?? ''} ${product?.series ?? ''}`).join(' ')}`.toLowerCase();
  const productName = starterProduct.series || starterProduct.name;
  let starterLabel = `${productName}の相場を見る`;
  let guideLabel = '売り先の違いを見る';

  if (/iphone|pixel|xperia|galaxy|smartphone|スマホ/u.test(haystack)) {
    starterLabel = `${productName}の容量差を見る`;
    guideLabel = '売り先と価格差を見る';
  } else if (/airpods|earphone|earbud|イヤホン|ヘッドホン/u.test(haystack)) {
    starterLabel = `${productName}の状態差を見る`;
    guideLabel = '売り先と査定差を見る';
  } else if (/switch|playstation|ps5|ps4|xbox|game|ゲーム/u.test(haystack)) {
    starterLabel = `${productName}の型番差を見る`;
    guideLabel = '売り先とセット差を見る';
  } else if (/ipad|tablet|タブレット/u.test(haystack)) {
    starterLabel = `${productName}の世代差を見る`;
    guideLabel = '売り先と通信方式差を見る';
  } else if (/apple watch|watch|ウォッチ/u.test(haystack)) {
    starterLabel = `${productName}のサイズ差を見る`;
    guideLabel = '売り先とGPS差を見る';
  } else if (/macbook|surface|laptop|notebook|pc|パソコン/u.test(haystack)) {
    starterLabel = `${productName}の構成差を見る`;
    guideLabel = '売り先とスペック差を見る';
  }

  return [
    {
      href: `./products/${starterProduct.id}.html`,
      label: starterLabel,
      toneClass: 'is-primary'
    },
    {
      href: `./articles/${starterProduct.id}-where-to-sell.html`,
      label: guideLabel,
      toneClass: 'is-secondary'
    }
  ];
}

function applyCategoryCountBadges(links = [], { badgeClass = 'browseCategoryCount', labelSuffix = 'の比較ページ' } = {}) {
  if (!links.length || !categorySummaryData.length) return;

  const countMap = getBrowseCategoryCountMap();

  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;

    if (link.dataset.baseLabel === undefined) {
      link.dataset.baseLabel = link.querySelector('.browseCategoryText')?.textContent?.trim() || (link.textContent ?? '').trim();
    }

    const href = link.getAttribute('href');
    const count = href ? countMap.get(href) : 0;
    const baseLabel = link.dataset.baseLabel || (link.textContent ?? '').trim();
    const hintLabel = link.dataset.hint?.trim() || '';
    const fitLabel = link.dataset.fit?.trim() || '';
    const nextLabel = link.dataset.next?.trim() || '';
    const countLabel = count ? `${count.toLocaleString('ja-JP')}件` : '';

    if (link.closest('.browseCategories')) {
      link.innerHTML = `
        <span class="browseCategoryText">${escapeHtml(baseLabel)}</span>
        <span class="browseCategoryMetaRow">
          ${hintLabel ? `<span class="browseCategoryHint">${escapeHtml(hintLabel)}</span>` : ''}
          ${count ? `<span class="${escapeHtml(badgeClass)}">${escapeHtml(countLabel)}</span>` : ''}
        </span>
        ${fitLabel ? `<span class="browseCategoryFit">${escapeHtml(fitLabel)}</span>` : ''}
      `;
      link.title = [baseLabel, hintLabel, fitLabel, count ? `${labelSuffix} ${countLabel}` : 'カテゴリ一覧'].filter(Boolean).join(' / ');
      link.setAttribute('aria-label', [baseLabel, hintLabel, fitLabel, count ? `${labelSuffix} ${countLabel}` : 'カテゴリ一覧'].filter(Boolean).join(' / '));
      return;
    }

    const shouldRenderHintRow = Boolean(hintLabel) && link.matches('.popularSearchLinks a[href^="./categories/"], .categorySeoLinks a[href^="./categories/"]');

    if (!count && !shouldRenderHintRow) {
      link.textContent = baseLabel;
      link.removeAttribute('title');
      link.removeAttribute('aria-label');
      return;
    }

    if (shouldRenderHintRow) {
      const isHomepageCategoryCollectionLink = link.closest('.popularSearchLinksCategoryCues');
      link.innerHTML = `
        <span>${escapeHtml(baseLabel)}</span>
        ${hintLabel ? `<span class="popularSearchMeta popularSearchHint">${escapeHtml(hintLabel)}</span>` : ''}
        ${count ? `<span class="${escapeHtml(badgeClass)}">${escapeHtml(countLabel)}</span>` : ''}
        ${fitLabel && isHomepageCategoryCollectionLink ? `<span class="popularSearchCategoryFit">${escapeHtml(fitLabel)}</span>` : ''}
        ${nextLabel && isHomepageCategoryCollectionLink ? `<span class="popularSearchCategoryNext">${escapeHtml(nextLabel)}</span>` : ''}
      `;
      const labels = [baseLabel, hintLabel, fitLabel, nextLabel, count ? `${labelSuffix} ${countLabel}` : 'カテゴリ一覧'].filter(Boolean);
      link.title = labels.join(' / ');
      link.setAttribute('aria-label', labels.join(' / '));
      return;
    }

    link.innerHTML = `${escapeHtml(baseLabel)} <span class="${escapeHtml(badgeClass)}">${countLabel}</span>`;
    link.title = `${baseLabel} ${labelSuffix} ${countLabel}`;
    link.setAttribute('aria-label', `${baseLabel} ${labelSuffix} ${countLabel}`);
  });
}

function enhanceBrowseCategoryLinks() {
  const browseCategoryLinks = Array.from(document.querySelectorAll('.browseCategories a[href]'));
  applyCategoryCountBadges(browseCategoryLinks, { badgeClass: 'browseCategoryCount' });
}

function enhanceHomepageSearchExampleLinks() {
  const searchExampleLinks = Array.from(document.querySelectorAll('.searchExamplesLink[href^="./categories/"]'));
  applyCategoryCountBadges(searchExampleLinks, { badgeClass: 'searchExampleCount', labelSuffix: 'のカテゴリ一覧' });
}

function enhanceHomepageCategoryCollectionLinks() {
  const homepageCategoryLinks = Array.from(document.querySelectorAll('.popularSearchLinks a[href^="./categories/"], .categorySeoLinks a[href^="./categories/"]'));
  applyCategoryCountBadges(homepageCategoryLinks, { badgeClass: 'popularSearchCount', labelSuffix: 'のカテゴリ一覧' });
}

function renderCategorySections() {
  if (!categorySections || !categorySummaryData.length) return;

  const totalProducts = categorySummaryData.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
  const sourceLabel = window.__categorySummarySource === 'static-fallback'
    ? '静的フォールバックから表示'
    : 'APIから読み込み';
  categorySummary.textContent = `${categorySummaryData.length.toLocaleString('ja-JP')}カテゴリ / ${totalProducts.toLocaleString('ja-JP')}SKU を${sourceLabel}`;

  categorySections.innerHTML = categorySummaryData
    .map(({ category, count, topItems = [] }) => {
      const categoryShortcut = getPrimaryCategoryShortcut({ category, topItems });
      const intentCopy = getCategoryIntentCopy({ category, topItems });
      const microCtas = getCategoryMicroCtas({ category, topItems });

      return `
        <div class="categoryBlock">
          <div class="categoryBlockHeader">
            <strong>${escapeHtml(category)}</strong>
            <span class="categoryMeta">${count.toLocaleString('ja-JP')}SKU / 代表 ${topItems.length}件</span>
          </div>
          <p class="categoryIntent">${escapeHtml(intentCopy)}</p>
          ${microCtas.length ? `
            <div class="categoryMicroCtaRow" aria-label="このカテゴリでおすすめの始め方">
              ${microCtas.map(({ href, label, toneClass = '' }) => `
                <a class="categoryMicroCta ${escapeHtml(toneClass)}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>
              `).join('')}
            </div>
          ` : ''}
          <div class="chips">
            ${topItems.map((product) => {
              const status = getSnapshotStatus(product);
              const secondaryLabel = product.priceLabel ?? candidatePriceLabel(product);
              const trendSummary = candidateTrendSummary(product);
              const trendText = trendSummary?.label ?? '';
              const title = [product.name, status.label, status.badge, secondaryLabel, trendText].filter(Boolean).join(' / ');

              return `
                <button class="chip chipRich ${status.toneClass}" data-product-id="${escapeHtml(product.id)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
                  <span>${escapeHtml(product.series ?? product.name)}</span>
                  <small>${escapeHtml(secondaryLabel)}</small>
                  ${trendText ? `<span class="chipTrend ${escapeHtml(trendSummary?.toneClass ?? 'is-flat')}">${escapeHtml(trendText)}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>
          ${categoryShortcut}
        </div>
      `;
    })
    .join('');

  bindDirectProductButtons(categorySections);
  enhanceBrowseCategoryLinks();
  enhanceHomepageSearchExampleLinks();
  enhanceHomepageCategoryCollectionLinks();
}

function renderTrendHub() {
  if (!trendHub) return;

  if (trendUpdateNote) {
    trendUpdateNote.textContent = '価格トレンドのAPI連携は次段階です。まずは検索と商品詳細をD1経由に切り替えました。';
  }

  trendHubSummary.textContent = '検索API化を優先しつつ、価格変化の見せ方を整備中';
  trendHub.innerHTML = `
    <div class="trendCard">
      <strong>現在は検索・商品取得をAPI化</strong>
      <p class="sub small">価格推移の集計はまだ静的生成ベースです。次段階でD1/KVと組み合わせた軽量サマリーへ寄せられます。</p>
    </div>
  `;
}

function renderSeoHubSections() {
  if (!seoHubSections || !categorySummaryData.length) return;

  const linkedCount = categorySummaryData.reduce((sum, entry) => sum + Math.min(6, (entry.topItems ?? []).length), 0);
  seoHubSummary.textContent = `${linkedCount}商品ページをAPIサマリーから表示`;

  seoHubSections.innerHTML = categorySummaryData
    .map(({ category, topItems = [] }) => {
      const linked = topItems.slice(0, 6);
      if (!linked.length) return '';
      return `
        <div class="seoHubBlock">
          <div class="categoryBlockHeader">
            <strong>${escapeHtml(category)}</strong>
            <span class="categoryMeta">商品別ページ ${linked.length}件</span>
          </div>
          <div class="seoHubLinks">
            ${linked.map((product) => `<a class="seoHubLink" href="${escapeHtml(buildProductHref(product))}">${escapeHtml(product.name)}</a>`).join('')}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderSnapshotSummary(product) {
  const status = getSnapshotStatus(product);
  const { snapshot } = status;
  const history = snapshotHistoryMap.get(product.id) ?? [];
  const trend = buildTrendSummary(history, snapshot);
  const freshnessInfo = getSnapshotFreshnessInfo(snapshot?.snapshotAt);

  snapshotSummary.classList.remove('hidden', 'is-supported', 'is-seeded', 'is-unsupported');
  snapshotSummary.classList.add(status.toneClass);
  trendSummary.classList.remove('hidden');

  if (!snapshot) {
    confidenceBanner.classList.add('hidden');
    snapshotDate.textContent = 'ローカルSKUのみ';
    snapshotTags.innerHTML = renderSpecTags([
      '価格取得コアは未連携',
      '候補表示・ローカル相場は利用可'
    ]);
    snapshotNotes.textContent = status.note;
  } else if (!status.isAvailable) {
    confidenceBanner.classList.add('hidden');
    const relativeUpdate = formatRelativeDateLabel(snapshot.snapshotAt);
    const seededTags = [
      'SKU候補は追加済み',
      '比較データ 0件',
      typeof snapshot.confidence === 'number' ? `仮信頼度 ${(snapshot.confidence * 100).toFixed(0)}%` : '仮推定'
    ];

    if (freshnessInfo?.level && freshnessInfo.level !== 'fresh') {
      seededTags.push(freshnessInfo.tag);
    }

    snapshotDate.textContent = relativeUpdate
      ? `${formatSnapshotDate(snapshot.snapshotAt)}（${relativeUpdate}）`
      : formatSnapshotDate(snapshot.snapshotAt);
    snapshotTags.innerHTML = renderSpecTags(seededTags);
    snapshotNotes.textContent = [status.note, freshnessInfo?.note].filter(Boolean).join(' / ');
  } else {
    const coverage = [];
    if (snapshot.yahoo?.count) coverage.push(`Yahoo ${snapshot.yahoo.count}件`);
    if (snapshot.rakuma?.count) coverage.push(`ラクマ ${snapshot.rakuma.count}件`);
    if (snapshot.janpara?.usedMax || snapshot.janpara?.unusedPrice) coverage.push('買取 1件');
    if (typeof snapshot.confidence === 'number') coverage.push(`信頼度 ${(snapshot.confidence * 100).toFixed(0)}%`);
    if (snapshot.sourceModes) {
      coverage.push(sourceModeLabel('Yahoo', snapshot.sourceModes.yahoo));
      coverage.push(sourceModeLabel('ラクマ', snapshot.sourceModes.rakuma));
      coverage.push(sourceModeLabel('買取', snapshot.sourceModes.janpara));
    }
    if (freshnessInfo?.level && freshnessInfo.level !== 'fresh') {
      coverage.push(freshnessInfo.tag);
    }

    const relativeUpdate = formatRelativeDateLabel(snapshot.snapshotAt);
    snapshotDate.textContent = relativeUpdate
      ? `${formatSnapshotDate(snapshot.snapshotAt)}（${relativeUpdate}）`
      : formatSnapshotDate(snapshot.snapshotAt);
    snapshotTags.innerHTML = renderSpecTags(coverage);
    snapshotNotes.textContent = [snapshot.notes?.join(' / '), freshnessInfo?.note, status.note]
      .filter(Boolean)
      .join(' / ');
  }

  trendBadge.textContent = trend.label;
  trendBadge.className = `trendBadge ${trend.toneClass}`;
  trendMeta.innerHTML = renderSpecTags([
    `基準 ${trend.baseline ? yen(trend.baseline) : '—'}`,
    `現在 ${trend.current ? yen(trend.current) : '—'}`,
    `変化 ${formatTrendDelta(trend.deltaJpy, trend.deltaRatio)}`,
    `閾値 ±${trend.thresholdJpy ? yen(trend.thresholdJpy) : '—'} / ±${trend.thresholdRatio ? `${(trend.thresholdRatio * 100).toFixed(1)}%` : '—'}`,
    `比較点 ${trend.referenceCount}回`
  ]);
  trendNotes.textContent = `${trend.hint}。MVPでは差額と変化率の両方が閾値を超えたときだけ「上昇中 / 下落中」にします。`;
}

function summarizeHero(product, markets, suggestedPrices, snapshot, rankedRecommendations = []) {
  const bestRecommendation = rankedRecommendations.find((item) => item.title === '高く売りたい') ?? null;
  const quickRecommendation = rankedRecommendations.find((item) => item.title === '早く売りたい') ?? null;
  const bestPrice = bestRecommendation?.market ?? markets[0];
  const quickSaleMarket = quickRecommendation?.market ?? markets[0];
  const quickSaleValue = suggestedPrices.find((item) => item.label === '早売れ価格')?.value ?? snapshot?.suggested?.quickSale ?? null;
  const standardValue = suggestedPrices.find((item) => item.label === '標準価格')?.value ?? snapshot?.suggested?.standard ?? null;
  const aggressiveValue = suggestedPrices.find((item) => item.label === '強気価格')?.value ?? snapshot?.suggested?.aggressive ?? null;
  const upsideValue = Number.isFinite(aggressiveValue) && Number.isFinite(quickSaleValue)
    ? Math.max(0, aggressiveValue - quickSaleValue)
    : null;
  const confidence = confidenceSummary(snapshot);
  const trend = buildTrendSummary(snapshotHistoryMap.get(product?.id) ?? [], snapshot);
  const relatedGuides = buildRelatedGuideLinks(product);

  confidenceBanner.classList.remove('hidden', 'is-high', 'is-medium', 'is-low');
  confidenceBanner.classList.add(confidence.tone);
  confidenceBadge.className = `confidenceBadge ${confidence.tone}`;
  confidenceBadge.textContent = confidence.label;
  confidenceText.textContent = `${confidence.text} / Yahoo ${sourceModeShort(snapshot?.sourceModes?.yahoo)} / ラクマ ${sourceModeShort(snapshot?.sourceModes?.rakuma)} / 買取 ${sourceModeShort(snapshot?.sourceModes?.janpara)}`;

  heroStandardPrice.textContent = standardValue ? yen(standardValue) : '—';
  heroStandardNote.textContent = snapshot?.yahoo?.count
    ? `Yahoo落札 ${snapshot.yahoo.count}件ベース / ${sourceModeShort(snapshot?.sourceModes?.yahoo)}`
    : '相場の中心値を基準にした標準提案';

  heroQuickPrice.textContent = quickSaleValue ? yen(quickSaleValue) : '—';
  heroQuickNote.textContent = snapshot?.janpara?.usedMax
    ? `じゃんぱら買取ベース / ${sourceModeShort(snapshot?.sourceModes?.janpara)}`
    : '買取価格か下位相場から即売り寄りに算出';

  heroUpsidePrice.textContent = upsideValue ? `+${yen(upsideValue)}` : '—';
  heroUpsideNote.textContent = upsideValue
    ? `早売れ価格 ${yen(quickSaleValue)} → 強気価格 ${yen(aggressiveValue)} の差額目安`
    : '急がず売るとどれくらい上積みを狙えるかの目安';

  heroBestMarket.textContent = marketLabels[bestPrice.key] ?? '—';
  heroBestMarketNote.textContent = bestPrice
    ? `想定手取り ${yen(bestPrice.net)} / ${bestRecommendation?.reason ?? '手取り重視'}`
    : '販路比較データが不足しています';

  if (sellingFitCard && sellingFitBadge && sellingFitText) {
    let fitLabel = 'まずは早め売却向き';
    let fitTone = 'is-quick';
    let fitText = '強気価格との差が小さめなので、価格を追いすぎず買取や即決寄りで進めても判断しやすい相場です。';

    if (Number.isFinite(upsideValue) && upsideValue >= 5000) {
      fitLabel = 'じっくり出品向き';
      fitTone = 'is-patient';
      fitText = `早売れ価格より ${yen(upsideValue)} ほど上を狙える余地があります。急ぎでなければ、状態を整えてフリマ・オークション寄りで出す判断がハマりやすいです。`;
    } else if (trend?.toneClass === 'is-down') {
      fitLabel = '今のうち売却向き';
      fitTone = 'is-urgent';
      fitText = `${trend.label}なので、待つメリットよりも値崩れ前に動くメリットがやや大きい状態です。スピード重視の販路から見始めると迷いにくいです。`;
    } else if (trend?.toneClass === 'is-up') {
      fitLabel = '様子見もあり';
      fitTone = 'is-watch';
      fitText = `${trend.label}です。急ぎで売る理由が薄いなら、強気価格に近い出し方を短期間だけ試す余地があります。`;
    }

    sellingFitBadge.className = `sellingFitBadge ${fitTone}`;
    sellingFitBadge.textContent = fitLabel;
    sellingFitText.textContent = fitText;
    sellingFitCard.classList.remove('hidden');
  }

  if (decisionNextStep && decisionNextStepText && decisionNextStepLink) {
    const recommendedGuideTag = getRecommendedGuideTag({ trend, upsideValue, bestRecommendation });
    let nextStep = {
      text: 'まずは売り先の違いを確認して、スピード重視か価格重視かを決めると迷いにくいです。',
      href: relatedGuides.find((guide) => guide.tag === recommendedGuideTag)?.href
        ?? relatedGuides.find((guide) => guide.tag === '販路比較')?.href
        ?? './articles/index.html',
      label: 'どこで売るべきかを見る',
      sectionHref: '#selling-checklist',
      sectionLabel: 'チェック項目を見る'
    };

    if (trend?.toneClass === 'is-down') {
      nextStep = {
        text: `${trend.label}なので、後回しにするより今のうちに売り時の目安を見て動く基準を固めるのが安全です。`,
        href: relatedGuides.find((guide) => guide.tag === '売り時')?.href ?? nextStep.href,
        label: '売るタイミングを見る',
        sectionHref: '#listing-copy',
        sectionLabel: '出品文を先に作る'
      };
    } else if (Number.isFinite(upsideValue) && upsideValue >= 5000) {
      nextStep = {
        text: `早売れ価格より ${yen(upsideValue)} 上を狙える余地があるので、査定差が出やすい準備を先に済ませると伸ばしやすいです。`,
        href: relatedGuides.find((guide) => guide.tag === '高く売るコツ')?.href ?? nextStep.href,
        label: '高く売るポイントを見る',
        sectionHref: '#selling-checklist',
        sectionLabel: '準備チェックを見る'
      };
    } else if (bestRecommendation?.reason) {
      nextStep = {
        text: `${bestRecommendation.reason}。販路ごとの向き不向きを先に見てから出すと、手戻りを減らせます。`,
        href: relatedGuides.find((guide) => guide.tag === '販路比較')?.href ?? nextStep.href,
        label: 'おすすめ販路の考え方を見る',
        sectionHref: '#market-comparison',
        sectionLabel: '販路比較へ移動'
      };
    }

    decisionNextStepText.textContent = nextStep.text;
    decisionNextStepLink.href = nextStep.href;
    decisionNextStepLink.textContent = nextStep.label;
    if (decisionNextStepSectionLink) {
      decisionNextStepSectionLink.href = nextStep.sectionHref;
      decisionNextStepSectionLink.textContent = nextStep.sectionLabel;
    }
    decisionNextStep.classList.remove('hidden');
  }

  if (decisionMemo && decisionMemoList) {
    const memoItems = [];

    if (Number.isFinite(upsideValue) && upsideValue > 0) {
      memoItems.push(
        upsideValue >= 5000
          ? `急がなければ ${yen(upsideValue)} ほど上積み余地があります。価格重視なら準備してから出すほうが伸ばしやすいです。`
          : `早売れ価格との差は ${yen(upsideValue)} 前後です。手間を増やすほどの差かどうかで売り方を決めやすいです。`
      );
    } else {
      memoItems.push('早売れ価格と強気価格の差が小さめなので、手早く売る判断もしやすい相場です。');
    }

    if (trend?.toneClass === 'is-up') {
      memoItems.push(`${trend.label}です。急ぎでなければ、相場の勢いを見ながら強気価格寄りを試す余地があります。`);
    } else if (trend?.toneClass === 'is-down') {
      memoItems.push(`${trend.label}です。価格が崩れる前に、${marketLabels[quickSaleMarket?.key] ?? '早く売れる販路'}から動くと判断しやすいです。`);
    } else {
      memoItems.push('相場は大きくは動いていないので、売却スピードと手取りのどちらを優先するかで選べます。');
    }

    if (bestRecommendation?.market) {
      memoItems.push(`いちばん手取りを狙いやすいのは ${marketLabels[bestRecommendation.market.key] ?? 'おすすめ販路'} です。${bestRecommendation.reason ?? '価格重視の選択肢として見やすいです。'}`);
    }

    decisionMemoList.innerHTML = memoItems
      .slice(0, 3)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');
    decisionMemo.classList.toggle('hidden', memoItems.length === 0);
  }
}

function getResultJumpOffset() {
  const jumpNavHeight = document.querySelector('.resultJumpNav')?.getBoundingClientRect?.().height ?? 0;
  return Math.max(24, Math.ceil(jumpNavHeight + 20));
}

function syncResultJumpOffset() {
  const offset = getResultJumpOffset();
  document.documentElement.style.setProperty('--result-jump-offset', `${offset}px`);
  return offset;
}

function scrollToResults(target = resultSection) {
  requestAnimationFrame(() => {
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - syncResultJumpOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });
}

function ensureFocusable(target) {
  if (!(target instanceof HTMLElement)) return;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'summary'
  ].join(',');

  if (target.matches(focusableSelector)) return;
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }
}

function focusRegion(target) {
  requestAnimationFrame(() => {
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - syncResultJumpOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    ensureFocusable(target);
    target.focus?.({ preventScroll: true });
  });
}

function focusHeroSummary() {
  focusRegion(document.getElementById('productName') || document.getElementById('resultSection'));
}

function renderProductBreadcrumbs(product) {
  if (!productBreadcrumbs) return;

  const categoryPage = getCategoryPageMeta(product);
  productBreadcrumbs.innerHTML = `
    <a href="./">ホーム</a>
    <span aria-hidden="true">›</span>
    <a href="${escapeHtml(categoryPage.href)}">${escapeHtml(categoryPage.label)}</a>
    <span aria-hidden="true">›</span>
    <span aria-current="page">${escapeHtml(product?.name ?? '商品ページ')}</span>
  `;
}

function updateActiveResultJumpLink(activeId = '') {
  resultJumpLinks.forEach((link) => {
    const targetId = link.getAttribute('href')?.replace(/^#/, '');
    const isHidden = link.hidden;
    const isActive = !isHidden && Boolean(activeId) && targetId === activeId;
    link.classList.toggle('is-active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function syncResultJumpLinkStateFromHash() {
  const activeId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (!activeId) {
    updateActiveResultJumpLink('');
    return;
  }

  const target = document.getElementById(activeId);
  if (!(target instanceof HTMLElement) || target.classList.contains('hidden')) {
    updateActiveResultJumpLink('');
    return;
  }

  updateActiveResultJumpLink(activeId);
}

function setupResultJumpTracking() {
  if (!resultJumpLinks.length) return;

  resultJumpLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href')?.replace(/^#/, '');
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;

      event.preventDefault();
      window.history.replaceState({}, '', `#${encodeURIComponent(targetId)}`);
      updateActiveResultJumpLink(targetId);
      focusRegion(target);
    });
  });

  if (typeof IntersectionObserver === 'undefined') return;

  const sections = resultJumpLinks
    .map((link) => document.getElementById(link.getAttribute('href')?.replace(/^#/, '')))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleEntries.length) return;
    updateActiveResultJumpLink(visibleEntries[0].target.id);
  }, {
    rootMargin: '-20% 0px -55% 0px',
    threshold: [0.2, 0.45, 0.7]
  });

  sections.forEach((section) => observer.observe(section));

  window.addEventListener('hashchange', () => {
    const activeId = window.location.hash.replace(/^#/, '');
    if (activeId) updateActiveResultJumpLink(decodeURIComponent(activeId));
  });
}

function renderSuggestions(candidates, title = '近い候補', query = '') {
  const normalizedQuery = query.trim();
  const pageTitle = normalizedQuery
    ? `「${normalizedQuery}」の${title} | 買取比較.net`
    : `${title} | 買取比較.net`;
  const pageDescription = normalizedQuery
    ? `「${normalizedQuery}」に近い商品候補を比較しながら、容量・世代・snapshot反映状況の違いを見て選べます。`
    : '近い商品候補を比較しながら、容量・世代・snapshot反映状況の違いを見て選べます。';

  upsertStructuredData(buildSuggestionStructuredData(candidates, title, normalizedQuery));
  const currentUrl = getDocumentUrl();
  updatePageMeta({
    title: pageTitle,
    description: pageDescription,
    canonical: currentUrl,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogUrl: currentUrl,
    robots: 'noindex,follow'
  });
  setSearchFeedback(`候補 ${candidates.length}件。容量・世代・snapshot反映状況を見比べて選べます。`, { emphasis: title });
  announceStatus(`${candidates.length}件の候補が見つかりました`);

  const refinePresets = buildSuggestionRefinePresets(candidates, query);
  const primaryCategoryShortcut = getPrimaryCategoryShortcut({
    topItems: candidates.map(({ product }) => product)
  });
  const statusCounts = candidates.reduce((acc, { product }) => {
    const status = getSnapshotStatus(product);
    acc.total += 1;
    if (status.state === 'supported') acc.supported += 1;
    if (status.state === 'seeded') acc.seeded += 1;
    if (status.state === 'missing') acc.missing += 1;
    return acc;
  }, { total: 0, supported: 0, seeded: 0, missing: 0 });

  const items = candidates.map(({ product, score }, index) => {
    const status = getSnapshotStatus(product);
    const matchTokens = getSuggestionMatchTokens(query, product);
    return `
      <button type="button" class="candidateCard ${status.toneClass} ${index === 0 ? 'is-top' : ''}" data-candidate-id="${product.id}">
        <div class="candidateRank">候補 ${index + 1}</div>
        <div class="candidateTop">
          <div>
            <strong>${highlightMatchedText(product.name, matchTokens)}</strong>
            <div class="sub small">${highlightMatchedText(product.category, matchTokens)} / ${highlightMatchedText(product.series ?? '候補', matchTokens)}</div>
          </div>
          <div class="candidateScore">一致度 ${score}</div>
        </div>
        <div class="candidateMetaRow">
          <div class="candidatePriceBlock">
            <span class="candidatePrice">${escapeHtml(product.priceLabel ?? candidatePriceLabel(product))}</span>
            <span class="candidateFreshness">${escapeHtml(candidateFreshnessLabel(product))}</span>
          </div>
          <span class="candidateStatus ${status.toneClass}">${status.label}</span>
        </div>
        ${matchTokens.length ? `<div class="candidateMatchRow" aria-label="一致した検索語">${matchTokens.map((token) => `<span class="tag tagMatch">一致: ${escapeHtml(token)}</span>`).join('')}</div>` : ''}
        <div class="candidateHint">${status.badge} ・ ${status.note}</div>
        <div class="tagRow candidateTags">${renderSpecTags(product.specBadges ?? [])}</div>
        <div class="candidateActionRow">
          <span class="candidateActionText">この候補を開く</span>
          <span class="candidateActionMeta">${escapeHtml(product.priceLabel ?? candidatePriceLabel(product))}</span>
        </div>
      </button>
    `;
  }).join('');

  emptyState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  emptyState.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p><strong>候補 ${candidates.length}件。</strong> 同シリーズが複数見つかりました。容量・通信種別・世代に加えて、snapshot反映状況まで見比べて選べます。</p>
    <div class="tagRow" aria-label="候補の内訳">
      <span class="tag">候補 ${statusCounts.total}件</span>
      <span class="tag">snapshot反映 ${statusCounts.supported}件</span>
      <span class="tag">SKU追加済み ${statusCounts.seeded}件</span>
      <span class="tag">未対応 ${statusCounts.missing}件</span>
    </div>
    ${refinePresets.length ? `
      <div class="stack" aria-label="候補を絞るヒント">
        <p class="sub small">このまま1タップで絞る:</p>
        <div class="quickChips">
          ${refinePresets.map((preset) => `<button class="chip chipSubtle" type="button" data-preset="${escapeHtml(preset.query)}">${escapeHtml(preset.label)}</button>`).join('')}
        </div>
      </div>
    ` : ''}
    ${buildRefineSearchActions()}
    ${primaryCategoryShortcut}
    <div class="candidateLegend">
      <span class="candidateLegendItem is-supported">snapshot反映あり</span>
      <span class="candidateLegendItem is-seeded">SKU追加済み / 比較データ薄め</span>
      <span class="candidateLegendItem is-unsupported">snapshot未対応</span>
    </div>
    <div class="candidateList">${items}</div>
  `;

  emptyState.querySelectorAll('[data-candidate-id]').forEach((btn) => {
    bindAsyncButtonAction(btn, async () => {
      try {
        const product = await fetchProductById(btn.dataset.candidateId);
        if (product) renderProduct(product, { historyMode: 'push' });
      } catch {
        emptyState.innerHTML = '<h2>商品詳細を取得できない</h2><p>時間をおいて再試行してください。</p>';
      }
    });
  });
  bindPresetButtons(emptyState);
  bindRefineSearchActions(emptyState);
  bindLinearKeyboardNavigation(emptyState, '[data-candidate-id]');
  bindLinearKeyboardNavigation(emptyState, '[data-preset]', { axis: 'horizontal' });

  scrollToResults(emptyState);
  focusRegion(emptyState);
}

function getRecommendedGuideTag({ trend, upsideValue, bestRecommendation } = {}) {
  if (trend?.toneClass === 'is-down') return '売り時';
  if (Number.isFinite(upsideValue) && upsideValue >= 5000) return '高く売るコツ';
  if (bestRecommendation?.reason) return '販路比較';
  return '販路比較';
}

function buildRelatedGuideCtaLabel(tag = '') {
  if (tag === '販路比較') return '販路比較を見る';
  if (tag === '高く売るコツ') return '高く売るコツを見る';
  if (tag === '売り時') return '売り時の見方を見る';
  if (tag === 'FAQ') return 'FAQを見る';
  return 'ガイドを見る';
}

function buildRelatedGuidePreviewLabel(tag) {
  if (tag === '販路比較') return 'まず見る: 買取店とフリマの差';
  if (tag === '高く売るコツ') return 'まず見る: 減額されやすい準備項目';
  if (tag === '売り時') return 'まず見る: 値下がり前に動く目安';
  if (tag === 'FAQ') return 'まず見る: 初期化と付属品の確認';
  return 'まず見る: 売る前に確認したいポイント';
}

function buildRelatedGuideOutcomeLabel(tag) {
  if (tag === '販路比較') return '読み終わると: 向いている売り方を決めやすい';
  if (tag === '高く売るコツ') return '読み終わると: 先に整える準備の順番が見える';
  if (tag === '売り時') return '読み終わると: 今動くか待つか判断しやすい';
  if (tag === 'FAQ') return '読み終わると: 売る前の不安をまとめて減らしやすい';
  return '読み終わると: 次に確認するポイントを決めやすい';
}

function buildRelatedGuideWhenLabel(tag) {
  if (tag === '販路比較') return 'こんなとき: 手取りと手間のどちらを優先するか迷うとき';
  if (tag === '高く売るコツ') return 'こんなとき: 少しでも減額を避けて上積みを狙いたいとき';
  if (tag === '売り時') return 'こんなとき: 今売るか、少し待つか判断を急ぎたいとき';
  if (tag === 'FAQ') return 'こんなとき: 初期化や付属品など売る前の不安を先に消したいとき';
  return 'こんなとき: 次に何から確認するか迷うとき';
}

function buildRelatedGuideEffortLabel(tag) {
  if (tag === '販路比較') return '約4分 ・ 全9項目';
  if (tag === '高く売るコツ') return '約3分 ・ 全9項目';
  if (tag === '売り時') return '約3分 ・ 全9項目';
  if (tag === 'FAQ') return '約2分 ・ 全9項目';
  return '約3分 ・ 全9項目';
}

function buildRelatedGuideLinks(product, { recommendedTag = '' } = {}) {
  const guideMap = [
    { suffix: 'where-to-sell', tag: '販路比較', title: 'どこで売るべきか', note: '買取店・フリマ・オークションの向き不向きを確認。' },
    { suffix: 'high-price-tips', tag: '高く売るコツ', title: '高く売るポイント', note: '査定差がつきやすい準備項目を先に確認。' },
    { suffix: 'timing', tag: '売り時', title: '売るタイミング', note: '値下がり前に動く目安を短くチェック。' },
    { suffix: 'faq', tag: 'FAQ', title: '売却FAQ', note: 'よくある不安や疑問をまとめて確認。' }
  ];

  return guideMap
    .map((guide, index) => ({
      href: `./articles/${product.id}-${guide.suffix}.html`,
      tag: guide.tag,
      label: `${product.name} ${guide.title}`,
      note: guide.note,
      effortLabel: buildRelatedGuideEffortLabel(guide.tag),
      previewLabel: buildRelatedGuidePreviewLabel(guide.tag),
      whenLabel: buildRelatedGuideWhenLabel(guide.tag),
      outcomeLabel: buildRelatedGuideOutcomeLabel(guide.tag),
      ctaLabel: buildRelatedGuideCtaLabel(guide.tag),
      isRecommended: guide.tag === recommendedTag,
      sortWeight: guide.tag === recommendedTag ? -1 : index
    }))
    .sort((left, right) => left.sortWeight - right.sortWeight);
}

function buildActionChecklist(product) {
  if (!product?.id || !product?.name) return [];

  const articleBase = `./articles/${product.id}`;

  return [
    {
      title: '売る前の全体チェックを先に確認',
      detail: '初期化・付属品・相場確認まで、抜けやすい順番をまとめて見直せます。',
      href: `${articleBase}-checklist.html`,
      cta: 'チェック手順を見る'
    },
    {
      title: '傷・使用感でどこが見られるか確認',
      detail: '減額されやすいポイントを先に把握して、写真や説明文のズレを減らします。',
      href: `${articleBase}-condition.html`,
      cta: '状態チェックを見る'
    },
    {
      title: '箱やケーブルなど付属品の影響を確認',
      detail: '残っている付属品を洗い出して、査定や出品文で拾い漏れを防ぎます。',
      href: `${articleBase}-accessories.html`,
      cta: '付属品の見方を見る'
    },
    {
      title: '型番・容量・仕様の書き方を確認',
      detail: '商品情報の読み違いを防いで、検索ズレや説明ミスを起こしにくくします。',
      href: `${articleBase}-data-reading.html`,
      cta: '型番の確認方法を見る'
    },
    {
      title: '最後に販路を決める',
      detail: '準備ができたら、買取店・フリマ・オークションの向き不向きを比較して出し先を決めます。',
      href: `${articleBase}-where-to-sell.html`,
      cta: '販路比較を見る'
    }
  ];
}

function buildRelatedProductFocusLabel(product, candidate, { sameSeries = false } = {}) {
  const currentBadges = new Set((product?.specBadges ?? []).map((badge) => String(badge).trim()).filter(Boolean));
  const candidateBadges = Array.from(new Set((candidate?.specBadges ?? []).map((badge) => String(badge).trim()).filter(Boolean)));
  const differingBadges = candidateBadges.filter((badge) => !currentBadges.has(badge)).slice(0, 2);

  if (sameSeries && differingBadges.length) {
    return `違い: ${differingBadges.join(' / ')}`;
  }

  if (sameSeries) {
    return '見どころ: 同シリーズの価格差';
  }

  if (differingBadges.length) {
    return `見どころ: ${differingBadges.join(' / ')}`;
  }

  if (candidate?.series) {
    return `見どころ: ${candidate.series}との違い`;
  }

  return '見どころ: 近い機種の相場差';
}

function buildRelatedProductFitLabel(product, candidate, { sameSeries = false } = {}) {
  const category = String(candidate?.category ?? product?.category ?? '').trim();

  if (sameSeries) {
    return '向いている人: 容量違い・世代差で迷う人';
  }

  switch (category) {
    case 'スマホ':
      return '向いている人: 容量や世代の近い差を見たい人';
    case 'イヤホン':
      return '向いている人: ケース違い・付属品差が気になる人';
    case 'ゲーム':
      return '向いている人: 版違い・セット差を比べたい人';
    case 'タブレット':
      return '向いている人: 世代や通信方式で迷う人';
    case '腕時計':
      return '向いている人: サイズやGPS差を見たい人';
    case 'パソコン':
      return '向いている人: メモリやSSD差で迷う人';
    default:
      return '向いている人: 近い機種との差を見たい人';
  }
}

function buildRelatedProductLinks(product, limit = 6) {
  if (!product?.id || !products.length) return [];

  const normalizedSeries = normalizeSearchQuery(product.series ?? '').toLowerCase();
  const siblings = products
    .filter((candidate) => candidate?.id && candidate.id !== product.id)
    .map((candidate) => {
      const sameCategory = candidate.category === product.category;
      const sameSeries = normalizedSeries && normalizeSearchQuery(candidate.series ?? '').toLowerCase() === normalizedSeries;
      const sharedTokenCount = (product.searchTokens ?? [])
        .filter((token) => candidate.searchTokens?.includes(token))
        .length;

      let score = 0;
      if (sameCategory) score += 4;
      if (sameSeries) score += 6;
      score += Math.min(sharedTokenCount, 3);

      return { candidate, score, sameSeries };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, 'ja'))
    .slice(0, limit);

  return siblings.map(({ candidate, sameSeries }) => {
    const priceLabel = candidatePriceLabel(candidate);
    const trendLabel = candidateTrendSummary(candidate)?.label;
    const freshnessLabel = candidateFreshnessLabel(candidate);
    const confidenceLabel = confidenceSummary(getSnapshotStatus(candidate)?.snapshot).label;
    const bestMarketLabel = candidateBestMarketLabel(candidate);
    const focusLabel = buildRelatedProductFocusLabel(product, candidate, { sameSeries });
    const fitLabel = buildRelatedProductFitLabel(product, candidate, { sameSeries });
    const infoPills = [priceLabel, trendLabel, confidenceLabel, freshnessLabel, bestMarketLabel].filter(Boolean);

    return {
      href: buildProductHref(candidate),
      label: candidate.name,
      meta: [candidate.category, sameSeries ? '同シリーズ' : candidate.series].filter(Boolean).join(' / '),
      focusLabel,
      fitLabel,
      infoPills
    };
  });
}

function buildCategoryHubLink(product) {
  const categoryPage = getCategoryPageMeta(product);
  if (!categoryPage?.href || !categoryPage?.label) return null;

  const categoryProductCount = products.filter((candidate) => candidate.category === product.category).length;
  const countBadge = categoryProductCount ? `${categoryProductCount}モデル` : '';

  return {
    href: categoryPage.href,
    label: `${product.category}をまとめて見る`,
    meta: [categoryPage.label, categoryProductCount ? `同カテゴリ ${categoryProductCount}モデル掲載` : '同カテゴリの比較ページを一覧で探す']
      .filter(Boolean)
      .join(' / '),
    countBadge,
    isCategoryHub: true
  };
}

function buildReferenceLinks(product) {
  const query = encodeURIComponent(product.name);
  const model = product.searchTokens?.find((token) => /[a-z]{2,}\d|\//i.test(token)) ?? product.name;
  const modelQuery = encodeURIComponent(`${product.name} ${model}`.trim());

  return [
    {
      label: 'メルカリで最新出品を見る',
      href: `https://jp.mercari.com/search?keyword=${query}`,
      note: '取得が不安定なため、参考リンクとして最新出品を確認。'
    },
    {
      label: 'Yahooオークション検索で確認',
      href: `https://auctions.yahoo.co.jp/search/search?p=${query}`,
      note: '比較反映とは別に、現行出品や検索結果も確認できます。'
    },
    {
      label: 'ラクマ検索で確認',
      href: `https://fril.jp/s?query=${query}`,
      note: '補助ソースとして、現行出品の空気感を確認。'
    },
    {
      label: 'じゃんぱら検索で確認',
      href: `https://buy.janpara.co.jp/buy/search?keyword=${modelQuery}`,
      note: '公開買取価格の検索リンク。型番ベースで確認しやすいです。'
    }
  ];
}

function renderProduct(product, { historyMode = 'replace' } = {}) {
  currentProductId = product?.id ?? null;

  if (queryInput && product?.name) {
    queryInput.value = product.name;
    updateSearchControls();
  }

  updateProductUrl(product.id, { historyMode });
  saveRecentProduct(product);
  renderRecentProducts();
  updateCurrentProductLinkHighlights(product.id);
  const markets = computeMarkets(product);
  const globalMin = Math.min(...markets.map((m) => m.min));
  const globalMax = Math.max(...markets.map((m) => m.max));
  const status = getSnapshotStatus(product);
  const snapshot = status.snapshot;
  const checklistItems = buildActionChecklist(product);
  const referenceItems = buildReferenceLinks(product);
  updateProductMeta(product, status, snapshot);
  upsertStructuredData(buildProductStructuredData(product, status, snapshot));
  setSearchFeedback(`${status.badge} / ${status.note}`, { emphasis: product.name });

  productName.textContent = product.name;
  renderProductBreadcrumbs(product);
  productCategory.textContent = `${product.category} / ${product.series ?? 'ローカル拡張データ'} / ${status.badge}`;
  productSpecs.innerHTML = renderSpecTags(product.specBadges ?? []);
  const rangeLabel = snapshot?.suggested?.standard && status.isAvailable
    ? `標準 ${yen(snapshot.suggested.standard)}`
    : `${yen(globalMin)} 〜 ${yen(globalMax)}`;
  const dataDepthLabel = status.totalComparableCount > 0
    ? `比較 ${status.totalComparableCount}件`
    : (status.state === 'seeded' ? '比較 0件' : '比較データ未対応');
  priceRange.textContent = `${rangeLabel} / ${dataDepthLabel}`;
  priceRange.classList.remove('is-supported', 'is-seeded', 'is-unsupported');
  priceRange.classList.add(status.toneClass);
  renderSnapshotSummary(product);

  const bestMarketNet = markets.reduce((maxNet, market) => (
    Number.isFinite(market?.net) ? Math.max(maxNet, market.net) : maxNet
  ), Number.NEGATIVE_INFINITY);

  marketGrid.innerHTML = markets.map((m) => {
    const sourceTag = m.key === 'yahooShopping'
      ? (snapshot?.yahoo?.count ? `snapshot ${snapshot.yahoo.count}件反映` : status.state === 'seeded' ? '比較データなし / ローカル既定値' : 'snapshot未対応')
      : m.key === 'rakuma'
        ? (snapshot?.rakuma?.count ? `snapshot ${snapshot.rakuma.count}件反映` : status.state === 'seeded' ? '比較データなし / ローカル既定値' : 'snapshot未対応')
        : (snapshot?.janpara ? 'snapshot 1件反映' : status.state === 'seeded' ? '比較データなし / ローカル既定値' : 'snapshot未対応');
    const netGap = Number.isFinite(bestMarketNet) && Number.isFinite(m.net)
      ? Math.max(0, bestMarketNet - m.net)
      : null;
    const netGapLabel = !Number.isFinite(netGap)
      ? '比較差は算出中'
      : netGap === 0
        ? '手取りトップ候補'
        : `トップとの差 ${yen(netGap)}`;
    const netGapToneClass = !Number.isFinite(netGap)
      ? 'is-muted'
      : netGap === 0
        ? 'is-best'
        : netGap <= 3000
          ? 'is-close'
          : 'is-lower';

    return `
      <div class="marketCard ${sourceTag.includes('未対応') || sourceTag.includes('比較データなし') ? status.toneClass : ''}">
        <div class="marketTop">
          <div>
            <strong>${marketLabels[m.key] ?? m.key}</strong>
            <div class="marketMeta">掲載相場 ${yen(m.min)} 〜 ${yen(m.max)}</div>
          </div>
          <div class="net">手取り ${yen(m.net)}</div>
        </div>
        <div class="marketMeta">
          <span>${marketSourceLabels[m.key] ?? '参考価格'}</span>
          <span>${sourceTag}</span>
          <span>平均想定価格 ${yen(m.avg)}</span>
          <span>手数料 ${yen(m.fee)}</span>
          <span>送料 ${yen(m.shipping)}</span>
        </div>
        <div class="tagRow">
          <span class="tag tagMarketDelta ${netGapToneClass}">${netGapLabel}</span>
          <span class="tag">${speedLabels[m.speed]}</span>
          <span class="tag">${effortLabels[m.effort]}</span>
        </div>
      </div>
    `;
  }).join('');

  const rankedRecommendations = rankRecommendations(markets);
  const suggestedPrices = snapshot?.suggested && status.isAvailable
    ? [
        { label: '早売れ価格', value: snapshot.suggested.quickSale, note: 'snapshotの即売り寄り提案' },
        { label: '標準価格', value: snapshot.suggested.standard, note: 'Yahoo落札中央値ベース' },
        { label: '強気価格', value: snapshot.suggested.aggressive, note: '上位四分位を意識した提案' }
      ]
    : priceSuggestions(markets).map((p) => ({ ...p, note: `${p.note} / ${status.state === 'seeded' ? 'SKU追加済みだが比較件数は未反映' : 'ローカルSKU辞書ベース'}` }));
  const bestRecommendation = rankedRecommendations.find((item) => item.title === '高く売りたい') ?? null;
  const quickSaleValue = suggestedPrices.find((item) => item.label === '早売れ価格')?.value ?? snapshot?.suggested?.quickSale ?? null;
  const standardValue = suggestedPrices.find((item) => item.label === '標準価格')?.value ?? snapshot?.suggested?.standard ?? null;
  const aggressiveValue = suggestedPrices.find((item) => item.label === '強気価格')?.value ?? snapshot?.suggested?.aggressive ?? null;
  const upsideValue = Number.isFinite(aggressiveValue) && Number.isFinite(quickSaleValue)
    ? Math.max(0, aggressiveValue - quickSaleValue)
    : null;
  const trend = buildTrendSummary(snapshotHistoryMap.get(product?.id) ?? [], snapshot);
  const recommendedGuideTag = getRecommendedGuideTag({ trend, upsideValue, bestRecommendation });
  const relatedGuideItems = buildRelatedGuideLinks(product, { recommendedTag: recommendedGuideTag });

  recommendations.innerHTML = rankedRecommendations.map((r) => {
    const recommendationGuide = r.title === '高く売りたい'
      ? relatedGuideItems.find((item) => item.tag === '高く売るコツ')
      : r.title === '早く売りたい'
        ? relatedGuideItems.find((item) => item.tag === '販路比較')
        : relatedGuideItems.find((item) => item.tag === 'FAQ') ?? relatedGuideItems[0];

    return `
      <div class="recommendCard ${status.toneClass}">
        <strong>${r.title}</strong>
        <div>${marketLabels[r.market.key] ?? r.market.key}</div>
        <p class="sub small">${r.reason}</p>
        ${recommendationGuide ? `<a class="recommendAction" href="${escapeHtml(recommendationGuide.href)}">${escapeHtml(recommendationGuide.tag)}を先に見る</a>` : ''}
      </div>
    `;
  }).join('');

  priceCards.innerHTML = suggestedPrices.map((p) => {
    const formattedValue = yen(p.value);
    const hasStandardBaseline = Number.isFinite(standardValue) && Number.isFinite(p.value);
    const deltaFromStandard = hasStandardBaseline ? p.value - standardValue : null;
    const deltaToneClass = deltaFromStandard === null || deltaFromStandard === 0
      ? 'is-neutral'
      : deltaFromStandard > 0
        ? 'is-up'
        : 'is-down';
    const deltaLabel = deltaFromStandard === null
      ? ''
      : deltaFromStandard === 0
        ? '標準価格と同じ'
        : `標準より${deltaFromStandard > 0 ? '+' : ''}${yen(deltaFromStandard)}`;

    return `
    <div class="priceCard ${status.isAvailable ? '' : status.toneClass}">
      <div class="priceCardTop">
        <div class="priceCardHeading">
          <strong>${p.label}</strong>
          ${deltaLabel ? `<span class="priceDeltaTag ${deltaToneClass}">${escapeHtml(deltaLabel)}</span>` : ''}
        </div>
        <button
          class="priceCopyButton"
          type="button"
          data-copy-price-label="${escapeHtml(p.label)}"
          data-copy-price-value="${escapeHtml(formattedValue)}"
          data-default-label="価格をコピー"
          aria-label="${escapeHtml(`${p.label} ${formattedValue} をコピー`)}"
        >価格をコピー</button>
      </div>
      <div class="net">${formattedValue}</div>
      <p class="sub small">${p.note}</p>
    </div>
  `;
  }).join('');

  summarizeHero(product, markets, suggestedPrices, snapshot, rankedRecommendations);

  const uniqueTitleKeywords = getUniqueNormalizedValues(product.titleKeywords ?? []);
  const uniqueDescriptionHints = getUniqueNormalizedValues(product.descriptionHints ?? []);
  const generatedTitleDraft = [product.name, ...uniqueTitleKeywords].filter(Boolean).join(' ').trim();
  const generatedDescriptionDraft = `${product.name} の出品用たたき台です。\n\n【状態】\n・動作確認済み\n・大きな不具合なし\n・状態は写真でご確認ください\n\n【補足】\n${uniqueDescriptionHints.map((hint) => `・${hint}`).join('\n')}\n\n【発送】\n・丁寧に梱包して発送します\n・中古品のため細かな状態差はご了承ください`;
  let generatedListingNoteDraft = '';

  titleOutput.value = generatedTitleDraft;
  descriptionOutput.value = generatedDescriptionDraft;
  if (listingNoteOutput) {
    const bestRecommendationText = bestRecommendation?.market
      ? `${marketLabels[bestRecommendation.market.key] ?? 'おすすめ販路'}（想定手取り ${yen(bestRecommendation.market.net)}）`
      : '比較中';
    const quickSaleText = quickSaleValue ? yen(quickSaleValue) : '—';
    const standardPriceText = standardValue ? yen(standardValue) : '—';
    const aggressivePriceText = aggressiveValue ? yen(aggressiveValue) : '—';
    const trendLabel = trend?.label ?? '価格横ばい';
    const snapshotFreshnessLabel = formatRelativeDateLabel(snapshot?.snapshotAt);
    const snapshotDateLabel = formatSnapshotDate(snapshot?.snapshotAt);
    const snapshotNote = snapshotFreshnessLabel
      ? `${snapshotDateLabel}（${snapshotFreshnessLabel}）`
      : snapshotDateLabel;

    generatedListingNoteDraft = [
      `商品: ${product.name}`,
      `標準相場: ${standardPriceText}`,
      `すぐ売る目安: ${quickSaleText}`,
      `強気価格: ${aggressivePriceText}`,
      `おすすめ販路: ${bestRecommendationText}`,
      `相場トレンド: ${trendLabel}`,
      `相場更新: ${snapshotNote}`,
      `売る前メモ: ${uniqueDescriptionHints.slice(0, 2).join(' / ') || '状態と付属品を確認'}`
    ].join('\n');
    listingNoteOutput.value = generatedListingNoteDraft;
  }
  setGeneratedListingDrafts({
    title: generatedTitleDraft,
    description: generatedDescriptionDraft,
    listingNote: generatedListingNoteDraft
  });
  restoreSavedListingDraft(product.id);
  updateListingCopyMeta();

  checklist.innerHTML = checklistItems.map((item) => `
    <li class="actionChecklistItem">
      <a class="actionChecklistLink" href="${escapeHtml(item.href)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="sub small">${escapeHtml(item.detail)}</span>
        <span class="actionChecklistCta">${escapeHtml(item.cta)}</span>
      </a>
    </li>
  `).join('');

  relatedGuideLinks.innerHTML = relatedGuideItems.map((item) => `
    <a class="guideCard guideCardActionable ${item.isRecommended ? 'is-recommended' : ''}" href="${escapeHtml(item.href)}">
      <div class="guideCardTop">
        <span class="guideTag">${escapeHtml(item.tag)}</span>
        ${item.isRecommended ? '<span class="guidePriorityBadge">まずこれ</span>' : ''}
      </div>
      <strong>${escapeHtml(item.label)}</strong>
      <span class="sub small">${escapeHtml(item.note)}</span>
      <span class="guideCardEffort">${escapeHtml(item.effortLabel)}</span>
      <span class="guideCardPreview">${escapeHtml(item.previewLabel)}</span>
      <span class="guideCardWhen">${escapeHtml(item.whenLabel)}</span>
      <span class="guideCardOutcome">${escapeHtml(item.outcomeLabel)}</span>
      <span class="guideCardCta">${escapeHtml(item.ctaLabel)}</span>
    </a>
  `).join('');

  const siblingLinks = buildRelatedProductLinks(product);
  const categoryHubLink = buildCategoryHubLink(product);
  const browseLinks = [
    ...(categoryHubLink ? [categoryHubLink] : []),
    ...siblingLinks
  ];

  relatedProductLinks.innerHTML = browseLinks.length
    ? browseLinks.map((item) => {
      const actionLabel = item.isCategoryHub ? 'カテゴリ一覧を見る' : 'この比較を見る';
      const infoPills = Array.isArray(item.infoPills) ? item.infoPills.filter(Boolean) : [];
      const cardTitle = [item.label, item.meta, item.focusLabel, item.fitLabel, infoPills.join(' / '), actionLabel].filter(Boolean).join(' / ');

      return `
      <a class="relatedProductCard ${item.isCategoryHub ? 'is-category-hub' : ''}" href="${escapeHtml(item.href)}" title="${escapeHtml(cardTitle)}" aria-label="${escapeHtml(cardTitle)}">
        <strong>
          <span>${escapeHtml(item.label)}</span>
          ${item.countBadge ? `<span class="relatedProductBadge">${escapeHtml(item.countBadge)}</span>` : ''}
        </strong>
        ${item.meta ? `<span class="relatedProductMeta">${escapeHtml(item.meta)}</span>` : ''}
        ${item.focusLabel ? `<span class="relatedProductFocus">${escapeHtml(item.focusLabel)}</span>` : ''}
        ${item.fitLabel ? `<span class="relatedProductFit">${escapeHtml(item.fitLabel)}</span>` : ''}
        ${infoPills.length ? `<span class="relatedProductInfoRow" aria-label="関連ページの比較ヒント">${infoPills.map((pill) => `<span class="relatedProductInfoPill">${escapeHtml(pill)}</span>`).join('')}</span>` : ''}
        <span class="relatedProductAction">${escapeHtml(actionLabel)}</span>
      </a>
    `;
    }).join('')
    : '<span class="sub small">近い比較ページは準備中です。</span>';

  referenceLinks.innerHTML = referenceItems.map((item) => {
    const sourceLabel = getExternalSourceLabel(item.href);

    return `
    <a class="referenceCard" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${item.label}（外部サイトを新しいタブで開く）`)}">
      <strong class="referenceCardTitle">
        <span>${escapeHtml(item.label)} <span class="referenceExternalHint" aria-hidden="true">↗</span></span>
        ${sourceLabel ? `<span class="referenceSourceTag">${escapeHtml(sourceLabel)}</span>` : ''}
      </strong>
      <p class="sub small">${escapeHtml(item.note)} / 外部サイトを新しいタブで開きます。</p>
    </a>
  `;
  }).join('');

  refreshResultJumpCounts();

  emptyState.classList.add('hidden');
  resultSection.classList.remove('hidden');
  searchStatus.classList.add('hidden');

  syncResultJumpLinkStateFromHash();

  if (getHashTarget()) {
    focusHashTarget();
  } else {
    scrollToResults(resultSection);
    focusHeroSummary();
  }
}

function renderEmptyQueryState() {
  currentProductId = null;
  titleOutput.value = '';
  descriptionOutput.value = '';
  if (listingNoteOutput) listingNoteOutput.value = '';
  setGeneratedListingDrafts();
  updateListingCopyMeta();
  updateSearchState();
  resetPageMeta();
  upsertStructuredData(null);
  updateCurrentProductLinkHighlights(null);
  setSearchFeedback('商品名・型番・容量を入れると比較しやすくなります。', { emphasis: '検索準備OK' });
  emptyState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  emptyState.innerHTML = `
    <h2>商品名を入れてから検索</h2>
    <p>型番・容量・世代まで入れると、候補の絞り込みがかなり楽です。よく使う例からそのまま試せます。</p>
    ${buildRefineSearchActions({ includeClear: true })}
    <div class="quickChips" aria-label="検索例">
      <button class="chip" type="button" data-preset="iPhone 14 128GB">iPhone 14 128GB</button>
      <button class="chip" type="button" data-preset="AirPods Pro 第2世代 USB-C">AirPods Pro 第2世代 USB-C</button>
      <button class="chip" type="button" data-preset="Nintendo Switch 有機ELモデル ネオン">Switch 有機EL ネオン</button>
      <button class="chip" type="button" data-preset="iPad Air 第5世代 64GB Wi‑Fi">iPad Air 5 64GB</button>
    </div>
    <p class="sub small">例: iPhone 13 128GB / Apple Watch SE 第2世代 44mm / PS5 Slim デジタル</p>
  `;
  bindPresetButtons(emptyState);
  bindRefineSearchActions(emptyState);
  scrollToResults(emptyState);
  focusRegion(emptyState);
}

function tokenizeQuery(value = '') {
  return normalizeSearchMatchText(value)
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 || /^\d+$/.test(token));
}

function scoreLocalProductMatches(query) {
  const normalizedQuery = normalizeSearchMatchText(query);
  const tokens = tokenizeQuery(query);
  if (!tokens.length || !products.length) return [];

  return products.map((product) => {
    const normalizedName = normalizeSearchMatchText(product.name ?? '');
    const haystack = normalizeSearchMatchText([
      product.name,
      product.category,
      product.series,
      ...(product.searchTokens ?? []),
      ...(product.specBadges ?? [])
    ]
      .filter(Boolean)
      .join(' '));

    let score = 0;
    for (const token of tokens) {
      const isShortNumericToken = token.length === 1 && /^\d+$/.test(token);
      if (haystack.includes(token)) score += isShortNumericToken ? 1 : (token.length >= 4 ? 3 : 2);
      if (normalizedName.includes(token)) score += isShortNumericToken ? 1 : 2;
    }

    if (normalizedName.includes(normalizedQuery)) {
      score += 4;
    }

    return { product, score };
  });
}

function countLocalProductMatches(query) {
  return scoreLocalProductMatches(query).filter((entry) => entry.score > 0).length;
}

function buildLocalProductSuggestions(query, limit = 3) {
  return scoreLocalProductMatches(query)
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ja'))
    .slice(0, limit)
    .map((entry) => entry.product);
}

function buildLocalSearchFallback(query, limit = 5) {
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase();
  const ranked = scoreLocalProductMatches(query)
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ja'));

  if (!ranked.length) {
    return {
      best: null,
      ambiguous: false,
      candidates: []
    };
  }

  const candidates = ranked.slice(0, limit);
  const [topCandidate, secondCandidate] = candidates;
  const topNormalizedName = normalizeSearchQuery(topCandidate.product?.name ?? '').toLowerCase();
  const isExactNameMatch = topNormalizedName === normalizedQuery;
  const isClearlyAhead = !secondCandidate || topCandidate.score - secondCandidate.score >= 3;
  const shouldAutoSelect = isExactNameMatch || (topCandidate.score >= 8 && isClearlyAhead);

  return {
    best: shouldAutoSelect ? topCandidate : null,
    ambiguous: !shouldAutoSelect && candidates.length > 1,
    candidates
  };
}

function getSuggestionMatchTokens(query, product, limit = 3) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length || !product) return [];

  const sources = [
    product.name,
    product.category,
    product.series,
    ...(product.searchTokens ?? []),
    ...(product.specBadges ?? [])
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase().normalize('NFKC'));

  const matched = [];
  for (const token of tokens) {
    if (matched.includes(token)) continue;
    if (sources.some((value) => value.includes(token))) {
      matched.push(token);
    }
    if (matched.length >= limit) break;
  }

  return matched;
}

function extractSuggestionRefiners(product) {
  const pattern = /(?:64|128|256|512)GB|1TB|第\s?\d+世代|\d+世代|Wi-?Fi|Cellular|GPS(?:\s*\+\s*Cellular)?|\d{2}mm|ブラック|ホワイト|レッド|ブルー|グリーン|パープル|イエロー|ピンク|ネオン|グレー|スターライト|ミッドナイト|スペースグレイ|シルバー|USB-C|Lightning|有機EL|デジタル|通常版/giu;
  const text = [
    product?.name,
    ...(product?.specBadges ?? []),
    ...(product?.searchTokens ?? [])
  ]
    .filter(Boolean)
    .join(' ');

  return Array.from(new Set(Array.from(text.matchAll(pattern), (match) => normalizeSearchQuery(match[0]))));
}

function buildSuggestionRefinePresets(candidates, query, limit = 6) {
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase();
  if (!normalizedQuery) return [];

  const scored = new Map();

  candidates.forEach(({ product }) => {
    extractSuggestionRefiners(product).forEach((token) => {
      const normalizedToken = normalizeSearchQuery(token);
      if (!normalizedToken) return;
      if (normalizedQuery.includes(normalizedToken.toLowerCase())) return;

      const entry = scored.get(normalizedToken) ?? { token: normalizedToken, count: 0 };
      entry.count += 1;
      scored.set(normalizedToken, entry);
    });
  });

  return Array.from(scored.values())
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token, 'ja'))
    .slice(0, limit)
    .map(({ token }) => ({
      label: token,
      query: normalizeSearchQuery(`${query} ${token}`)
    }));
}

function buildNoResultPresets(query) {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const compact = normalized.toLowerCase();

  if (/iphone|pixel|galaxy|xperia|スマホ/.test(compact)) {
    return {
      title: 'スマホ系で近い探し方',
      presets: ['iPhone 14 128GB', 'iPhone 13 256GB', 'Pixel 8 128GB'],
      categoryLinks: [
        { href: './categories/smartphone.html', label: 'スマホカテゴリを見る' },
        { href: './articles/index.html', label: 'スマホ売却ガイドを見る' }
      ]
    };
  }

  if (/airpods|buds|ear|イヤホン|headphone|ヘッドホン/.test(compact)) {
    return {
      title: 'イヤホン系で近い探し方',
      presets: ['AirPods Pro 第2世代 USB-C', 'AirPods 第3世代 Lightning', 'WF-1000XM5'],
      categoryLinks: [
        { href: './categories/earphone.html', label: 'イヤホンカテゴリを見る' },
        { href: './articles/index.html', label: 'アクセサリ売却ガイドを見る' }
      ]
    };
  }

  if (/switch|ps5|playstation|xbox|ゲーム/.test(compact)) {
    return {
      title: 'ゲーム機系で近い探し方',
      presets: ['Nintendo Switch 有機ELモデル ネオン', 'PS5 Slim デジタル', 'Nintendo Switch Lite グレー'],
      categoryLinks: [
        { href: './categories/game.html', label: 'ゲームカテゴリを見る' },
        { href: './articles/index.html', label: 'ゲーム売却ガイドを見る' }
      ]
    };
  }

  if (/ipad|tablet|タブレット/.test(compact)) {
    return {
      title: 'タブレット系で近い探し方',
      presets: ['iPad Air 第5世代 64GB Wi‑Fi', 'iPad 第10世代 64GB Wi‑Fi', 'iPad mini 第6世代 64GB'],
      categoryLinks: [
        { href: './categories/tablet.html', label: 'タブレットカテゴリを見る' },
        { href: './articles/index.html', label: 'iPad売却ガイドを見る' }
      ]
    };
  }

  if (/apple watch|watch|smart ?watch|スマートウォッチ|腕時計/.test(compact)) {
    return {
      title: 'スマートウォッチ系で近い探し方',
      presets: ['Apple Watch Series 9 41mm GPS', 'Apple Watch SE 第2世代 44mm GPS', 'Apple Watch Ultra 2'],
      categoryLinks: [
        { href: './categories/watch.html', label: 'スマートウォッチカテゴリを見る' },
        { href: './articles/index.html', label: 'Apple Watch売却ガイドを見る' }
      ]
    };
  }

  if (/macbook|mac mini|imac|surface|laptop|notebook|pc|パソコン|ノートpc|ノートパソコン|ゲーミングpc/.test(compact)) {
    return {
      title: 'PC系で近い探し方',
      presets: ['MacBook Air 13インチ M2 8GB 256GB', 'MacBook Pro 14インチ M3 8GB 512GB', 'Surface Laptop 5 13.5インチ i5 8GB 512GB'],
      categoryLinks: [
        { href: './categories/computer.html', label: 'PCカテゴリを見る' },
        { href: './articles/index.html', label: 'PC売却ガイドを見る' }
      ]
    };
  }

  return {
    title: '検索例から近いものを試す',
    presets: ['iPhone 14 128GB', 'AirPods Pro 第2世代 USB-C', 'Nintendo Switch 有機ELモデル ネオン'],
    categoryLinks: [
      { href: './categories/smartphone.html', label: 'スマホカテゴリを見る' },
      { href: './articles/index.html', label: '売却ガイド記事一覧を見る' }
    ]
  };
}

function renderNoResultState(query) {
  currentProductId = null;
  const suggestionSet = buildNoResultPresets(query);
  const localSuggestions = buildLocalProductSuggestions(query, 3);
  updateSearchState({ query });
  updateCurrentProductLinkHighlights(null);
  upsertStructuredData(buildNoResultStructuredData(query, localSuggestions));
  const currentUrl = getDocumentUrl();
  updatePageMeta({
    title: `「${query}」の買取相場候補を探す | 買取比較.net`,
    description: `「${query}」に近い買取相場候補や人気カテゴリへの導線を表示しています。型番・容量・世代を足して再検索すると見つかりやすくなります。`,
    canonical: currentUrl,
    ogTitle: `「${query}」の買取相場候補を探す | 買取比較.net`,
    ogDescription: `「${query}」に近い買取相場候補や人気カテゴリへの導線を表示しています。`,
    ogUrl: currentUrl,
    robots: 'noindex,follow'
  });
  const primaryCategoryShortcut = getPrimaryCategoryShortcut({
    href: suggestionSet.categoryLinks[0]?.href,
    topItems: localSuggestions
  });

  setSearchFeedback('候補がまだ見つかりません。型番・容量・世代を足すと見つかりやすくなります。', { emphasis: `「${query}」` });
  emptyState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  emptyState.innerHTML = `
    <h2>「${escapeHtml(query)}」の候補はまだありません</h2>
    <p>${escapeHtml(suggestionSet.title)}。型番・容量・世代まで足すと見つかりやすくなります。</p>
    ${buildRefineSearchActions({ includeClear: true })}
    ${localSuggestions.length ? `
      <div class="candidateList" aria-label="近い商品候補">
        ${localSuggestions.map((product, index) => {
          const status = getSnapshotStatus(product);
          const matchTokens = getSuggestionMatchTokens(query, product);
          return `
            <button class="candidateCard ${status.toneClass} ${index === 0 ? 'is-top' : ''}" type="button" data-candidate-id="${escapeHtml(product.id)}">
              <div class="candidateTopRow">
                <strong>${highlightMatchedText(product.name, matchTokens)}</strong>
                <div class="candidatePriceBlock candidatePriceBlockInline">
                  <span class="pill ${status.toneClass}">${candidatePriceLabel(product)}</span>
                  <span class="candidateFreshness">${escapeHtml(candidateFreshnessLabel(product))}</span>
                </div>
              </div>
              <div class="sub small">${highlightMatchedText(product.category, matchTokens)} / ${highlightMatchedText(product.series ?? '候補', matchTokens)}</div>
              ${matchTokens.length ? `<div class="candidateMatchRow" aria-label="一致した検索語">${matchTokens.map((token) => `<span class="tag tagMatch">一致: ${escapeHtml(token)}</span>`).join('')}</div>` : ''}
              <div class="candidateHint">${status.badge} ・ ${status.note}</div>
              <div class="tagRow candidateTags">${renderSpecTags(product.specBadges ?? [])}</div>
              <div class="candidateActionRow">
                <span class="candidateActionText">この候補を開く</span>
                <span class="candidateActionMeta">${escapeHtml(product.priceLabel ?? candidatePriceLabel(product))}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
      <p class="sub small">近い語を含むローカル商品を候補として出しています。これに近い型番なら、そのまま開けます。</p>
    ` : ''}
    <div class="quickChips" aria-label="近い検索候補">
      ${suggestionSet.presets.map((preset) => `<button class="chip" type="button" data-preset="${escapeHtml(preset)}">${escapeHtml(preset)}</button>`).join('')}
    </div>
    ${primaryCategoryShortcut}
    <div class="categorySeoLinks">
      ${suggestionSet.categoryLinks.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}
    </div>
    <p class="sub small">検索のコツ: 商品名 + 容量 / カラー / 世代 / 型番 まで入れると候補が安定します。</p>
  `;
  bindPresetButtons(emptyState);
  bindRefineSearchActions(emptyState);
  bindLinearKeyboardNavigation(emptyState, '[data-preset]', { axis: 'horizontal' });
  emptyState.querySelectorAll('[data-candidate-id]').forEach((btn) => {
    bindAsyncButtonAction(btn, async () => {
      try {
        const product = await fetchProductById(btn.dataset.candidateId);
        if (product) renderProduct(product, { historyMode: 'push' });
      } catch {
        emptyState.innerHTML = '<h2>商品詳細を取得できない</h2><p>時間をおいて再試行してください。</p>';
      }
    });
  });
  bindLinearKeyboardNavigation(emptyState, '[data-candidate-id]');
  scrollToResults(emptyState);
  focusRegion(emptyState);
}

async function runSearch() {
  if (isSearchLoading) return;

  const query = syncNormalizedQueryValue();

  updateSearchState({ query: query || null });

  if (!productsLoaded) {
    emptyState.classList.remove('hidden');
    resultSection.classList.add('hidden');
    emptyState.innerHTML = '<h2>読み込み中</h2><p>数秒待ってからもう一度試してください。</p>';
    return;
  }

  if (!query) {
    renderEmptyQueryState();
    return;
  }

  queryInput.value = query;
  setSearchLoading(true);
  emptyState.classList.remove('hidden');
  resultSection.classList.add('hidden');
  emptyState.innerHTML = '<h2>相場を確認中</h2><p>売れそうな価格とおすすめ販路をまとめています。</p>';
  scrollToResults(emptyState);

  try {
    const result = await fetchJson(`./api/search?q=${encodeURIComponent(query)}&limit=5`);

    if (!result.best) {
      if (result.candidates.length > 0) {
        setSearchLoading(false);
        renderSuggestions(result.candidates, '候補一覧', query);
        return;
      }

      setSearchLoading(false);
      renderNoResultState(query);
      return;
    }

    if (result.ambiguous) {
      setSearchLoading(false);
      renderSuggestions(result.candidates.slice(0, 5), '候補が複数あります', query);
      return;
    }

    const fullProduct = await fetchProductById(result.best.product.id);
    setSearchLoading(false);
    renderProduct(fullProduct);
  } catch {
    const localFallback = buildLocalSearchFallback(query);

    if (!localFallback.best) {
      setSearchLoading(false);

      if (localFallback.candidates.length > 0) {
        renderSuggestions(localFallback.candidates, '候補一覧（ローカル候補）', query);
        setSearchFeedback('検索APIに接続できなかったため、ローカル候補から近い商品を出しています。', { emphasis: 'フォールバック表示' });
        return;
      }

      renderNoResultState(query);
      setSearchFeedback('検索APIに接続できなかったため、ローカル候補だけで探しました。型番・容量を足すと見つかりやすくなります。', { emphasis: 'フォールバック表示' });
      return;
    }

    try {
      const fullProduct = await fetchProductById(localFallback.best.product.id);
      setSearchLoading(false);
      renderProduct(fullProduct);
      setSearchFeedback('検索APIに接続できなかったため、ローカル候補から近い商品を開いています。', { emphasis: 'フォールバック表示' });
    } catch {
      updateSearchState({ query });
      setSearchLoading(false);
      emptyState.classList.remove('hidden');
      resultSection.classList.add('hidden');
      emptyState.innerHTML = '<h2>検索APIに接続できない</h2><p>時間をおいて再読み込みしてください。</p>';
    }
  }
}

searchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (isQueryComposing) return;
  runSearch();
});
clearSearchBtn?.addEventListener('click', resetSearch);
queryInput.addEventListener('input', () => {
  const query = syncNormalizedQueryValue();
  updateSearchControls();
  renderQuerySuggestions(query);
  updateSearchDraftHint();
});
queryInput.addEventListener('compositionstart', () => {
  isQueryComposing = true;
});
queryInput.addEventListener('compositionend', () => {
  isQueryComposing = false;
  const query = syncNormalizedQueryValue();
  updateSearchControls();
  renderQuerySuggestions(query);
  updateSearchDraftHint();
});
queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    const discoveryTarget = getFirstSearchDiscoveryTarget();
    if (discoveryTarget) {
      e.preventDefault();
      discoveryTarget.focus();
      announceStatus('人気の比較ページへ移動しました');
    }
    return;
  }

  if (e.key === 'Escape' && queryInput.value.trim()) {
    e.preventDefault();
    resetSearch();
  }
});

[titleOutput, descriptionOutput, listingNoteOutput].forEach((field) => {
  field?.addEventListener('input', () => {
    updateListingCopyMeta();
    persistCurrentListingDraft();
  });
});

window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.repeat) return;

  const isSlashShortcut = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
  const isCommandPaletteShortcut = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey;

  if (!isSlashShortcut && !isCommandPaletteShortcut) return;

  const activeElement = document.activeElement;
  const isEditable = activeElement instanceof HTMLInputElement
    || activeElement instanceof HTMLTextAreaElement
    || activeElement instanceof HTMLSelectElement
    || activeElement?.isContentEditable;

  if (isEditable) return;

  e.preventDefault();
  focusSearchField({ shouldSelect: true });
  announceStatus('検索欄に移動しました');
});

window.addEventListener('hashchange', () => {
  syncResultJumpLinkStateFromHash();
  expandHashTargetDetails();
  focusHashTarget({ updateJumpNav: false });
});
window.addEventListener('popstate', () => {
  syncUiWithUrl();
});
document.addEventListener('click', (event) => {
  handleInternalProductNavigation(event);
});
document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || !isSearchDiscoveryTarget(event.target)) return;

  if (event.key === 'ArrowUp') {
    const movedToPrevious = focusAdjacentSearchDiscoveryTarget(event.target, -1);
    if (movedToPrevious) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    focusSearchField({ shouldSelect: true });
    announceStatus('検索欄に戻りました');
    return;
  }

  if (event.key === 'ArrowDown') {
    const movedToNext = focusAdjacentSearchDiscoveryTarget(event.target, 1);
    if (!movedToNext) return;

    event.preventDefault();
  }
});
syncResultJumpOffset();
window.addEventListener('resize', syncResultJumpOffset, { passive: true });

expandHashTargetDetails();
setupResultJumpTracking();
syncResultJumpLinkStateFromHash();

bindPresetButtons();
renderRecentProducts();
updateSearchControls();
updateSearchDraftHint();
syncResultShareButtonLabel();

clearRecentSearchesBtn?.addEventListener('click', () => {
  clearRecentProducts();
  renderRecentProducts();
  announceStatus('最近見た商品の履歴を消しました');
  focusSearchField({ shouldSelect: true });
});

document.querySelectorAll('[data-copy-target]').forEach((btn) => {
  bindAsyncButtonAction(btn, async () => {
    const defaultLabel = btn.textContent || 'コピー';
    const fieldLabel = btn.dataset.copyLabel || 'テキスト';
    const resetLabel = () => {
      btn.textContent = defaultLabel;
    };
    const target = document.getElementById(btn.dataset.copyTarget);

    try {
      await copyText(target?.value ?? '');
      btn.textContent = `${fieldLabel}をコピー済み`;
      announceStatus(`${fieldLabel}をコピーしました`);
      setTimeout(resetLabel, 1200);
    } catch {
      btn.textContent = '失敗';
      announceStatus(`${fieldLabel}のコピーに失敗しました`);
      setTimeout(resetLabel, 1200);
    }
  });
});

focusSearchBtn?.addEventListener('click', () => {
  focusSearchField({ shouldSelect: true });
});

function getSnapshotShareLabel() {
  const rawLabel = snapshotDate?.textContent?.trim() ?? '';
  if (!rawLabel || rawLabel === '-') return '';

  const relativeMatch = rawLabel.match(/（([^）]+)）/u);
  if (relativeMatch?.[1]) return `相場更新 ${relativeMatch[1]}`;
  if (rawLabel.includes('ローカルSKUのみ')) return '相場更新 ローカルSKUのみ';
  return `相場更新 ${rawLabel}`;
}

function buildResultShareText() {
  const name = productName?.textContent?.trim() || '商品の比較ページ';
  const standard = heroStandardPrice?.textContent?.trim();
  const quick = heroQuickPrice?.textContent?.trim();
  const bestMarket = heroBestMarket?.textContent?.trim();
  const freshness = getSnapshotShareLabel();
  const summaryParts = [
    standard ? `標準相場 ${standard}` : '',
    quick ? `すぐ売る目安 ${quick}` : '',
    bestMarket ? `おすすめ販路 ${bestMarket}` : '',
    freshness
  ].filter(Boolean);

  return summaryParts.length
    ? `${name}｜${summaryParts.join(' / ')}`
    : `${name}を開く`;
}

priceCards?.addEventListener('click', async (event) => {
  const copyButton = event.target instanceof Element
    ? event.target.closest('[data-copy-price-label]')
    : null;

  if (!(copyButton instanceof HTMLButtonElement)) return;

  const priceLabel = copyButton.dataset.copyPriceLabel || '価格';
  const priceValue = copyButton.dataset.copyPriceValue || '';
  const defaultLabel = copyButton.dataset.defaultLabel || copyButton.textContent || 'コピー';
  const productLabel = productName?.textContent?.trim() || queryInput?.value?.trim() || 'この商品';
  const resetLabel = () => {
    copyButton.textContent = defaultLabel;
  };

  if (!priceValue.trim()) {
    copyButton.textContent = '価格なし';
    announceStatus('コピーできる価格がまだありません');
    setTimeout(resetLabel, 1200);
    return;
  }

  copyButton.disabled = true;

  try {
    await copyText(`${productLabel} / ${priceLabel} ${priceValue}`);
    copyButton.textContent = `${priceLabel}をコピー済み`;
    announceStatus(`${productLabel}の${priceLabel}をコピーしました`);
  } catch {
    copyButton.textContent = '失敗';
    announceStatus(`${priceLabel}のコピーに失敗しました`);
  }

  setTimeout(() => {
    copyButton.disabled = false;
    resetLabel();
  }, 1200);
});

bindAsyncButtonAction(copyResultLinkBtn, async () => {
  const defaultLabel = getResultShareButtonDefaultLabel();
  const resetLabel = () => {
    syncResultShareButtonLabel();
  };
  const shareText = buildResultShareText();
  const shareData = {
    title: document.title,
    text: shareText,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      copyResultLinkBtn.textContent = '共有しました';
      announceStatus('共有シートを開きました');
      setTimeout(resetLabel, 1400);
      return;
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      resetLabel();
      return;
    }
  }

  try {
    await copyText(`${shareText}\n${window.location.href}`);
    copyResultLinkBtn.textContent = '要点つきでコピー済み';
    announceStatus('比較ページの要点とリンクをコピーしました');
    setTimeout(resetLabel, 1400);
  } catch {
    copyResultLinkBtn.textContent = 'コピー失敗';
    announceStatus('リンクのコピーに失敗しました');
    setTimeout(resetLabel, 1400);
  }
});

bindAsyncButtonAction(copyListingBundleBtn, async () => {
  const resetLabel = () => {
    updateListingBundleButtonLabel();
  };
  const bundleText = buildListingBundleText();
  const bundleParts = getListingBundleParts();
  const copiedLabel = bundleParts.length === 1
    ? `${bundleParts[0]}をコピー済み`
    : `${bundleParts.length}点をコピー済み`;
  const copiedAnnouncement = bundleParts.length
    ? `${bundleParts.join('・')}をまとめてコピーしました`
    : '出品文をまとめてコピーしました';

  if (!bundleText) {
    copyListingBundleBtn.textContent = '内容なし';
    announceStatus('コピーできる出品文がまだありません');
    setTimeout(resetLabel, 1200);
    return;
  }

  try {
    await copyText(bundleText);
    copyListingBundleBtn.textContent = copiedLabel;
    announceStatus(copiedAnnouncement);
    setTimeout(resetLabel, 1400);
  } catch {
    copyListingBundleBtn.textContent = 'コピー失敗';
    announceStatus('出品文のまとめコピーに失敗しました');
    setTimeout(resetLabel, 1400);
  }
});

bindAsyncButtonAction(resetListingDraftsBtn, async () => {
  const resetLabel = () => {
    updateResetListingDraftsButtonLabel();
  };
  const { title = '', description = '', listingNote = '' } = currentGeneratedListingDrafts;

  if (!(title || description || listingNote)) {
    resetListingDraftsBtn.textContent = '内容なし';
    announceStatus('戻せるたたき台がまだありません');
    setTimeout(resetLabel, 1200);
    return;
  }

  if (titleOutput) titleOutput.value = title;
  if (descriptionOutput) descriptionOutput.value = description;
  if (listingNoteOutput) listingNoteOutput.value = listingNote;
  persistCurrentListingDraft();
  updateListingCopyMeta();
  resetListingDraftsBtn.textContent = '戻しました';
  announceStatus('出品文を生成したたたき台に戻しました');
  setTimeout(resetLabel, 1400);
});
