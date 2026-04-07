import { getCardImage } from './scryfall.mjs';

const FRONT_PAGE_INDEX_URL = 'data/front-page/index.json';
const FRONT_PAGE_LEGACY_URL = 'data/front-page.json';
const INVENTORY_URL = 'data/inventory.json';
const DEFAULT_PAGE_SIZE = 40;
const DEFAULT_FRONT_PAGE_COUNT = 100;
const SCROLL_THRESHOLD_PX = 600;

const CARD_GROUPS = {
  frontpage: [],
  trending: [
    "Gaea's Cradle",
    "Grim Monolith",
    "Underground Sea",
    "Sheoldred, the Apocalypse",
    "Teferi, Hero of Dominaria",
    "Liliana of the Veil",
    "Ragavan, Nimble Pilferer",
    "Fable of the Mirror-Breaker",
    "The One Ring",
    "Boseiju, Who Endures",
    "Ledger Shredder",
    "Solitude",
    "Fury",
    "Murktide Regent",
    "Cavern of Souls",
    "Urza's Saga",
    "Force of Will",
    "Mox Opal",
    "Delighted Halfling",
    "Wrenn and Six"
  ],
  standardModern: [
    "Sheoldred, the Apocalypse",
    "Cut Down",
    "Go for the Throat",
    "Ossification",
    "The Wandering Emperor",
    "Farewell",
    "Wedding Announcement",
    "Sunfall",
    "Leyline Binding",
    "Ragavan, Nimble Pilferer",
    "The One Ring",
    "Delighted Halfling",
    "Up the Beanstalk",
    "Force of Negation",
    "Engineered Explosives",
    "Yawgmoth, Thran Physician",
    "Primeval Titan",
    "Murktide Regent",
    "Karn, the Great Creator",
    "March of Otherworldly Light"
  ],
  vintage: [
    "Black Lotus",
    "Ancestral Recall",
    "Time Walk",
    "Mox Sapphire",
    "Mox Jet",
    "Mox Ruby",
    "Mox Pearl",
    "Mox Emerald",
    "Timetwister",
    "Tolarian Academy",
    "Bazaar of Baghdad",
    "Yawgmoth's Will",
    "Mana Drain",
    "Volcanic Island",
    "Underground Sea",
    "Strip Mine",
    "Demonic Tutor",
    "Tinker",
    "Force of Will",
    "Balance"
  ]
};

const CARD_CACHE = new Map();

let frontPageLoaded = false;
let frontPageEntries = [];
let pageSize = DEFAULT_PAGE_SIZE;
let frontPageTargetCount = DEFAULT_FRONT_PAGE_COUNT;
let renderedCount = 0;
let loadingNextPage = false;
let scrollHandlerAttached = false;

let activeGroup = 'frontpage';
let cardEntries = [];
let groupBaseList = [];
let activeQuery = '';
let currentRun = 0;
let coarseHideHandlerAttached = false;
let activeFormat = 'all';
let activeSet = '';
let activeSort = 'default';
let sortPrefetchPromise = null;
let inventoryEntries = [];

const SET_FILTERS = {
  'lorwyn eclipse': ['ecl', 'lorwyn eclipse', 'lrw', 'g11'],
  'lorwyn eclipsed': ['ecl', 'lorwyn eclipse', 'lrw', 'g11'],
  'lorwyn eclipsed variants': ['ecl', 'lorwyn eclipse', 'lrw', 'g11'],
  avatar: ['tla'],
  'avatar the last airbender': ['tla'],
  'avatar the last airbender variants': ['tla'],
  'spider-man': ['spm'],
  'marvels spider man': ['spm'],
  'marvels spider man variants': ['spm'],
  'edge of eternities': ['eoe'],
  'edge of eternities variants': ['eoe'],
  'final fantasy': ['fin', 'pf25'],
  'final fantasy variants': ['fin', 'pf25', 'pfin'],
  'kamigawa neon dynasty': ['neo', 'pneo'],
  'kamigawa neon dynasty variants': ['neo', 'pneo'],
  'aetherdrift': ['dft'],
  'aetherdrift variants': ['dft'],
  'zendikar expeditions': ['exp'],
  'kaladesh inventions': ['mps'],
  'amonkhet invocations': ['mp2'],
  'masterpiece series expeditions': ['exp'],
  'masterpiece series inventions': ['mps'],
  'masterpiece series invocations': ['mp2'],
  'modern horizons 2': ['mh2'],
  'modern horizons 2 variants': ['mh2'],
  'modern horizons 3': ['mh3'],
  'modern horizons 3 variants': ['mh3'],
  'commander legends': ['cmr'],
  'commander legends variants': ['cmr'],
  'commander masters': ['cmm'],
  'commander masters variants': ['cmm'],
  'ravnica remastered': ['rvr'],
  'ravnica remastered variants': ['rvr'],
  'duskmourn house of horror': ['dsk'],
  'duskmourn house of horror variants': ['dsk'],
  'tarkir dragonstorm': ['tdm'],
  'tarkir dragonstorm variants': ['tdm'],
  'the lord of the rings tales of middle earth': ['ltr'],
  'the lord of the rings tales of middle earth variants': ['ltr'],
  'the lost caverns of ixalan': ['lci'],
  'the lost caverns of ixalan variants': ['lci'],
  foundations: ['fdn'],
  'foundations variants': ['fdn'],
  unfinity: ['unf'],
  'unfinity variants': ['unf'],
  'universes beyond assassins creed': ['acr'],
  'universes beyond assassins creed variants': ['acr'],
  'universes beyond transformers': ['bot'],
  'universes beyond jurassic world collection': ['jwd'],
  'universes beyond fallout': ['pip'],
  'universes beyond fallout variants': ['pip'],
  'war of the spark jpn planeswalkers': ['war', 'pwar'],
  'innistrad remastered': ['inr'],
  'innistrad remastered variants': ['inr'],
  '3rd edition': ['3ed'],
  '4th edition': ['4ed'],
  '5th edition': ['5ed'],
  '6th edition': ['6ed'],
  '7th edition': ['7ed'],
  'arabian nights': ['arn'],
  innistrad: ['isd'],
};

