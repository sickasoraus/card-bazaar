import { api, getCardImage, getCardPrice } from './api.mjs';
import { initCardGrid, setGroup, searchCards, getCardNames, setSetFilter, setSortFilter } from './cards.mjs';
import { STORAGE_KEYS, safeGetItem, safeJSONParse, safeSetItem } from './storage.mjs';
import {
  addBinderItem,
  addCartItem,
  addSellOrderItem,
  addStoreCredit,
  clearCart,
  clearSellOrder,
  getState,
  removeBinderItem,
  removeCartItem,
  removeSellOrderItem,
  reorderBinder,
  setStoreCredit,
  setUser,
  subscribe,
} from './state.mjs';
import { setOverlayVisible } from './ui/overlays.mjs';
import { notify } from './ui/notify.mjs';

export function initApp() {
  if (typeof document === 'undefined') return;

  const state = getState();

  // --- Cart logic ---
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const cartEmptyState = document.getElementById('cartEmptyState');
  const cartSavedBadge = document.getElementById('cartSavedBadge');
  const discountCodeInput = document.getElementById('discountCodeInput');
  const discountApplyBtn = document.getElementById('discountApplyBtn');
  const freeShippingNote = document.getElementById('freeShippingNote');
  const cartStoreCredit = document.getElementById('cartStoreCredit');
  const buyCartTab = document.getElementById('buyCartTab');
  const sellCartTab = document.getElementById('sellCartTab');
  const buyCartPanel = document.getElementById('buyCartPanel');
  const sellCartPanel = document.getElementById('sellCartPanel');
  const sellCartItemsEl = document.getElementById('sellCartItems');
  const sellCartTotal = document.getElementById('sellCartTotal');
  const sellCartEmpty = document.getElementById('sellCartEmpty');
  const sellCartSubmit = document.getElementById('sellCartSubmit');
  const sellCartClear = document.getElementById('sellCartClear');
  const sellFastTrack = document.getElementById('sellFastTrack');
  const contactBtn = document.getElementById('contactBtn');
  const contactFooterLink = document.getElementById('contactFooterLink');
  const contactOverlay = document.getElementById('contactOverlay');
  const contactCloseBtn = document.getElementById('contactCloseBtn');
  const sortSelect = document.getElementById('frontSort');

  const signalKey = (type) => `cb_signal_${type}`;
  function recordSignal(type, payload) {
    if (!payload || !payload.name) return;
    try {
      const key = signalKey(type);
      const existing = safeJSONParse(safeGetItem(key, '[]'), []);
      existing.unshift({ ...payload, ts: Date.now() });
      const trimmed = existing.slice(0, 50);
      safeSetItem(key, JSON.stringify(trimmed));
    } catch (_) {}
  }
  // --- Binder state ---
  const binderGrid = document.getElementById('binderGrid');
  const binderListEmptyEl = document.getElementById('binderListEmpty');
  const binderSummaryEl = document.getElementById('binderSummary');

  function renderBinder() {
    if (!binderGrid) return;
    binderGrid.innerHTML = '';
    let total = 0;
    state.binder.forEach((it, idx) => {
      total += it.price;
      const card = document.createElement('div');
      card.className = 'binder-item';
      card.setAttribute('draggable','true');
      card.dataset.index = String(idx);
      card.innerHTML = `
        <img src="${it.image || ''}" alt="${it.name}">
        <div class="meta"><span>${it.condition}</span><span>$${it.price.toFixed(2)}</span></div>
        <div class="actions">
          <button class="sell-btn">Sell 70%</button>
          <button class="rm-btn">Remove</button>
        </div>
      `;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(idx));
      });
      card.addEventListener('dragover', (e) => e.preventDefault());
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        const to = idx;
        if (!Number.isFinite(from) || from === to) return;
        reorderBinder(from, to);
        renderBinder();
      });
      card.querySelector('.sell-btn').addEventListener('click', () => {
        const credit = Math.round(it.price * 0.7 * 100) / 100;
        addStoreCredit(credit);
        removeBinderItem(idx);
        renderBinder();
        renderCart();
      });
      card.querySelector('.rm-btn').addEventListener('click', () => {
        removeBinderItem(idx);
        renderBinder();
      });
      binderGrid.appendChild(card);
    });
    if (binderListEmptyEl) binderListEmptyEl.style.display = state.binder.length ? 'none' : 'block';
    if (binderSummaryEl) {
      binderSummaryEl.textContent = state.binder.length ? `${state.binder.length} cards - $${total.toFixed(2)}` : '';
    }
  }
  // Initial draw
  try { renderBinder(); } catch(_) {}

  // --- Personalized Suggestions ---
  const suggestSection = document.getElementById('suggestSection');
  const suggestRow = document.getElementById('suggestRow');
  const refreshSuggest = document.getElementById('refreshSuggest');

  async function suggestFromSeed(seedName) {
    try {
      const base = await api.cards.byName(seedName);
      const typeLine = (base.type_line || '').toLowerCase();
      const types = ['planeswalker','creature','instant','sorcery','artifact','enchantment','land'];
      let type = 'card';
      for (const t of types) {
        if (typeLine.includes(t)) { type = t; break; }
      }
      const ci = Array.isArray(base.color_identity) && base.color_identity.length ? base.color_identity.join('').toLowerCase() : '';
      const parts = [`type:${type}`, ci ? `ci:${ci}` : '', `-name:\"${seedName}\"`, 'game:paper', '-is:funny', 'unique:prints', 'order:edhrec'];
      const q = parts.filter(Boolean).join(' ');
      const data = await api.cards.search(q);
      if (!data || !Array.isArray(data.data)) return [];
      return data.data.slice(0, 10);
    } catch(_) { return []; }
  }

  function formatUSD(v) { return `$${(Number(v)||0).toFixed(2)}`; }

  async function buildSuggestions() {
    if (!suggestRow || !suggestSection) return;
    suggestRow.innerHTML = '';
    let seed = null;
    if (state.binder.length) seed = state.binder[0].name;
    if (!seed) {
      const names = getCardNames();
      if (names.length) seed = names[Math.floor(Math.random()*names.length)];
    }
    if (!seed) { suggestSection.style.display = 'none'; return; }
    const list = await suggestFromSeed(seed);
    if (!list.length) { suggestSection.style.display = 'none'; return; }
    suggestSection.style.display = 'block';
    list.forEach(card => {
      const img = getCardImage(card, ['small', 'normal']);
      const price = getCardPrice(card);
      const tile = document.createElement('div');
      tile.className = 'suggest-card';
      tile.innerHTML = `
        <div class="suggest-card-media">
          <img class="suggest-card-image" src="${img}" alt="${card.name}">
        </div>
        <div class="suggest-card-name">${card.name}</div>
        <div class="suggest-card-price">NM ${formatUSD(price)}</div>
        <button class="btn-cta suggest-card-btn">Add to Cart</button>
      `;
      tile.querySelector('button').addEventListener('click', () => {
        addToCart({ name: card.name, condition: 'NM', price: formatUSD(price), image: img });
      });
      suggestRow.appendChild(tile);
    });
  }
  if (refreshSuggest) refreshSuggest.addEventListener('click', buildSuggestions);
  try { buildSuggestions(); } catch(_) {}

  // --- Pack Opener ---
  const openPackBtn = document.getElementById('openPackBtn');
  const packOverlay = document.getElementById('packOverlay');
  const packCloseBtn = document.getElementById('packCloseBtn');
  const openPackGo = document.getElementById('openPackGo');
  const packSetSelect = document.getElementById('packSetSelect');
  const packGrid = document.getElementById('packGrid');
  let packCards = [];

  function openPackModal() {
    if (!packOverlay) return;
    setOverlayVisible(packOverlay, true);
    packGrid.innerHTML = '';
    packCards = [];
  }
  function closePackModal() { setOverlayVisible(packOverlay, false); }
  if (openPackBtn) openPackBtn.addEventListener('click', openPackModal);
  if (packCloseBtn) packCloseBtn.addEventListener('click', closePackModal);
  if (packOverlay) packOverlay.addEventListener('click', (e)=>{ if(e.target===packOverlay) closePackModal(); });

  async function openPack() {
    if (!packGrid) return;
    packGrid.innerHTML = '';
    packCards = [];
    const set = packSetSelect ? packSetSelect.value : 'dmu';
    // Simple 10-card pack for prototype
    for (let i=0;i<10;i++) {
      try {
        const c = await api.cards.randomFromSet(set);
        const img = getCardImage(c, ['normal', 'small']);
        const price = getCardPrice(c);
        packCards.push({ name: c.name, img, price });
        const cell = document.createElement('div');
        cell.className = 'pack-card';
        cell.innerHTML = `
          <div class="pack-card-media">
            <img class="pack-card-image" src="${img}" alt="${c.name}">
          </div>
          <div class="pack-card-name">${c.name}</div>
          <div class="pack-card-price">NM $${price.toFixed(2)}</div>
        `;
        packGrid.appendChild(cell);
      } catch(_) {}
    }
  }
  if (openPackGo) openPackGo.addEventListener('click', openPack);
  const packAddAll = document.getElementById('packAddAll');
  const packSellAll = document.getElementById('packSellAll');
  if (packAddAll) packAddAll.addEventListener('click', ()=>{
    if (!packCards.length) return;
    packCards.forEach(c => addToCart({ name: c.name, condition: 'NM', price: `$${(c.price||0).toFixed(2)}`, image: c.img }));
    alert('All pack cards added to cart.');
  });
  if (packSellAll) packSellAll.addEventListener('click', ()=>{
    if (!packCards.length) return;
    let total = packCards.reduce((s,c)=>s+(c.price||0),0);
    const credit = Math.round(total*0.7*100)/100;
    addStoreCredit(credit);
    renderCart();
    alert(`Sold pack to store for $${credit.toFixed(2)} credit.`);
  });

  // --- Checkout Modal (re-add logic) ---
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  const checkoutPlaceBtn = document.getElementById('checkoutPlaceBtn');
  const checkoutCancelBtn = document.getElementById('checkoutCancelBtn');
  const checkoutSummary = document.getElementById('checkoutSummary');
  const applyStoreCredit = document.getElementById('applyStoreCredit');
  const availableCredit = document.getElementById('availableCredit');
  const shipName = document.getElementById('shipName');
  const shipAddr = document.getElementById('shipAddr');
  const shipCity = document.getElementById('shipCity');
  const shipState = document.getElementById('shipState');
  const shipZip = document.getElementById('shipZip');
  const shipStandard = document.getElementById('shipStandard');
  const shipSameDay = document.getElementById('shipSameDay');
  const sameDayRow = document.getElementById('sameDayRow');
  const sameDayNote = document.getElementById('sameDayNote');
  const checkoutItems = document.getElementById('checkoutItems');
  const checkoutTotals = document.getElementById('checkoutTotals');

  let shippingCost = 0;
  function zipAllowsSameDay(zip) { return /^981\d{2}$/.test(zip || ''); }
  function updateSameDayAvailability() {
    const zip = shipZip && shipZip.value || '';
    const allowed = zipAllowsSameDay(zip);
    if (sameDayRow) sameDayRow.style.display = allowed ? 'flex' : 'none';
    if (sameDayNote) sameDayNote.style.display = allowed ? 'block' : 'none';
    if (!allowed && shipSameDay) shipSameDay.checked = false;
    recalcCheckoutSummary();
  }
  function recalcCheckoutSummary() {
    if (!checkoutSummary) return;
    const itemsTotal = state.cart.reduce((s,i)=>s+i.price,0);
    shippingCost = (shipSameDay && shipSameDay.checked) ? 9.99 : 0;
    let total = itemsTotal + shippingCost;
    let creditApplied = 0;
    if (applyStoreCredit && applyStoreCredit.checked && state.storeCredit > 0) {
      creditApplied = Math.min(state.storeCredit, total);
      total = Math.max(0, total - creditApplied);
    }
    checkoutSummary.textContent = `Items: ${state.cart.length} - Items Total: $${itemsTotal.toFixed(2)} - Shipping: $${shippingCost.toFixed(2)} - Credit Applied: $${creditApplied.toFixed(2)} - Pay: $${total.toFixed(2)}`;
    if (availableCredit) availableCredit.textContent = `(Available: $${state.storeCredit.toFixed(2)})`;
    if (checkoutItems) {
      checkoutItems.innerHTML = '';
      state.cart.forEach((item) => {
        const row = document.createElement('li');
        row.className = 'checkout-invoice-item';
        row.innerHTML = `<span>${item.name} (${item.condition})</span><span>$${item.price.toFixed(2)}</span>`;
        checkoutItems.appendChild(row);
      });
    }
    if (checkoutTotals) {
      checkoutTotals.textContent = `Subtotal $${itemsTotal.toFixed(2)} + Shipping $${shippingCost.toFixed(2)} - Credit $${creditApplied.toFixed(2)} = $${total.toFixed(2)}`;
    }
  }
  function openCheckout() {
    if (!checkoutOverlay) return;
    if (!state.cart.length) {
      notify('error', 'Your cart is empty.');
      return;
    }
    // reset defaults
    if (shipStandard) shipStandard.checked = true;
    if (shipSameDay) shipSameDay.checked = false;
    if (applyStoreCredit) applyStoreCredit.checked = state.storeCredit > 0;
    updateSameDayAvailability();
    recalcCheckoutSummary();
    setOverlayVisible(checkoutOverlay, true);
  }
  function closeCheckout() {
    setOverlayVisible(checkoutOverlay, false);
  }
  if (checkoutCancelBtn) checkoutCancelBtn.addEventListener('click', closeCheckout);
  if (applyStoreCredit) applyStoreCredit.addEventListener('change', recalcCheckoutSummary);
  if (shipStandard) shipStandard.addEventListener('change', recalcCheckoutSummary);
  if (shipSameDay) shipSameDay.addEventListener('change', recalcCheckoutSummary);
  if (shipZip) shipZip.addEventListener('input', updateSameDayAvailability);
  if (checkoutPlaceBtn) checkoutPlaceBtn.addEventListener('click', () => {
    const nameOk = shipName && shipName.value;
    const addrOk = shipAddr && shipAddr.value;
    const cityOk = shipCity && shipCity.value;
    const stateOk = shipState && shipState.value;
    const zipOk = shipZip && shipZip.value;
    if (!(nameOk && addrOk && cityOk && stateOk && zipOk)) {
      notify('error', 'Please enter a shipping name, address, city, state, and ZIP.');
      return;
    }
    // recompute order totals
    const itemsTotal = state.cart.reduce((s,i)=>s+i.price,0);
    shippingCost = (shipSameDay && shipSameDay.checked) ? 9.99 : 0;
    let total = itemsTotal + shippingCost;
    if (applyStoreCredit && applyStoreCredit.checked && state.storeCredit > 0) {
      const applied = Math.min(state.storeCredit, total);
      setStoreCredit(state.storeCredit - applied);
      total = Math.max(0, total - applied);
    }
    if (state.user) {
      state.cart.forEach(it => addBinderItem({ name: it.name, condition: it.condition, price: it.price, image: it.image || '' }));
      state.cart.forEach(it => recordSignal('purchase', { name: it.name }));
      renderBinder();
    }
    clearCart();
    renderCart();
    closeCheckout();
    alert(state.user ? 'Order placed! Items added to your binder.' : 'Order placed! Create an account to track purchases in your binder next time.');
  });
  if (checkoutBtn) checkoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); openCheckout(); });

  function renderBuyCart() {
    if (cartItemsEl) {
      cartItemsEl.innerHTML = '';
      state.cart.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        const img = item.image || '';
        li.innerHTML = `
          <img class="cart-item-thumb" src="${img}" alt="${item.name}">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-meta">${item.condition} &mdash; $${item.price.toFixed(2)}</div>
          </div>
        `;
        const remove = document.createElement('button');
        remove.className = 'cart-item-remove';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => removeFromCart(idx));
        li.appendChild(remove);
        cartItemsEl.appendChild(li);
      });
      cartItemsEl.style.display = state.cart.length ? 'flex' : 'none';
    }
    const total = state.cart.reduce((sum, i) => sum + i.price, 0);
    if (cartTotalEl) cartTotalEl.textContent = `Total: $${total.toFixed(2)}`;
    if (checkoutBtn) {
      checkoutBtn.style.display = state.cart.length ? 'block' : 'none';
      checkoutBtn.disabled = state.cart.length === 0;
    }
    if (cartEmptyState) {
      cartEmptyState.style.display = state.cart.length === 0 ? 'flex' : 'none';
    }
    if (cartSavedBadge) {
      const savedKey = 'cb_cart_saved_at';
      if (state.cart.length) {
        const existing = Number(localStorage.getItem(savedKey) || 0);
        if (!existing) localStorage.setItem(savedKey, String(Date.now()));
      } else {
        localStorage.removeItem(savedKey);
      }
      const stored = Number(localStorage.getItem(savedKey) || 0);
      if (!stored) {
        cartSavedBadge.textContent = '';
        cartSavedBadge.style.display = 'none';
      } else {
        cartSavedBadge.style.display = 'inline-flex';
        const days = Math.floor((Date.now() - stored) / (24 * 60 * 60 * 1000));
        if (days <= 0) cartSavedBadge.textContent = 'Saved today';
        else if (days >= 7) cartSavedBadge.textContent = 'Saved 7+ days';
        else cartSavedBadge.textContent = `Saved ${days} day${days === 1 ? '' : 's'}`;
      }
    }
    if (freeShippingNote) {
      const threshold = 75;
      if (total >= threshold) {
        freeShippingNote.textContent = 'Free shipping unlocked (orders over $75).';
      } else {
        const diff = Math.max(0, threshold - total);
        freeShippingNote.textContent = `Free shipping over $75 ($5.99 otherwise) - add $${diff.toFixed(2)} more.`;
      }
    }
    if (cartStoreCredit) cartStoreCredit.textContent = `+$${state.storeCredit.toFixed(2)} credit`;
  }

  function renderSellCart() {
    if (!sellCartItemsEl) return;
    sellCartItemsEl.innerHTML = '';
    const items = state.sellOrder || [];
    let total = 0;
    items.forEach((item, idx) => {
      total += Number(item.offerPrice) || 0;
      const li = document.createElement('li');
      li.className = 'cart-item';
      const img = item.image || '';
      li.innerHTML = `
        <img class="cart-item-thumb" src="${img}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.condition || 'NM'} &mdash; $${Number(item.offerPrice || 0).toFixed(2)}</div>
        </div>
      `;
      const remove = document.createElement('button');
      remove.className = 'cart-item-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        removeSellOrderItem(idx);
        renderCart();
      });
      li.appendChild(remove);
      sellCartItemsEl.appendChild(li);
    });
    sellCartItemsEl.style.display = items.length ? 'flex' : 'none';
    const fastTrackBonus = items.length && sellFastTrack && sellFastTrack.checked ? 0.05 : 0;
    const adjustedTotal = total * (1 + fastTrackBonus);
    if (sellCartTotal) {
      sellCartTotal.textContent = `$${adjustedTotal.toFixed(2)}${fastTrackBonus ? ' (fast-track +5%)' : ''}`;
    }
    if (sellCartEmpty) sellCartEmpty.style.display = items.length ? 'none' : 'block';
  }

  function renderCart() {
    renderBuyCart();
    renderSellCart();
  }

  subscribe(() => {
    renderCart();
  });

  let activeCartTab = 'buy';

  function addToCart(item) {
    const rawPrice = typeof item.price === 'string' ? item.price.replace('$', '') : item.price;
    const priceNum = parseFloat(rawPrice);
    const normalizedPrice = Number.isFinite(priceNum) ? priceNum : 0;
    recordSignal('cart', { name: item.name });
    if (activeCartTab === 'sell') {
      const offerPrice = Math.round(normalizedPrice * 0.7 * 100) / 100;
      addSellOrderItem({
        name: item.name,
        condition: item.condition || 'NM',
        purchasePrice: normalizedPrice,
        livePrice: normalizedPrice,
        offerPrice,
        image: item.image || '',
        set: item.set || '',
        collector: item.collector || '',
        lang: item.lang || '',
      });
    } else {
      addCartItem({ ...item, price: normalizedPrice });
    }
    renderCart();
  }

  function removeFromCart(index) {
    removeCartItem(index);
    renderCart();
  }

  renderCart();
  if (buyCartTab && sellCartTab && buyCartPanel && sellCartPanel) {
    const setTab = (tab) => {
      const isBuy = tab === 'buy';
      activeCartTab = isBuy ? 'buy' : 'sell';
      buyCartTab.classList.toggle('active', isBuy);
      sellCartTab.classList.toggle('active', !isBuy);
      buyCartPanel.style.display = isBuy ? 'flex' : 'none';
      sellCartPanel.style.display = isBuy ? 'none' : 'flex';
    };
    buyCartTab.addEventListener('click', () => setTab('buy'));
    sellCartTab.addEventListener('click', () => setTab('sell'));
    setTab(buyCartTab.classList.contains('active') ? 'buy' : 'sell');
  }
  if (sellCartClear) sellCartClear.addEventListener('click', () => {
    clearSellOrder();
    renderCart();
  });
  if (sellFastTrack) sellFastTrack.addEventListener('change', renderCart);
  if (sellCartSubmit) sellCartSubmit.addEventListener('click', () => {
    const items = state.sellOrder || [];
    if (!items.length) {
      notify('warn', 'Your sell cart is empty.');
      return;
    }
    const total = items.reduce((sum, item) => sum + (Number(item.offerPrice) || 0), 0);
    const bonusRate = sellFastTrack && sellFastTrack.checked ? 0.05 : 0;
    const adjusted = total * (1 + bonusRate);
    addStoreCredit(adjusted);
    clearSellOrder();
    renderCart();
    alert(`Sell order submitted for $${adjusted.toFixed(2)} credit.`);
  });

  function openContactModal() {
    if (!contactOverlay) return;
    setOverlayVisible(contactOverlay, true);
  }
  function closeContactModal() {
    if (!contactOverlay) return;
    setOverlayVisible(contactOverlay, false);
  }
  if (contactOverlay && contactBtn) contactBtn.addEventListener('click', openContactModal);
  if (contactOverlay && contactFooterLink) contactFooterLink.addEventListener('click', (event) => {
    event.preventDefault();
    openContactModal();
  });
  if (contactOverlay && contactCloseBtn) contactCloseBtn.addEventListener('click', closeContactModal);
  if (contactOverlay) {
    contactOverlay.addEventListener('click', (event) => {
      if (event.target === contactOverlay) closeContactModal();
    });
  }

  // --- Binder and Sell sections ---

  // Header popups removed in this layout

  // --- Simple authentication ---
  const loginBtn = document.getElementById('loginBtn');
  const binderHeaderBtn = document.getElementById('binderHeaderBtn');
  const loginForm = document.getElementById('loginForm');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginCreate = document.getElementById('loginCreate');
  const loginEmail = document.getElementById('loginEmail');
  const userStatus = document.getElementById('userStatus');
  const loginLabel = document.getElementById('loginLabel');
  const loginProfile = document.getElementById('loginProfile');
  const loginProfileName = document.getElementById('loginProfileName');
  const loginSignOut = document.getElementById('loginSignOut');
  const searchInput = document.getElementById('globalSearchInput');
  const searchButton = document.getElementById('globalSearchBtn');

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
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'inline-flex';
    } else {
      if (userStatus) userStatus.textContent = '';
      if (loginLabel) loginLabel.textContent = 'Log In / Sign Up';
      if (loginProfile) loginProfile.style.display = 'none';
      if (loginForm) {
        const box = loginForm.querySelector('.login-box');
        if (box) box.style.display = 'flex';
      }
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'none';
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      setLoginFormOpen();
    });
  }

  if (loginSubmit) loginSubmit.addEventListener('click', () => {
    // Accept any input for now
    setUser({ email: loginEmail.value || 'user@example.com' });
    updateAuthDisplay();
    // Trigger one-time daily spin for logged-in user
    try { maybeShowDailySpin(); } catch(_){}
    // Hide email capture if it was open
    try { const ov = document.getElementById('cbEmailOverlay'); setOverlayVisible(ov, false); } catch(_){}
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

  updateAuthDisplay();
  if (!state.user) setLoginFormOpen();
  // If already logged in, show the daily spin once after a short delay
  setTimeout(() => { try { maybeShowDailySpin(); } catch(_){} }, 800);

  function runSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (!query) {
      setGroup('trending');
      return;
    }
    searchCards(query);
  }

  if (searchButton) searchButton.addEventListener('click', runSearch);
  if (searchInput) searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch();
  });
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 200);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      setSortFilter(sortSelect.value);
    });
  }

  document.querySelectorAll('.group-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.group-link').forEach((link) => link.classList.remove('active'));
      document.querySelectorAll('.set-link').forEach((link) => link.classList.remove('active'));
      btn.classList.add('active');
      const group = btn.dataset.group || 'frontpage';
      setGroup(group);
      if (searchInput) searchInput.value = '';
    });
  });
  document.querySelectorAll('.set-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.set-link').forEach((link) => link.classList.remove('active'));
      btn.classList.add('active');
      const term = btn.dataset.set || '';
      setSetFilter(term);
      if (searchInput) searchInput.value = '';
    });
  });

  if (discountApplyBtn) {
    discountApplyBtn.addEventListener('click', () => {
      const code = discountCodeInput && discountCodeInput.value.trim();
      if (!code) {
        notify('warn', 'Enter a discount code to apply.');
        return;
      }
      notify('info', 'Discount codes are coming soon.');
    });
  }


  // --- Email capture modal (waitlist) ---
  const EMAIL_CAPTURE_ENDPOINT = null; // set to a backend URL later; null = simulate
  const overlay = document.getElementById('cbEmailOverlay');
  const submitBtn = document.getElementById('cbEmailSubmit');
  const dismissBtn = document.getElementById('cbEmailDismiss');
  const inputEl = document.getElementById('cbEmailInput');
  const msgEl = document.getElementById('cbEmailMessage');
  const modalStack = document.getElementById('cbModalStack');
  const waitlistImg = document.getElementById('cbWaitlistArt');
  // Daily Spin elements

  function shouldShowEmailCapture() {
    try { return !!overlay && !state.user; } catch(_) { return !state.user; }
  }

  function showEmailCapture() {
    if (!overlay) return;
    setOverlayVisible(overlay, true);
    setTimeout(() => { try { inputEl && inputEl.focus(); } catch(_){} }, 50);
  }

  function hideEmailCapture() {
    if (!overlay) return;
    setOverlayVisible(overlay, false);
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function submitEmail() {
    const email = (inputEl && inputEl.value || '').trim();
    if (!validEmail(email)) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#c62828';
        msgEl.textContent = 'Please enter a valid email.';
      }
      return;
    }
    try {
      if (EMAIL_CAPTURE_ENDPOINT) {
        await fetch(EMAIL_CAPTURE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ts: Date.now() })
        });
      }
      safeSetItem(STORAGE_KEYS.emailCaptureSubmitted, JSON.stringify({ email, ts: Date.now() }));
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#2e7d32';
        msgEl.textContent = 'Thanks! You\'re on the waitlist.';
      }
      setTimeout(hideEmailCapture, 1200);
    } catch (_) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.color = '#c62828';
        msgEl.textContent = 'Something went wrong. Please try again later.';
      }
    }
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      safeSetItem(STORAGE_KEYS.emailCaptureOptedOut, '1');
      hideEmailCapture();
    });
  }
  if (submitBtn) {
    submitBtn.addEventListener('click', submitEmail);
  }
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitEmail();
      }
    });
  }

  // Show after short delay when not logged in
  setTimeout(() => { if (shouldShowEmailCapture()) showEmailCapture(); }, 1200);

  const WAITLIST_FEATURE = 'Teferi, Hero of Dominaria';

  async function applyWaitlistArt() {
    try {
      const data = await api.cards.byName(WAITLIST_FEATURE);
      const img = getCardImage(data, ['normal']);
      if (img) {
        if (waitlistImg) {
          waitlistImg.src = img;
          waitlistImg.style.display = 'block';
          waitlistImg.alt = data.name || 'Featured card art';
        } else if (modalStack) {
          modalStack.innerHTML = `<img class="cb-waitlist-art" src="${img}" alt="Featured card art">`;
        }
        return;
      }
    } catch (_) {}
    if (waitlistImg && !waitlistImg.getAttribute('src')) {
      waitlistImg.style.display = 'none';
    }
  }

  applyWaitlistArt();
  // --- High-res image overlay helpers ---
  const hiresOverlay = document.getElementById('hiresOverlay');
  const hiresImage = document.getElementById('hiresImage');
  const hiresClose = document.getElementById('hiresClose');
  function showHires(url) {
    if (!hiresOverlay || !hiresImage) return;
    hiresImage.src = url;
    setOverlayVisible(hiresOverlay, true);
  }
  function hideHires() {
    if (!hiresOverlay) return;
    setOverlayVisible(hiresOverlay, false);
  }
  if (hiresClose) hiresClose.addEventListener('click', hideHires);
  if (hiresOverlay) hiresOverlay.addEventListener('click', (e) => { if (e.target === hiresOverlay) hideHires(); });

  // --- Daily Spin logic ---
  const spinOverlay = document.getElementById('cbWheelOverlay');
  const spinBtn = document.getElementById('cbWheelSpin');
  const spinDismiss = document.getElementById('cbWheelDismiss');
  const spinResult = document.getElementById('cbWheelResult');
  const spinWheel = document.getElementById('cbWheel');
  const REWARDS = [
    { id: 'credit10', label: '$10 Store Credit' },
    { id: 'ship_free', label: 'Free Shipping' },
    { id: 'points100', label: '100 CB Points' },
    { id: 'free_card', label: 'A Free Card' },
  ];

  function hasSpunOnce() {
    try {
      if (!state.user) return false;
      const rec = safeJSONParse(safeGetItem(STORAGE_KEYS.spinOnce, '{}'), {});
      return !!rec[state.user.email];
    } catch(_) { return false; }
  }
  function setSpunOnce(reward) {
    try {
      if (!state.user) return;
      const rec = safeJSONParse(safeGetItem(STORAGE_KEYS.spinOnce, '{}'), {});
      rec[state.user.email] = { ts: Date.now(), reward };
      safeSetItem(STORAGE_KEYS.spinOnce, JSON.stringify(rec));
    } catch(_){}
  }

  function appendRewardLedger(entry) {
    try {
      const arr = safeJSONParse(safeGetItem(STORAGE_KEYS.rewardsLedger, '[]'), []);
      arr.push({ ...entry, ts: Date.now() });
      safeSetItem(STORAGE_KEYS.rewardsLedger, JSON.stringify(arr));
    } catch(_){}
  }

  function showSpinOverlay() {
    if (!spinOverlay) return;
    setOverlayVisible(spinOverlay, true);
    if (spinResult) { spinResult.textContent = ''; }
    if (spinWheel) { spinWheel.style.transform = 'rotate(0deg)'; }
  }
  function hideSpinOverlay() {
    if (!spinOverlay) return;
    setOverlayVisible(spinOverlay, false);
  }

  function maybeShowDailySpin() {
    if (!state.user) return;
    if (!hasSpunOnce()) showSpinOverlay();
  }

  if (spinDismiss) spinDismiss.addEventListener('click', hideSpinOverlay);

  let spinning = false;
  if (spinBtn && spinWheel) {
    spinBtn.addEventListener('click', () => {
      if (spinning || hasSpunOnce()) return;
      spinning = true;
      const idx = Math.floor(Math.random() * REWARDS.length);
      // 4 segments, centers at 45, 135, 225, 315 deg (pointer at top)
      const centers = [45,135,225,315];
      const base = centers[idx];
      const turns = 5;
      const totalDeg = 360 * turns + (360 - base);
      spinWheel.style.transform = `rotate(${totalDeg}deg)`;
      const chosen = REWARDS[idx];
      setTimeout(() => {
        setSpunOnce(chosen);
        appendRewardLedger({ kind: 'daily_spin', reward: chosen });
        if (chosen.id === 'credit10') {
          addStoreCredit(10);
          renderCart();
        }
        if (spinResult) spinResult.textContent = `You won: ${chosen.label}!`;
        spinning = false;
      }, 4200);
    });
  }

  initCardGrid({
    addToCart,
    showHires,
    onCardsRendered: buildSuggestions,
    onCardView: (payload) => recordSignal('view', payload),
  });
}


