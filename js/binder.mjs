import { getCardImage, getCardPrice } from './scryfall.mjs';
import { notify } from './ui/notify.mjs';
import {
  addBinderItem,
  addSellOrderItem,
  addStoreCredit,
  clearSellOrder,
  getState,
  removeBinderItem,
  removeSellOrderItem,
  setBinder,
  setUser,
  subscribe,
} from './state.mjs';

const priceCache = new Map();
const fetchCache = new Map();

const state = getState();
const isCoarse = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(pointer: coarse)').matches;

const sellOrderList = document.getElementById('sellCartItems');
const sellOrderEmpty = document.getElementById('sellCartEmpty');
const sellOrderSummary = document.getElementById('sellCartTotal');
const sellOrderSubmit = document.getElementById('sellCartSubmit');
const sellOrderClear = document.getElementById('sellCartClear');

const binderLeftGrid = document.getElementById('binderLeftGrid');
const binderRightGrid = document.getElementById('binderRightGrid');
const binderSummary = document.getElementById('binderSummary');
const binderCreditValue = document.getElementById('binderCreditValue');
const binderEmpty = document.getElementById('binderEmpty');
const binderPrev = document.getElementById('binderPrev');
const binderNext = document.getElementById('binderNext');
const binderPageIndicator = document.getElementById('binderPageIndicator');

const searchInput = document.getElementById('globalSearchInput');
const searchButton = document.getElementById('globalSearchBtn');

const addName = document.getElementById('binderAddName');
const addSet = document.getElementById('binderAddSet');
const addCollector = document.getElementById('binderAddCollector');
const addLang = document.getElementById('binderAddLang');
const addCondition = document.getElementById('binderAddCondition');
const addQty = document.getElementById('binderAddQty');
const addBtn = document.getElementById('binderAddBtn');
const addMessage = document.getElementById('binderAddMessage');

const loginBtn = document.getElementById('loginBtn');
const loginForm = document.getElementById('loginForm');
const loginSubmit = document.getElementById('loginSubmit');
const loginCreate = document.getElementById('loginCreate');
const loginEmail = document.getElementById('loginEmail');
const userStatus = document.getElementById('userStatus');
const loginLabel = document.getElementById('loginLabel');
const loginProfile = document.getElementById('loginProfile');
const loginProfileName = document.getElementById('loginProfileName');
const loginSignOut = document.getElementById('loginSignOut');
const binderHeaderBtn = document.getElementById('binderHeaderBtn');

const RESET_KEY = 'cb_binder_reset_v2';
if (typeof localStorage !== 'undefined' && !localStorage.getItem(RESET_KEY)) {
  setBinder([]);
  clearSellOrder();
  localStorage.setItem(RESET_KEY, '1');
}

let currentPage = 0;
let searchQuery = '';
let renderQueued = false;

const ITEMS_PER_PAGE = 18;
const LEFT_PAGE_SLOTS = 9;

function applyStackOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  if (images.length < 2) return;
  const preset = [
    { x: -8, y: -8, r: -2 },
    { x: 6, y: -4, r: 2 },
    { x: 0, y: 0, r: 0 },
  ];
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
  if (active) active.style.zIndex = images.length + 10;
}

function resetStackOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  images.forEach((img) => {
    img.style.transform = 'translate(0px, 0px) rotate(0deg)';
  });
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function buildItemKey(item) {
  const name = normalizeKey(item.name);
  const set = normalizeKey(item.set);
  const collector = normalizeKey(item.collector);
  const lang = normalizeKey(item.lang);
  const parts = [name, set, collector, lang].filter(Boolean);
  return parts.join('|') || name;
}