const SET_TAG_HINTS = {
  tla: ['avatar'],
  spm: ['spider-man'],
  eoe: ['edge of eternities'],
  fin: ['final fantasy'],
  pf25: ['final fantasy'],
  pfin: ['final fantasy'],
  g11: ['lorwyn eclipse'],
  lrw: ['lorwyn eclipse'],
};

const SET_FORMAT_HINTS = {
  fin: ['standard', 'new'],
  pf25: ['standard', 'new'],
  tla: ['standard', 'new'],
  spm: ['standard', 'new'],
  eoe: ['standard', 'new'],
  usg: ['vintage'],
  ulg: ['vintage'],
  mrd: ['modern'],
  ons: ['modern'],
  zen: ['modern'],
  leg: ['vintage'],
  isd: ['modern'],
  sealed: [],
  supplies: [],
  fdn: ['standard'],
  pdmu: ['standard'],
  slp: ['modern'],
  sld: ['modern'],
  sch: ['modern'],
  pwcs: ['modern'],
  dkm: ['modern'],
  g11: ['modern'],
  inr: ['modern'],
  war: ['modern'],
  pwar: ['modern'],
  ltr: ['modern'],
  j18: ['modern'],
  pip: ['modern'],
  slc: ['modern'],
  ppro: ['modern'],
  rfin: ['modern'],
  all: ['vintage'],
  arn: ['vintage'],
  atq: ['vintage'],
  leb: ['vintage'],
  '2ed': ['vintage'],
  '3ed': ['vintage'],
  mir: ['vintage'],
  sth: ['vintage'],
  exo: ['vintage'],
  exp: ['vintage'],
  g10: ['vintage'],
  mp2: ['vintage'],
  ltc: ['modern'],
  pdom: ['modern'],
  prm: ['modern'],
  plst: ['modern'],
  '2xm': ['modern'],
  j13: ['modern'],
  mps: ['modern'],
  pfin: ['standard'],
  pthb: ['standard'],
  mh2: ['modern'],
  mh3: ['modern'],
  cmr: ['commander'],
  cmm: ['commander'],
  rvr: ['modern'],
  dsk: ['standard'],
  tdm: ['standard'],
  lci: ['standard'],
  neo: ['standard'],
  pneo: ['standard'],
  unf: ['modern'],
  acr: ['modern'],
  bot: ['modern'],
  jwd: ['modern'],
};

const NEWEST_SET_CODES = ['fin', 'pf25', 'tla', 'spm', 'eoe'];

function deriveFormatsFromSet(setCode) {
  if (!setCode) return [];
  const key = setCode.toLowerCase();
  return SET_FORMAT_HINTS[key] ? SET_FORMAT_HINTS[key].slice() : [];
}

function deriveTagsFromSet(setCode) {
  if (!setCode) return [];
  const key = setCode.toLowerCase();
  return SET_TAG_HINTS[key] ? SET_TAG_HINTS[key].slice() : [];
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLang(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeType(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function mergeLists(base, extra) {
  const merged = [];
  const seen = new Set();
  [base, extra].forEach((arr) => {
    (arr || []).forEach((item) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      merged.push(item);
    });
  });
  return merged;
}

function createEntry(entry) {
  const name = normalizeName(entry && entry.name ? entry.name : entry);
  if (!name) return null;
  const formats = normalizeList(entry && entry.formats);
  const tags = normalizeList(entry && entry.tags);
  const type = normalizeType(entry && entry.type) || 'card';
  const image = typeof (entry && entry.image) === 'string' ? entry.image.trim() : '';
  const price = Number.isFinite(entry && entry.price) ? entry.price : null;
  const tag = typeof (entry && entry.tag) === 'string' ? entry.tag.trim() : '';
  const set = typeof (entry && entry.set) === 'string' ? entry.set.trim() : '';
  const collector = typeof (entry && entry.collector) === 'string'
    ? entry.collector.trim()
    : (typeof (entry && entry.collectorNumber) === 'string' ? entry.collectorNumber.trim() : '');
  const lang = normalizeLang(entry && entry.lang);
  const sectionId = entry && (entry.sectionId || entry.section) || '';
  const sectionTitle = entry && (entry.sectionTitle || entry.title) || '';
  const keyParts = [name, set, collector, lang].filter(Boolean);
  const key = keyParts.join('|') || name;
  const derivedFormats = deriveFormatsFromSet(set);
  const derivedTags = deriveTagsFromSet(set);
  const mergedTags = mergeLists(tags, derivedTags);
  const preferredFormats = derivedFormats.length ? derivedFormats : formats;
  const normalizedFormats = preferredFormats.length ? preferredFormats : ['modern'];
  return {
    name,
    formats: normalizedFormats,
    tags: mergedTags,
    type,
    image,
    price,
    tag,
    set,
    collector,
    lang,
    sectionId,
    sectionTitle,
    key,
  };
}

export function normalizeEntries(list) {
  if (!Array.isArray(list)) return [];
  return list.map(createEntry).filter(Boolean);
}

function mergeEntries(primary, extra) {
  const merged = [];
  const seen = new Set();
  const pushEntry = (entry) => {
    if (!entry) return;
    const key = entry.key || `${entry.name}|${entry.set}|${entry.collector}|${entry.lang}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  };
  (primary || []).forEach(pushEntry);
  (extra || []).forEach(pushEntry);
  return merged;
}

function getInventoryEntries() {
  if (!inventoryEntries.length) return frontPageEntries.slice();
  return mergeEntries(frontPageEntries, inventoryEntries);
}

function setFrontPageCards(cards, { limit } = {}) {
  const seen = new Set();
  const target = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : frontPageTargetCount;
  frontPageEntries = [];
  for (const entry of (cards || [])) {
    if (target && frontPageEntries.length >= target) break;
    const normalized = createEntry(entry);
    if (!normalized) continue;
    if (seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    frontPageEntries.push(normalized);
  }
  if (target && frontPageEntries.length < target) {
    console.warn(`Front page list has ${frontPageEntries.length}/${target} cards.`);
  }
}

function buildGroupEntries(groupKey) {
  const base = frontPageEntries.length ? frontPageEntries : normalizeEntries(CARD_GROUPS.trending);
  const inventory = getInventoryEntries();
  const key = (groupKey || 'frontpage').toLowerCase();
  if (key === 'frontpage') return base;
  if (key === 'trending') return base;
  if (key === 'vintage') {
    const vintage = inventory.filter((entry) => {
      const tags = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).toLowerCase()) : [];
      return entry.sectionId === 'vintage_icons'
        || (Array.isArray(entry.formats) && entry.formats.includes('vintage'))
        || tags.includes('vintage');
    });
    return vintage.length ? vintage : base;
  }
  if (key === 'newest') {
    const newest = inventory.filter((entry) => {
      const set = (entry.set || '').toLowerCase();
      if (entry.sectionId === 'new_set_highlights') return true;
      if (set && NEWEST_SET_CODES.includes(set)) return true;
      return Array.isArray(entry.formats) && entry.formats.includes('standard');
    });
    return newest.length ? newest : base;
  }
  if (key === 'alternates') {
    const alternates = inventory.filter((entry) => {
      const set = (entry.set || '').toLowerCase();
      const lang = (entry.lang || '').toLowerCase();
      const tags = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).toLowerCase()) : [];
      return set === 'sld' || lang && lang !== 'en' || tags.includes('alternates');
    });
    return alternates.length ? alternates : base;
  }
  return inventory.length ? inventory : base;
}

function applyFilters() {
  const inventory = getInventoryEntries();
  let filtered = groupBaseList.slice();
  if (!activeSet && !activeQuery && typeof window !== 'undefined' && window.__CARD_BAZAAR_SET) {
    activeSet = String(window.__CARD_BAZAAR_SET).toLowerCase();
  }
  if (activeSet || activeQuery) {
    filtered = inventory.slice();
  }
  if (activeFormat && activeFormat !== 'all') {
    filtered = filtered.filter((entry) => Array.isArray(entry.formats) && entry.formats.includes(activeFormat));
  }
  if (activeSet) {
    const key = activeSet.toLowerCase();
    const targets = SET_FILTERS[key] || [key];
    filtered = filtered.filter((entry) => {
      const entrySet = (entry.set || '').toLowerCase();
      if (entrySet && targets.includes(entrySet)) return true;
      const tags = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).toLowerCase()) : [];
      return tags.some((tag) => targets.includes(tag) || tag === key);
    });
  }
  if (activeQuery) {
    const query = activeQuery.toLowerCase();
    filtered = filtered.filter((entry) => entry.name.toLowerCase().includes(query));
  }
  cardEntries = sortEntries(filtered);
}

function needsSortData(mode) {
  return mode === 'newest' || mode === 'price-high' || mode === 'price-low';
}

function getEntryPrice(entry) {
  if (entry && entry.type && entry.type !== 'card') {
    return Number.isFinite(entry.price) ? entry.price : 0;
  }
  const key = buildCardCacheKey(entry);
  const data = key ? CARD_CACHE.get(key) : null;
  if (!data) return 0;
  return getBaseUsdPrice(data);
}

export function getCachedEntryPrice(entry) {
  return getEntryPrice(entry);
}

function getEntryRelease(entry) {
  const key = buildCardCacheKey(entry);
  const data = key ? CARD_CACHE.get(key) : null;
  if (!data || !data.released_at) return 0;
  const ts = Date.parse(data.released_at);
  return Number.isFinite(ts) ? ts : 0;
}

function getEntryPopularity(entry) {
  const key = buildCardCacheKey(entry);
  return key ? buildPlayRate(key) : 0;
}

function sortEntries(list) {
  if (!activeSort || activeSort === 'default') return list.slice();
  const sorted = list.slice();
  switch (activeSort) {
    case 'popular':
      sorted.sort((a, b) => getEntryPopularity(b) - getEntryPopularity(a));
      break;
    case 'price-high':
      sorted.sort((a, b) => getEntryPrice(b) - getEntryPrice(a));
      break;
    case 'price-low':
      sorted.sort((a, b) => getEntryPrice(a) - getEntryPrice(b));
      break;
    case 'newest':
      sorted.sort((a, b) => getEntryRelease(b) - getEntryRelease(a));
      break;
    default:
      break;
  }
  return sorted;
}

async function ensureSortData(list) {
  if (sortPrefetchPromise) return sortPrefetchPromise;
  if (!needsSortData(activeSort)) return Promise.resolve();
  const entries = list.filter((entry) => !(entry && entry.type && entry.type !== 'card'));
  sortPrefetchPromise = (async () => {
    for (const entry of entries) {
      const key = buildCardCacheKey(entry);
      if (!key || CARD_CACHE.has(key)) continue;
      try {
        const res = await fetch(buildScryfallUrl(entry));
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.object !== 'error') {
          CARD_CACHE.set(key, data);
        }
      } catch (_) {
        // ignore fetch errors
      }
    }
  })();
  try {
    await sortPrefetchPromise;
  } finally {
    sortPrefetchPromise = null;
  }
}

async function refreshGrid({ prefetchSort = false } = {}) {
  applyFilters();
  if (prefetchSort && needsSortData(activeSort)) {
    await ensureSortData(cardEntries);
    applyFilters();
  }
  fetchCardImages();
}

export async function renderCardListInto(list, grid) {
  if (!grid) return [];
  const normalized = normalizeEntries(list);
  currentRun += 1;
  await renderCardBatch(normalized, { append: false, runId: currentRun, gridOverride: grid });
  return normalized;
}

function setDisplayList(list, { resetBase = false } = {}) {
  const safeList = normalizeEntries(list);
  if (resetBase) {
    groupBaseList = safeList.slice();
  } else if (!groupBaseList.length) {
    groupBaseList = safeList.slice();
  }
  applyFilters();
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function loadFrontPageConfig() {
  if (frontPageLoaded || typeof fetch === 'undefined') return;
  frontPageLoaded = true;
  const indexData = await fetchJson(FRONT_PAGE_INDEX_URL);
  if (indexData && Array.isArray(indexData.sections)) {
    if (Number.isFinite(indexData.pageSize)) {
      pageSize = Math.max(1, Math.floor(indexData.pageSize));
    }
    if (Number.isFinite(indexData.totalCards)) {
      frontPageTargetCount = Math.max(1, Math.floor(indexData.totalCards));
    } else if (Number.isFinite(indexData.cardLimit)) {
      frontPageTargetCount = Math.max(1, Math.floor(indexData.cardLimit));
    }
    const flattened = [];
    for (const section of indexData.sections) {
      let sectionFormats = normalizeList(section.formats);
      let sectionId = section.id || '';
      let sectionTitle = section.title || '';
      let cards = section.cards;
      if (!cards && typeof section.source === 'string') {
        const sourceUrl = `data/front-page/${section.source}`.replace(/\\/g, '/');
        const sectionData = await fetchJson(sourceUrl);
        if (sectionData) {
          if (!sectionId) sectionId = sectionData.id || '';
          if (!sectionTitle) sectionTitle = sectionData.title || '';
          if (!sectionFormats.length) {
            sectionFormats = normalizeList(sectionData.formats);
          }
          cards = sectionData.cards;
        }
      }
      if (!Array.isArray(cards)) continue;
      cards.forEach((card) => {
        if (typeof card === 'string') {
          const safeName = normalizeName(card);
          if (!safeName) return;
          flattened.push({
            name: safeName,
            formats: sectionFormats,
            sectionId,
            sectionTitle,
          });
          return;
        }
        if (!card || typeof card !== 'object') return;
        const safeName = normalizeName(card.name);
        if (!safeName) return;
        const cardFormats = mergeLists(sectionFormats, normalizeList(card.formats));
        const tags = normalizeList(card.tags);
        const type = normalizeType(card.type) || 'card';
        const image = typeof card.image === 'string' ? card.image.trim() : '';
        const price = Number.isFinite(card.price) ? card.price : null;
        const tag = typeof card.tag === 'string' ? card.tag.trim() : '';
        const set = typeof card.set === 'string' ? card.set.trim() : '';
        const collector = typeof card.collector === 'string'
          ? card.collector.trim()
          : (typeof card.collectorNumber === 'string' ? card.collectorNumber.trim() : '');
        const lang = normalizeLang(card.lang);
        flattened.push({
          name: safeName,
          formats: cardFormats,
          tags,
          type,
          image,
          price,
          tag,
          set,
          collector,
          lang,
          sectionId,
          sectionTitle,
        });
      });
    }
    setFrontPageCards(flattened, { limit: frontPageTargetCount });
    return;
  }
  const legacyData = await fetchJson(FRONT_PAGE_LEGACY_URL);
  if (legacyData && Number.isFinite(legacyData.pageSize)) {
    pageSize = Math.max(1, Math.floor(legacyData.pageSize));
  }
  if (legacyData && Array.isArray(legacyData.sections)) {
    const flattened = [];
    legacyData.sections.forEach((section) => {
      const formats = normalizeList(section.formats);
      const sectionId = section.id || '';
      const sectionTitle = section.title || '';
      if (Array.isArray(section.cards)) {
        section.cards.forEach((name) => {
          const safeName = normalizeName(name);
          if (!safeName) return;
          flattened.push({
            name: safeName,
            formats,
            sectionId,
            sectionTitle,
          });
        });
      }
    });
    setFrontPageCards(flattened, { limit: frontPageTargetCount });
  } else if (legacyData && Array.isArray(legacyData.cards)) {
    setFrontPageCards(legacyData.cards, { limit: frontPageTargetCount });
  }
}

async function loadInventoryConfig() {
  if (inventoryEntries.length || typeof fetch === 'undefined') return;
  const data = await fetchJson(INVENTORY_URL);
  if (data && Array.isArray(data.cards)) {
    inventoryEntries = normalizeEntries(data.cards);
  }
}

function resetPagination() {
  renderedCount = 0;
  loadingNextPage = false;
}

function shouldLoadMore() {
  if (loadingNextPage || renderedCount >= cardEntries.length) return false;
  if (typeof window === 'undefined') return false;
  const scrollPos = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - SCROLL_THRESHOLD_PX;
  return scrollPos >= threshold;
}

function ensureScrollPaging() {
  if (scrollHandlerAttached || typeof window === 'undefined') return;
  window.addEventListener('scroll', () => {
    if (shouldLoadMore()) renderNextPage();
  });
  scrollHandlerAttached = true;
}

const hooks = {
  addToCart: null,
  showHires: null,
  onCardsRendered: null,
  onCardView: null,
};

// Pricing multipliers per condition; base price comes from Scryfall (USD)
const CONDITION_MULTIPLIERS = {
  NM: 1.0,
  EX: 0.85,
  VG: 0.75,
};

// Simple demo inventory counts for visible conditions (starting values)
const DEFAULT_INVENTORY = {
  NM: 4,
  EX: 6,
  VG: 3,
};

function applyOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  // Three-card stack presets (NM/EX/VG)
  const preset = [
    { x: -28, y: -22, r: -5 },
    { x: 16, y: -10, r: 3 },
    { x: 0, y: 0, r: 0 },
  ];

  // Rotate preset each time so the top card lands in a new spot
  const shift = stack._offsetShift || 0;
  const rotated = preset.slice(shift).concat(preset.slice(0, shift));

  images.forEach((img, i) => {
    const off = rotated[i] || rotated[rotated.length - 1];
    img.dataset.offsetX = off.x;
    img.dataset.offsetY = off.y;
    img.dataset.rotate = off.r;
    img.style.transform = `translate(${off.x}px, ${off.y}px) rotate(${off.r}deg)`;
    img.style.zIndex = i + 1;
  });

  stack._offsetShift = (shift + 1) % preset.length;

  const active = stack.querySelector('.variant-image.active');
  if (active && active.style) active.style.zIndex = images.length + 10;
}

function resetOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  images.forEach(img => {
    img.style.transform = 'translate(0px, 0px) rotate(0deg)';
  });
}

function ensureCoarseHideHandler() {
  if (coarseHideHandlerAttached || typeof document === 'undefined') return;
  document.addEventListener('click', (event) => {
    const activeCard = event.target.closest('.card');
    document.querySelectorAll('.condition-buttons').forEach((buttons) => {
      const card = buttons.closest('.card');
      if (!activeCard || card !== activeCard) {
        buttons.style.display = 'none';
      }
    });
  });
  coarseHideHandlerAttached = true;
}

function buildCardCacheKey(entry) {
  if (entry && entry.key) return entry.key;
  return entry && entry.name ? entry.name : '';
}

function buildScryfallUrl(entry) {
  if (entry && entry.set && entry.collector) {
    const set = encodeURIComponent(entry.set);
    const collector = entry.collector.includes('%')
      ? entry.collector
      : encodeURIComponent(entry.collector);
    if (entry.lang) {
      const lang = encodeURIComponent(entry.lang);
      return `https://api.scryfall.com/cards/${set}/${collector}/${lang}`;
    }
    return `https://api.scryfall.com/cards/${set}/${collector}`;
  }
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(entry.name)}`;
}

function buildScryfallPageUrl(entry) {
  if (entry && entry.set && entry.collector) {
    const set = encodeURIComponent(entry.set);
    const collector = entry.collector.includes('%')
      ? entry.collector
      : encodeURIComponent(entry.collector);
    if (entry.lang) {
      const lang = encodeURIComponent(entry.lang);
      return `https://scryfall.com/card/${set}/${collector}/${lang}`;
    }
    return `https://scryfall.com/card/${set}/${collector}`;
  }
  return `https://scryfall.com/search?q=${encodeURIComponent(entry.name)}`;
}