function buildFetchUrl(item) {
  if (item.set && item.collector) {
    const set = encodeURIComponent(item.set);
    const collector = item.collector.includes('%')
      ? item.collector
      : encodeURIComponent(item.collector);
    if (item.lang) {
      const lang = encodeURIComponent(item.lang);
      return `https://api.scryfall.com/cards/${set}/${collector}/${lang}`;
    }
    return `https://api.scryfall.com/cards/${set}/${collector}`;
  }
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.name)}`;
}

async function fetchCardData(item) {
  const key = buildItemKey(item);
  if (priceCache.has(key)) return priceCache.get(key);
  if (fetchCache.has(key)) return fetchCache.get(key);
  const promise = fetch(buildFetchUrl(item))
    .then((res) => res.ok ? res.json() : null)
    .then((data) => {
      if (!data) return null;
      const price = getCardPrice(data);
      const image = getCardImage(data, ['normal', 'small']);
      const result = {
        price,
        image,
        name: data.name || item.name,
        set: data.set || '',
        collector_number: data.collector_number || '',
        lang: data.lang || '',
      };
      priceCache.set(key, result);
      return result;
    })
    .catch(() => null)
    .finally(() => {
      fetchCache.delete(key);
    });
  fetchCache.set(key, promise);
  return promise;
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderBinder();
  });
}

function groupBinder(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = buildItemKey(item);
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: item.name,
        set: item.set || '',
        collector: item.collector || '',
        lang: item.lang || '',
        image: item.image || '',
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return Array.from(groups.values());
}

function formatUsd(value) {
  const num = Number.isFinite(value) ? value : 0;
  return `$${num.toFixed(2)}`;
}

function renderSummary(groups) {
  const allItems = state.binder;
  const totalCount = allItems.length;
  let costTotal = 0;
  let liveTotal = 0;
  let missingLive = false;
  groups.forEach((group) => {
    const count = group.items.length;
    const purchaseSum = group.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    costTotal += purchaseSum;
    const cached = priceCache.get(group.key);
    if (cached && Number.isFinite(cached.price)) {
      liveTotal += cached.price * count;
    } else {
      missingLive = true;
    }
  });
  if (binderSummary) {
    if (missingLive) {
      binderSummary.textContent = `${totalCount} cards - Cost: ${formatUsd(costTotal)} - Live: Loading...`;
    } else {
      const delta = liveTotal - costTotal;
      const deltaText = delta === 0 ? '$0.00' : `${delta > 0 ? '+' : '-'}$${Math.abs(delta).toFixed(2)}`;
      const deltaClass = delta > 0 ? 'value-up' : (delta < 0 ? 'value-down' : '');
      binderSummary.innerHTML = `${totalCount} cards - Cost: ${formatUsd(costTotal)} - Live: ${formatUsd(liveTotal)} <span class="${deltaClass}">(${deltaText})</span>`;
    }
  }
  if (binderCreditValue) binderCreditValue.textContent = formatUsd(state.storeCredit);
}

function renderSellOrder() {
  if (!sellOrderList) return;
  sellOrderList.innerHTML = '';
  const items = state.sellOrder || [];
  let total = 0;
  items.forEach((item, idx) => {
    total += Number(item.offerPrice) || 0;
    const li = document.createElement('li');
    const img = item.image || '';
    li.className = 'cart-item';
    li.innerHTML = `
      <img class="cart-item-thumb" src="${img}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.condition || 'NM'} &mdash; ${formatUsd(item.offerPrice)}</div>
      </div>
    `;
    const remove = document.createElement('button');
    remove.className = 'cart-item-remove';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      removeSellOrderItem(idx);
      addBinderItem({
        name: item.name,
        condition: item.condition || 'NM',
        price: Number(item.purchasePrice) || 0,
        image: item.image || '',
        set: item.set || '',
        collector: item.collector || '',
        lang: item.lang || '',
      });
      renderSellOrder();
      scheduleRender();
    });
    li.appendChild(remove);
    sellOrderList.appendChild(li);
  });
  if (sellOrderSummary) sellOrderSummary.textContent = formatUsd(total);
  if (sellOrderEmpty) sellOrderEmpty.style.display = items.length ? 'none' : 'block';
  if (sellOrderList) sellOrderList.style.display = items.length ? 'flex' : 'none';
}

function renderGrid(container, groups, totalSlots = LEFT_PAGE_SLOTS) {
  if (!container) return;
  container.innerHTML = '';
  groups.forEach((group) => {
    const count = group.items.length;
    const purchaseAvg = count
      ? group.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0) / count
      : 0;
    const cached = priceCache.get(group.key);
    const livePrice = cached ? cached.price : null;
    const liveText = livePrice == null ? 'Loading...' : formatUsd(livePrice);
    const delta = livePrice == null ? null : livePrice - purchaseAvg;
    const deltaText = delta == null ? '' : `${delta > 0 ? '+' : '-'}$${Math.abs(delta).toFixed(2)}`;
    const deltaClass = delta > 0 ? 'value-up' : (delta < 0 ? 'value-down' : '');
    const image = group.image || (cached ? cached.image : '');

    const slot = document.createElement('div');
    slot.className = 'binder-slot';
    slot.dataset.key = group.key;
    const stackCount = Math.min(3, count);
    if (stackCount > 1) {
      const stackImages = Array.from({ length: stackCount }).map((_, index) => (
        `<img class="variant-image${index === 0 ? ' active' : ''}" src="${image}" alt="${group.name}">`
      )).join('');
      slot.innerHTML = `
        <div class="binder-slot-media">
          <div class="card-stack binder-card-stack">
            ${stackImages}
          </div>
          <div class="binder-slot-count">${count}</div>
          <div class="binder-slot-info">
            <div class="binder-slot-name">${group.name}</div>
            <div class="binder-slot-meta">Paid ${formatUsd(purchaseAvg)} - Live ${liveText}</div>
            <div class="binder-slot-delta ${deltaClass}">${deltaText}</div>
            <div class="binder-slot-actions">
              <button class="btn-ghost binder-sell" type="button" data-action="sell">Add to Sell Order</button>
              <button class="btn-ghost binder-remove" type="button" data-action="remove">Remove 1</button>
            </div>
          </div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="binder-slot-media">
          <img src="${image}" alt="${group.name}">
          <div class="binder-slot-count">${count}</div>
          <div class="binder-slot-info">
            <div class="binder-slot-name">${group.name}</div>
            <div class="binder-slot-meta">Paid ${formatUsd(purchaseAvg)} - Live ${liveText}</div>
            <div class="binder-slot-delta ${deltaClass}">${deltaText}</div>
            <div class="binder-slot-actions">
              <button class="btn-ghost binder-sell" type="button" data-action="sell">Add to Sell Order</button>
              <button class="btn-ghost binder-remove" type="button" data-action="remove">Remove 1</button>
            </div>
          </div>
        </div>
      `;
    }
    const stack = slot.querySelector('.binder-card-stack');
    if (stack && !isCoarse) {
      resetStackOffsets(stack);
      stack.addEventListener('mouseenter', () => applyStackOffsets(stack));
      stack.addEventListener('mouseleave', () => resetStackOffsets(stack));
    }
    container.appendChild(slot);

    if (!cached) {
      fetchCardData(group.items[0]).then((data) => {
        if (data && !group.image) {
          group.image = data.image || '';
        }
        scheduleRender();
      });
    }
  });
  for (let i = groups.length; i < totalSlots; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'binder-slot empty';
    empty.innerHTML = '<div class="binder-slot-media"></div>';
    container.appendChild(empty);
  }
}

function removeOneFromBinder(groupKey) {
  const idx = state.binder.findIndex((item) => buildItemKey(item) === groupKey);
  if (idx >= 0) {
    removeBinderItem(idx);
    renderBinder();
    renderSellOrder();
  }
}

function moveOneToSellOrder(groupKey) {
  const idx = state.binder.findIndex((item) => buildItemKey(item) === groupKey);
  if (idx < 0) return;
  const item = state.binder[idx];
  const cached = priceCache.get(groupKey);
  const livePrice = cached ? cached.price : Number(item.price) || 0;
  const offerPrice = Math.round(livePrice * 0.7 * 100) / 100;
  addSellOrderItem({
    name: item.name,
    condition: item.condition || 'NM',
    purchasePrice: Number(item.price) || 0,
    livePrice,
    offerPrice,
    image: item.image || '',
    set: item.set || '',
    collector: item.collector || '',
    lang: item.lang || '',
  });
  removeBinderItem(idx);
  renderSellOrder();
  renderBinder();
}

function renderBinder() {
  const groups = groupBinder(state.binder);
  const filtered = searchQuery
    ? groups.filter((group) => group.name.toLowerCase().includes(searchQuery))
    : groups;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentPage >= totalPages) currentPage = totalPages - 1;
  const start = currentPage * ITEMS_PER_PAGE;
  const pageGroups = filtered.slice(start, start + ITEMS_PER_PAGE);
  const left = pageGroups.slice(0, LEFT_PAGE_SLOTS);
  const right = pageGroups.slice(LEFT_PAGE_SLOTS);
  renderGrid(binderLeftGrid, left, LEFT_PAGE_SLOTS);
  renderGrid(binderRightGrid, right, LEFT_PAGE_SLOTS);
  if (binderEmpty) binderEmpty.style.display = state.binder.length ? 'none' : 'block';
  if (binderPageIndicator) binderPageIndicator.textContent = `Page ${currentPage + 1} of ${totalPages}`;
  if (binderPrev) binderPrev.disabled = currentPage <= 0;
  if (binderNext) binderNext.disabled = currentPage >= totalPages - 1;
  renderSummary(groups);
}

function handleBinderAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const slot = button.closest('.binder-slot');
  if (!slot) return;
  const key = slot.dataset.key;
  if (!key) return;
  event.preventDefault();
  event.stopPropagation();
  if (button.dataset.action === 'sell') {
    moveOneToSellOrder(key);
  } else if (button.dataset.action === 'remove') {
    removeOneFromBinder(key);
  }
}

if (binderLeftGrid) binderLeftGrid.addEventListener('click', handleBinderAction);
if (binderRightGrid) binderRightGrid.addEventListener('click', handleBinderAction);

function updateAuthDisplay() {
  if (state.user) {
    if (userStatus) userStatus.textContent = 'Logged in as ' + state.user.email;
    const username = state.user.email ? state.user.email.split('@')[0] : '';
    if (loginLabel) loginLabel.textContent = 'Account';
    if (loginProfileName) loginProfileName.textContent = username ? `@${username}` : 'Profile';
    if (loginProfile) loginProfile.style.display = 'flex';
    if (loginForm) {
      const box = loginForm.querySelector('.login-box');
      if (box) box.style.display = 'none';
    }
  } else {
    if (userStatus) userStatus.textContent = '';
    if (loginLabel) loginLabel.textContent = 'Log In / Sign Up';
    if (loginProfile) loginProfile.style.display = 'none';
    if (loginForm) {
      const box = loginForm.querySelector('.login-box');
      if (box) box.style.display = 'flex';
    }
  }
}

function setLoginFormOpen() {
  if (loginBtn) {
    loginBtn.classList.add('open');
    loginBtn.classList.add('expanded');
    loginBtn.setAttribute('aria-expanded', 'true');
  }
  if (loginForm) {
    loginForm.setAttribute('aria-hidden', 'false');
    loginForm.style.display = 'flex';
  }
}

function initNavButtons() {
  document.querySelectorAll('[data-nav="home"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  });
}

function runSearch() {
  searchQuery = (searchInput && searchInput.value || '').trim().toLowerCase();
  currentPage = 0;
  renderBinder();
}

async function addManualCard() {
  if (!addName) return;
  const name = addName.value.trim();
  if (!name) {
    notify('error', 'Enter a card name to add.');
    return;
  }
  if (addMessage) addMessage.textContent = 'Loading card details...';
  const entry = {
    name,
    set: addSet && addSet.value.trim().toLowerCase(),
    collector: addCollector && addCollector.value.trim(),
    lang: addLang && addLang.value.trim().toLowerCase(),
  };
  const data = await fetchCardData(entry);
  if (!data) {
    if (addMessage) addMessage.textContent = 'Card not found. Check name or set/collector.';
    return;
  }
  const qty = Math.max(1, parseInt(addQty && addQty.value, 10) || 1);
  const condition = addCondition ? addCondition.value : 'NM';
  const cardPrice = Number.isFinite(data.price) ? data.price : 0;
  const addSetValue = data.set || entry.set || '';
  const addCollectorValue = data.collector_number || entry.collector || '';
  const addLangValue = data.lang || entry.lang || '';
  for (let i = 0; i < qty; i++) {
    addBinderItem({
      name: data.name || name,
      condition,
      price: cardPrice,
      image: data.image || '',
      set: addSetValue,
      collector: addCollectorValue,
      lang: addLangValue,
    });
  }
  if (addMessage) addMessage.textContent = `Added ${qty} to your binder.`;
  addName.value = '';
  if (addQty) addQty.value = '1';
}

if (sellOrderClear) sellOrderClear.addEventListener('click', () => clearSellOrder());
if (sellOrderSubmit) sellOrderSubmit.addEventListener('click', () => {
  const items = state.sellOrder || [];
  if (!items.length) {
    notify('warn', 'Your sell order is empty.');
    return;
  }
  const total = items.reduce((sum, item) => sum + (Number(item.offerPrice) || 0), 0);
  addStoreCredit(total);
  clearSellOrder();
  alert(`Sell order submitted for ${formatUsd(total)} credit.`);
});

if (searchButton) searchButton.addEventListener('click', runSearch);
if (searchInput) {
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch();
  });
}

if (binderPrev) binderPrev.addEventListener('click', () => {
  currentPage = Math.max(0, currentPage - 1);
  renderBinder();
});
if (binderNext) binderNext.addEventListener('click', () => {
  currentPage += 1;
  renderBinder();
});

if (addBtn) addBtn.addEventListener('click', addManualCard);
if (addName) {
  addName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addManualCard();
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    setLoginFormOpen();
  });
}

if (loginSubmit) loginSubmit.addEventListener('click', () => {
  setUser({ email: loginEmail.value || 'user@example.com' });
  updateAuthDisplay();
});

if (loginCreate) {
  loginCreate.addEventListener('click', () => {
    notify('info', 'Account creation is coming soon.');
  });
}

if (loginSignOut) {
  loginSignOut.addEventListener('click', () => {
    setUser(null);
    updateAuthDisplay();
  });
}

initNavButtons();
updateAuthDisplay();
if (!state.user) setLoginFormOpen();
renderBinder();
renderSellOrder();

subscribe(() => {
  renderBinder();
  renderSellOrder();
});