function buildCardPageUrl(entry) {
  const params = new URLSearchParams();
  if (entry && entry.name) params.set('name', entry.name);
  if (entry && entry.set) params.set('set', entry.set);
  if (entry && entry.collector) params.set('collector', entry.collector);
  if (entry && entry.lang) params.set('lang', entry.lang);
  const qs = params.toString();
  return qs ? `card.html?${qs}` : 'card.html';
}

function formatPrice(n) {
  const num = Number.isFinite(n) ? n : 0;
  return `$${num.toFixed(2)}`;
}

function buildConditionLabel(condition, count, priceStr, color) {
  const colorAttr = color ? ` style="color:${color}"` : '';
  return `${condition} (${count}) &mdash; <span class="price-span"${colorAttr}>${priceStr}</span>`;
}

function seededRandom(seed, salt = 0) {
  let hash = 0;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000;
  }
  const value = Math.sin(hash + salt) * 10000;
  return value - Math.floor(value);
}

function buildPlayRate(seedKey) {
  return Math.round(5 + seededRandom(seedKey, 41) * 25);
}

function buildSynergy(seedKey) {
  return Math.round(30 + seededRandom(seedKey, 57) * 60);
}

function lastSeenTimestamp(key) {
  try {
    const v = localStorage.getItem(`cb_price_ts_${key}`);
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

function saveSeenTimestamp(key, value) {
  try {
    localStorage.setItem(`cb_price_ts_${key}`, String(value));
  } catch (_) {}
}

function formatUpdateTime(ts) {
  const date = ts ? new Date(ts) : new Date();
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function buildTrendDelta(prev, current) {
  if (!Number.isFinite(prev) || !prev) {
    return { label: 'Trend 0%', trendClass: '' };
  }
  const delta = ((current - prev) / prev) * 100;
  const sign = delta >= 0 ? '+' : '-';
  const pct = Math.abs(delta).toFixed(1);
  const trendClass = delta >= 0 ? 'market-trend-up' : 'market-trend-down';
  return { label: `Trend ${sign}${pct}%`, trendClass };
}

function formatLabel(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getTagLabel(entry) {
  if (entry && entry.tag) return entry.tag;
  if (entry && Array.isArray(entry.tags) && entry.tags.length) {
    return formatLabel(entry.tags[0]);
  }
  if (entry && entry.type === 'supplies') return 'Supplies';
  if (entry && entry.type === 'sealed') return 'Sealed';
  if (entry && entry.set && entry.set.toLowerCase() === 'sld') return 'Alternates';
  if (entry && entry.lang && entry.lang.toLowerCase() !== 'en') return 'Alternates';
  if (entry && Array.isArray(entry.formats)) {
    if (entry.formats.includes('vintage')) return 'Vintage';
    if (entry.formats.includes('standard')) return 'Standard';
    if (entry.formats.includes('modern')) return 'Modern';
    if (entry.formats.includes('new')) return 'New';
  }
  return 'Featured';
}

function buildMarketPrices(basePrice, seedKey) {
  const ck = basePrice * (1.05 + seededRandom(seedKey, 11) * 0.18);
  const tcg = basePrice * (0.95 + seededRandom(seedKey, 29) * 0.18);
  return {
    ck: formatPrice(ck),
    tcg: formatPrice(tcg),
  };
}

function buildDeckPopularity(seedKey) {
  const pct = Math.round(6 + seededRandom(seedKey, 37) * 20);
  return `${pct}%`;
}

function getBaseUsdPrice(cardData) {
  const p = (cardData && cardData.prices) || {};
  const raw = p.usd || p.usd_foil || p.usd_etched || null;
  const n = raw != null ? parseFloat(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function lastSeenPrice(key, condition) {
  try {
    const storageKey = `cb_price_${key}__${condition}`;
    const v = localStorage.getItem(storageKey);
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

function saveSeenPrice(key, condition, value) {
  try {
    const storageKey = `cb_price_${key}__${condition}`;
    localStorage.setItem(storageKey, String(value));
  } catch (_) {}
}

function priceColorDelta(key, condition, value) {
  const prev = lastSeenPrice(key, condition);
  if (prev == null) return '';
  if (value > prev) return '#7CFC9A'; // slight green
  if (value < prev) return '#FF7A7A'; // slight red
  return '';
}

async function renderCardBatch(list, { append = false, runId, gridOverride } = {}) {
  if (typeof document === 'undefined') return;
  const grid = gridOverride || document.getElementById('cardGrid');
  if (!grid) return;
  const token = Number.isFinite(runId) ? runId : currentRun;
  if (!append) grid.innerHTML = '';
  const canHover = (typeof window !== 'undefined')
    && ('matchMedia' in window)
    && window.matchMedia('(any-hover: hover)').matches;
  const isCoarse = (typeof window !== 'undefined')
    && ('matchMedia' in window)
    && window.matchMedia('(pointer: coarse)').matches
    && !canHover;
  if (isCoarse) ensureCoarseHideHandler();
  for (const entry of list) {
    const name = entry.name;
    const cacheKey = buildCardCacheKey(entry);
    if (!cacheKey) continue;
    const isProduct = entry.type && entry.type !== 'card';
    let data = null;
    let image = entry.image || '';
    let base = Number.isFinite(entry.price) ? entry.price : 0;
    let hires = '';
    if (!isProduct) {
      data = CARD_CACHE.get(cacheKey);
      if (!data) {
        try {
          const res = await fetch(buildScryfallUrl(entry));
          data = await res.json();
          CARD_CACHE.set(cacheKey, data);
        } catch (err) {
          console.error('Failed to load card', name, err);
          continue;
        }
      }
      if (token !== currentRun) return;
      image = getCardImage(data, ['normal']);
      hires = getCardImage(data, ['png', 'large']);
      base = getBaseUsdPrice(data);
    }
    const tagLabel = getTagLabel(entry);
    const marketPrices = buildMarketPrices(base, cacheKey);
    const cardPageUrl = isProduct ? '' : buildCardPageUrl(entry);
    const scryfallLink = data && data.scryfall_uri ? data.scryfall_uri : buildScryfallPageUrl(entry);
    const purchaseUris = data && data.purchase_uris ? data.purchase_uris : {};
    const ckLink = purchaseUris.cardkingdom || purchaseUris.card_kingdom || scryfallLink;
    const tcgLink = purchaseUris.tcgplayer || purchaseUris.tcgplayer_infinite || scryfallLink;
    if (token !== currentRun) return;

    // Compute real-time prices per condition from Scryfall USD
    const computed = {
      NM: base * CONDITION_MULTIPLIERS.NM,
      EX: base * CONDITION_MULTIPLIERS.EX,
      VG: base * CONDITION_MULTIPLIERS.VG,
    };

    const priceStrings = {
      NM: formatPrice(computed.NM),
      EX: formatPrice(computed.EX),
      VG: formatPrice(computed.VG),
    };
    const stickerX = Math.round(12 + seededRandom(cacheKey, 13) * 70);
    const stickerY = Math.round(12 + seededRandom(cacheKey, 17) * 60);
    const stickerRot = (seededRandom(cacheKey, 23) * 10 - 5).toFixed(1);

    if (isProduct) {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card product-card";
      cardDiv.innerHTML = `
        <div class="card-stack product-stack">
          <img class="variant-image active" src="${image}" alt="${name}">
        </div>
        <div class="product-actions">
          <button class="add-cart-btn">Add to Cart</button>
        </div>
        <div class="card-meta">
          <div class="card-meta-row card-meta-prices">
            <span class="price-source price-source--cb">Card Bazaar ${formatPrice(base)}</span>
          </div>
          <div class="card-meta-row card-meta-stats">
            <span class="testimonial-user">Featured ${tagLabel}</span>
          </div>
        </div>
      `;
      const addBtn = cardDiv.querySelector('.add-cart-btn');
      if (addBtn && typeof hooks.addToCart === 'function') {
        addBtn.addEventListener('click', () => {
          hooks.addToCart({ name, condition: 'NM', price: formatPrice(base), image });
        });
      }
      if (token !== currentRun) return;
      grid.appendChild(cardDiv);
      continue;
    }

    // Determine per-condition color deltas vs. last seen and persist
    const prevNm = lastSeenPrice(cacheKey, 'NM');
    const colors = {
      NM: priceColorDelta(cacheKey, 'NM', computed.NM),
      EX: priceColorDelta(cacheKey, 'EX', computed.EX),
      VG: priceColorDelta(cacheKey, 'VG', computed.VG),
    };
    saveSeenPrice(cacheKey, 'NM', computed.NM);
    saveSeenPrice(cacheKey, 'EX', computed.EX);
    saveSeenPrice(cacheKey, 'VG', computed.VG);
    const updatedAt = Date.now();
    saveSeenTimestamp(cacheKey, updatedAt);
    const trend = buildTrendDelta(prevNm, computed.NM);
    const playRate = buildPlayRate(cacheKey);
    const synergy = buildSynergy(cacheKey);
    const updatedLabel = formatUpdateTime(updatedAt);

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      <div class="card-stack">
        <img class="variant-image active" data-condition="NM" data-price="${priceStrings.NM}" src="${image}" alt="${name} NM">
        <img class="variant-image" data-condition="EX" data-price="${priceStrings.EX}" src="${image}" alt="${name} EX">
        <img class="variant-image" data-condition="VG" data-price="${priceStrings.VG}" src="${image}" alt="${name} VG">
        <div class="scan-watermark">Live Scan</div>
        <div class="price-sticker" style="--sticker-x:${stickerX}px; --sticker-y:${stickerY}px; --sticker-rot:${stickerRot}deg;">Live ${priceStrings.NM}</div>
        <div class="lastcopy-badge" aria-hidden="true">LAST COPY</div>
        <div class="condition-buttons">
          <button class="add-cart-btn">Add to Cart</button>
          <button class="hires-btn">View Card</button>
          <button data-condition="NM" data-price="${priceStrings.NM}">
            ${buildConditionLabel('NM', DEFAULT_INVENTORY.NM, priceStrings.NM, colors.NM)}
          </button>
          <button data-condition="EX" data-price="${priceStrings.EX}">
            ${buildConditionLabel('EX', DEFAULT_INVENTORY.EX, priceStrings.EX, colors.EX)}
          </button>
          <button data-condition="VG" data-price="${priceStrings.VG}">
            ${buildConditionLabel('VG', DEFAULT_INVENTORY.VG, priceStrings.VG, colors.VG)}
          </button>
        </div>
      </div>
      <div class="info" style="display:none;">
        <div class="price">Price: ${priceStrings.NM}</div>
        <div class="condition">Condition: NM</div>
      </div>
      <div class="card-meta">
        <div class="card-meta-row card-meta-title">
          <a class="card-title" href="${cardPageUrl}" target="_blank" rel="noopener" data-card-link="true">${name}</a>
        </div>
        <div class="card-meta-row card-meta-top">
          <div class="card-meta-prices">
            <a class="price-source price-source--scryfall" href="${scryfallLink}" target="_blank" rel="noopener">Scryfall ${priceStrings.NM}</a>
            <span class="price-sep">|</span>
            <a class="price-source price-source--ck" href="${ckLink}" target="_blank" rel="noopener">CK ${marketPrices.ck}</a>
            <span class="price-sep">|</span>
            <a class="price-source price-source--tcg" href="${tcgLink}" target="_blank" rel="noopener">TCG ${marketPrices.tcg}</a>
          </div>
        </div>
        <div class="card-meta-row card-meta-market">
          <span class="market-stat">MTGGoldfish ${playRate}%</span>
          <span class="price-sep">|</span>
          <span class="market-stat">EDHREC ${synergy}%</span>
          <span class="price-sep">|</span>
          <span class="market-stat ${trend.trendClass}">${trend.label}</span>
          <span class="price-sep">|</span>
          <span class="market-stat">Updated ${updatedLabel}</span>
        </div>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');
    // ensure the initially active image is the last child so it sits on top
    const initialActive = stack.querySelector('.variant-image.active');
    if (initialActive) stack.appendChild(initialActive);
    // Attach per-card inventory snapshot
    cardDiv._inv = { NM: DEFAULT_INVENTORY.NM, EX: DEFAULT_INVENTORY.EX, VG: DEFAULT_INVENTORY.VG };
    // Seeded data hooks removed for leaner card meta.
    applyOffsets(stack);
    resetOffsets(stack);
    stack._hovered = false;
    const buttonsBar = cardDiv.querySelector('.condition-buttons');
    const lastBadge = cardDiv.querySelector('.lastcopy-badge');
    if (buttonsBar) {
      buttonsBar.style.display = 'none';
      buttonsBar.style.zIndex = '100';
    }

    function updateButtons() {
      ['NM','EX','VG'].forEach(c => {
        const btn = cardDiv.querySelector(`.condition-buttons button[data-condition="${c}"]`);
        if (!btn) return;
        const cnt = cardDiv._inv[c];
        const priceStr = priceStrings[c];
        btn.innerHTML = buildConditionLabel(c, cnt, priceStr, colors[c]);
        btn.classList.toggle('disabled', cnt <= 0);
      });
      // Show/hide last copy badge if active condition has 1 left
      const active = cardDiv.querySelector('.variant-image.active');
      if (active && lastBadge) {
        const c = active.dataset.condition;
        lastBadge.classList.toggle('show', cardDiv._inv[c] === 1);
      }
    }
    cardDiv._updateButtons = updateButtons;
    updateButtons();

    function showBanner(text) {
      const banner = document.createElement('div');
      banner.className = 'celebrate-banner';
      banner.textContent = text;
      cardDiv.appendChild(banner);
      // trigger fade-in
      requestAnimationFrame(() => banner.classList.add('show'));
      setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 250);
      }, 1800);
    }

    function markSoldOut(condition) {
      // dim active image if sold out and disable add to cart for that condition
      const img = stack.querySelector(`.variant-image[data-condition="${condition}"]`);
      if (img) img.classList.add('sold-out');
      updateButtons();
    }

    function handleAddForActive() {
      const active = cardDiv.querySelector('.variant-image.active');
      if (!active) return false;
      const cond = active.dataset.condition;
      const remaining = cardDiv._inv[cond];
      if (remaining <= 0) {
        showBanner('Sold out for this condition');
        return false;
      }
      const wasTwo = remaining === 2;
      const wasOne = remaining === 1;
      cardDiv._inv[cond] = Math.max(0, remaining - 1);
      updateButtons();
      if (wasTwo) {
        if (lastBadge) lastBadge.classList.add('show');
      }
      if (wasOne) {
        markSoldOut(cond);
        showBanner('No longer in stock because of you. Lucky find!');
      }
      return true;
    }

    // Desktop: hover shows condition bar
    cardDiv.addEventListener('mouseenter', () => {
      if (isCoarse) return;
      stack._hovered = true;
      applyOffsets(stack);
      if (buttonsBar) buttonsBar.style.display = 'flex';
    });

    cardDiv.addEventListener('mouseleave', () => {
      if (isCoarse) return;
      stack._hovered = false;
      resetOffsets(stack);
      if (buttonsBar) buttonsBar.style.display = 'none';
    });

    let clickTimer;
    if (isCoarse) {
      // Mobile/tablet: tap toggles condition bar; no click-to-cycle
      stack.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!buttonsBar) return;
        const visible = buttonsBar.style.display === 'flex';
        buttonsBar.style.display = visible ? 'none' : 'flex';
      });
    } else {
      // Desktop: click cycles variants (existing behavior)
      stack.addEventListener('click', (e) => {
        e.stopPropagation();
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          cycleVariant(stack);
          clickTimer = null;
        }, 200);
      });
    }

    cardDiv.querySelectorAll('.condition-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('add-cart-btn')) {
          const active = cardDiv.querySelector('.variant-image.active');
          if (active && typeof hooks.addToCart === 'function') {
            // adjust inventory + celebrations
            const proceed = handleAddForActive();
            if (proceed) hooks.addToCart({ name, condition: active.dataset.condition, price: active.dataset.price, image: active.getAttribute('src') });
          }
        } else if (btn.classList.contains('hires-btn')) {
          if (typeof hooks.onCardView === 'function') {
            hooks.onCardView({ name, set: entry.set || '', collector: entry.collector || '', lang: entry.lang || '' });
          }
          if (cardPageUrl) window.open(cardPageUrl, '_blank', 'noopener');
        } else {
          animateToCondition(cardDiv, btn.dataset.condition);
          // update last-copy badge visibility after animation completes
          setTimeout(updateButtons, 320);
        }
      });
    });

    const cardLink = cardDiv.querySelector('[data-card-link="true"]');
    if (cardLink) {
      cardLink.addEventListener('click', () => {
        if (typeof hooks.onCardView === 'function') {
          hooks.onCardView({ name, set: entry.set || '', collector: entry.collector || '', lang: entry.lang || '' });
        }
      });
    }

    cardDiv.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      const active = cardDiv.querySelector('.variant-image.active');
      if (active && typeof hooks.addToCart === 'function') {
        const proceed = handleAddForActive();
        if (proceed) hooks.addToCart({ name, condition: active.dataset.condition, price: active.dataset.price, image: active.getAttribute('src') });
      }
    });

    if (token !== currentRun) return;
    grid.appendChild(cardDiv);
  }
  if (token === currentRun && typeof hooks.onCardsRendered === 'function') {
    hooks.onCardsRendered();
  }
}

async function renderNextPage() {
  if (loadingNextPage || renderedCount >= cardEntries.length) return;
  if (typeof document === 'undefined') return;
  const runId = currentRun;
  const slice = cardEntries.slice(renderedCount, renderedCount + pageSize);
  if (!slice.length) return;
  loadingNextPage = true;
  try {
    await renderCardBatch(slice, { append: renderedCount > 0, runId });
    if (runId !== currentRun) return;
    renderedCount += slice.length;
  } finally {
    if (runId === currentRun) loadingNextPage = false;
  }
  if (typeof window !== 'undefined') {
    const shortPage = document.body.offsetHeight < window.innerHeight + 200;
    if (shortPage && renderedCount < cardEntries.length) {
      renderNextPage();
    }
  }
}

export async function fetchCardImages() {
  if (typeof document === 'undefined') return;
  currentRun += 1;
  resetPagination();
  await renderNextPage();
}

export async function changeVariant(button, condition, price) {
  const card = button.closest('.card');
  await animateToCondition(card, condition);
  if (card) {
    card.querySelector('.price').textContent = `Price: ${price}`;
    card.querySelector('.condition').textContent = `Condition: ${condition}`;
  }
}

export function cycleVariant(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  const activeIndex = images.findIndex(img => img.classList.contains('active'));
  const nextIndex = (activeIndex - 1 + images.length) % images.length;
  const active = images[activeIndex];
  const next = images[nextIndex];
  const card = stack.closest('.card');

  // Smoothly move each image to its next position
  images.forEach(img => {
    img.style.transition = 'transform 0.3s ease-in-out';
  });

  // Active image flips and slides to the back of the stack
  const bottom = images[0];
  const targetX = bottom.dataset.offsetX || 0;
  const targetY = bottom.dataset.offsetY || 0;
  const targetR = bottom.dataset.rotate || 0;
  active.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${targetR}deg) rotateY(180deg)`;

  // Remaining images shift forward one slot
  images.forEach((img, i) => {
    if (i !== activeIndex) {
      const ref = images[(i + 1) % images.length];
      img.style.transform = `translate(${ref.dataset.offsetX || 0}px, ${ref.dataset.offsetY || 0}px) rotate(${ref.dataset.rotate || 0}deg)`;
    }
  });

  // Lower z-index mid-animation so the card appears behind others
  setTimeout(() => {
    active.style.zIndex = 1;
  }, 150);

  return new Promise(resolve => {
    setTimeout(() => {
      images.forEach(img => {
        img.style.transition = '';
      });
      active.classList.remove('active');
      stack.insertBefore(active, stack.firstChild);
      next.classList.add('active');
      if (card) {
        const priceEl = card.querySelector('.price');
        const condEl = card.querySelector('.condition');
        if (priceEl) priceEl.textContent = `Price: ${next.dataset.price}`;
        if (condEl) condEl.textContent = `Condition: ${next.dataset.condition}`;
      }
      applyOffsets(stack);
      if (!stack._hovered) resetOffsets(stack);
      if (card && typeof card._updateButtons === 'function') {
        card._updateButtons();
      }
      resolve();
    }, 300);
  });
}

export async function animateToCondition(card, condition) {
  const stack = card.querySelector('.card-stack');
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  const currentIndex = images.findIndex(img => img.classList.contains('active'));
  const targetIndex = images.findIndex(img => img.dataset.condition === condition);
  let steps = (currentIndex - targetIndex + images.length) % images.length;

  while (steps > 0) {
    await cycleVariant(stack);
    await new Promise(r => setTimeout(r, 50));
    steps--;
  }
}

export function setGroup(group) {
  activeGroup = (group || 'frontpage').toLowerCase();
  activeQuery = '';
  activeSet = '';
  const list = buildGroupEntries(activeGroup);
  setDisplayList(list, { resetBase: true });
  refreshGrid({ prefetchSort: needsSortData(activeSort) });
}

export function searchCards(query) {
  const raw = (query || '').trim();
  const key = raw.toLowerCase();
  if (!key) {
    activeQuery = '';
    activeSet = '';
  } else if (SET_FILTERS[key] || SET_FORMAT_HINTS[key]) {
    activeSet = key;
    activeQuery = '';
  } else {
    activeQuery = key;
    activeSet = '';
  }
  refreshGrid({ prefetchSort: needsSortData(activeSort) });
}

export function getCardNames() {
  return cardEntries.map(entry => entry.name);
}

export function setFormatFilter(format) {
  activeFormat = (format || 'all').toLowerCase();
  if (activeFormat !== 'all') activeSet = '';
  refreshGrid({ prefetchSort: needsSortData(activeSort) });
}

export function setSetFilter(setKey) {
  activeSet = (setKey || '').trim().toLowerCase();
  activeQuery = '';
  if (inventoryEntries.length) {
    groupBaseList = getInventoryEntries();
  }
  refreshGrid({ prefetchSort: needsSortData(activeSort) });
}

export async function setSortFilter(mode) {
  activeSort = (mode || 'default').toLowerCase();
  await refreshGrid({ prefetchSort: needsSortData(activeSort) });
}

export function initCardGrid({ addToCart, showHires, onCardsRendered } = {}) {
  hooks.addToCart = typeof addToCart === 'function' ? addToCart : null;
  hooks.showHires = typeof showHires === 'function' ? showHires : null;
  hooks.onCardsRendered = typeof onCardsRendered === 'function' ? onCardsRendered : null;
  hooks.onCardView = typeof (arguments[0] && arguments[0].onCardView) === 'function'
    ? arguments[0].onCardView
    : null;
  ensureScrollPaging();
  loadFrontPageConfig().finally(() => {
    loadInventoryConfig().finally(() => {
      const initialGroup = typeof window !== 'undefined' ? window.__CARD_BAZAAR_GROUP : '';
      const initialSet = typeof window !== 'undefined' ? window.__CARD_BAZAAR_SET : '';
      if (initialSet) {
        setSetFilter(initialSet);
        return;
      }
      setGroup(initialGroup || 'trending');
    });
  });
}

