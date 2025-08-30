// Front-end interactions for cart, binder, selling and authentication
(function() {
  if (typeof document === 'undefined') return; // ensure browser environment

  // --- Cart logic ---
  const cart = [];
  // Minimal API helper (same-origin)
  const API_BASE = '';
  async function ensureApiReachable() {
    try {
      const r = await fetch(API_BASE + '/api/health', { credentials: 'include' });
      if (r && r.ok) return true;
    } catch (_) {}
    const want = `http://${location.hostname}:5173`;
    if (location.origin !== want) {
      const go = confirm('The backend API is not reachable from this address.\n\nClick OK to open the app at ' + want + ' (recommended).');
      if (go) {
        location.href = want;
      }
    }
    return false;
  }
  async function apiGet(path) {
    try {
      const r = await fetch(API_BASE + path, { credentials: 'include' });
      return await r.json();
    } catch (_) { return null; }
  }
  async function apiPost(path, body) {
    try {
      const r = await fetch(API_BASE + path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      return await r.json();
    } catch (_) { return null; }
  }
  const headerCartBtn = document.getElementById('headerCartBtn');
  const headerCartPopup = document.getElementById('headerCartPopup');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const headerCartTotal = document.getElementById('headerCartTotal');
  const headerCartCount = document.getElementById('headerCartCount');
  const headerStoreCredit = document.getElementById('headerStoreCredit');
  let storeCredit = 0;
  function getMap(key){ try { return JSON.parse(localStorage.getItem(key)||'{}'); } catch(_) { return {}; } }
  function setMap(key, obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(_){} }
  function getUserKey(){ return (user && user.email) ? user.email : null; }
  function loadStoreCreditForCurrentUser(){ const u=getUserKey(); if (u){ const m=getMap('cb_store_credit_map'); storeCredit = Math.max(0, +m[u] || 0); if (headerStoreCredit) { headerStoreCredit.style.display='inline'; headerStoreCredit.textContent = `+$${storeCredit.toFixed(2)} credit`; } } else { storeCredit = 0; if (headerStoreCredit) headerStoreCredit.style.display='none'; } }
  function saveStoreCreditForCurrentUser(){ const u=getUserKey(); if (!u) return; const m=getMap('cb_store_credit_map'); m[u] = Math.max(0, +storeCredit || 0); setMap('cb_store_credit_map', m); if (headerStoreCredit) headerStoreCredit.textContent = `+$${storeCredit.toFixed(2)} credit`; }

  async function loadCartFromServer() {
    const data = await apiGet('/api/cart');
    if (!data || !data.cart || !Array.isArray(data.cart.items)) return;
    cart.length = 0;
    data.cart.items.forEach(it => {
      cart.push({ name: it.name, condition: it.condition, price: (it.unit_price_cents || 0) / 100, image: it.image || '' });
    });
    renderCart();
  }
  async function serverAddToCart(item) {
    const cents = Math.round((item.price || 0) * 100);
    await apiPost('/api/cart/add', { name: item.name, condition: item.condition, unit_price_cents: cents, image: item.image || '' });
  }
  async function serverRemoveFromCart(item) {
    const cents = Math.round((item.price || 0) * 100);
    await apiPost('/api/cart/remove_one', { name: item.name, condition: item.condition, unit_price_cents: cents });
  }

  // --- Binder state ---
  const binderPopup = document.getElementById('binderInfoPopup');
  const binderListEl = document.getElementById('binderList');
  const binderListEmptyEl = document.getElementById('binderListEmpty');
  const binderSummaryEl = document.getElementById('binderSummary');
  let binder = [];
  try { binder = JSON.parse(localStorage.getItem('cb_binder') || '[]'); } catch(_) { binder = []; }

  async function loadBinderFromServer() {
    try {
      const data = await apiGet('/api/binder');
      if (data && Array.isArray(data.items)) {
        binder = data.items.map(it => ({ id: it.id, name: it.name, condition: it.condition, price: (it.acq_price_cents||0)/100, image: it.image || '' }));
        try { localStorage.setItem('cb_binder', JSON.stringify(binder)); } catch(_){}
        renderBinder();
      }
    } catch (_) {}
  }
  async function serverBinderReorder() {
    const order = binder.map(b => b.id).filter(Boolean);
    if (order.length) await apiPost('/api/binder/reorder', { order });
  }
  async function serverBinderRemove(id) {
    if (!id) return;
    await apiPost('/api/binder/remove', { id });
  }

  function saveBinder() {
    try { localStorage.setItem('cb_binder', JSON.stringify(binder)); } catch(_) {}
  }

  function renderBinder() {
    if (!binderGrid || !binderSummaryEl) return;
    binderGrid.innerHTML = '';
    let total = 0;
    binder.forEach((it, idx) => {
      total += it.price;
      const card = document.createElement('div');
      card.className = 'binder-item';
      card.setAttribute('draggable','true');
      card.dataset.index = String(idx);
      if (it.id) card.dataset.id = it.id;
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
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        const to = idx;
        if (!Number.isFinite(from) || from === to) return;
        const [moved] = binder.splice(from, 1);
        binder.splice(to, 0, moved);
        saveBinder();
        renderBinder();
        try { await serverBinderReorder(); } catch(_){}
      });
      card.querySelector('.sell-btn').addEventListener('click', async () => {
        const credit = Math.round(it.price * 0.7 * 100) / 100;
        storeCredit += credit;
        saveStoreCreditForCurrentUser();
        const removed = binder.splice(idx,1);
        try { if (removed[0] && removed[0].id) await serverBinderRemove(removed[0].id); } catch(_){}
        saveBinder();
        renderBinder();
        renderCart();
      });
      card.querySelector('.rm-btn').addEventListener('click', async () => {
        const removed = binder.splice(idx,1);
        try { if (removed[0] && removed[0].id) await serverBinderRemove(removed[0].id); } catch(_){}
        saveBinder();
        renderBinder();
      });
      binderGrid.appendChild(card);
    });
    if (binderListEmptyEl) binderListEmptyEl.style.display = binder.length ? 'none' : 'block';
    binderSummaryEl.textContent = binder.length ? `${binder.length} cards • $${total.toFixed(2)}` : '';
  }
  // Initial draw
  try { renderBinder(); } catch(_) {}

  // --- Personalized Suggestions ---
  const suggestSection = document.getElementById('suggestSection');
  const suggestRow = document.getElementById('suggestRow');
  const refreshSuggest = document.getElementById('refreshSuggest');

  async function fetchCardByName(n) {
    const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(n)}`);
    return res.json();
  }

  async function suggestFromSeed(seedName) {
    try {
      const base = await fetchCardByName(seedName);
      const typeLine = (base.type_line || '').toLowerCase();
      const types = ['planeswalker','creature','instant','sorcery','artifact','enchantment','land'];
      let type = 'card'; for (const t of types) { if (typeLine.includes(t)) { type = t; break; } }
      const ci = Array.isArray(base.color_identity) && base.color_identity.length ? base.color_identity.join('').toLowerCase() : '';
      const parts = [`type:${type}`, ci ? `ci:${ci}` : '', `-name:\"${seedName}\"`, 'game:paper', '-is:funny', 'unique:prints', 'order:edhrec'];
      const q = parts.filter(Boolean).join(' ');
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || !Array.isArray(data.data)) return [];
      return data.data.slice(0, 10);
    } catch(_) { return []; }
  }

  function formatUSD(v) { return `$${(Number(v)||0).toFixed(2)}`; }

  async function buildSuggestions() {
    if (!suggestRow || !suggestSection) return;
    suggestRow.innerHTML = '';
    let seed = null;
    if (binder && binder.length) seed = binder[0].name;
    if (!seed && window.cardNames && window.cardNames.length) {
      seed = window.cardNames[Math.floor(Math.random()*window.cardNames.length)];
    }
    if (!seed) { suggestSection.style.display = 'none'; return; }
    const list = await suggestFromSeed(seed);
    if (!list.length) { suggestSection.style.display = 'none'; return; }
    suggestSection.style.display = 'block';
    list.forEach(card => {
      const img = (card.image_uris && (card.image_uris.small || card.image_uris.normal)) || (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris && (card.card_faces[0].image_uris.small || card.card_faces[0].image_uris.normal)) || '';
      const price = (card.prices && (parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || parseFloat(card.prices.usd_etched))) || 0;
      const tile = document.createElement('div');
      tile.style.width = '160px';
      tile.style.flex = '0 0 auto';
      tile.innerHTML = `
        <div style="position:relative; border-radius:10px; overflow:hidden; box-shadow:0 6px 14px rgba(0,0,0,0.25);">
          <img src="${img}" alt="${card.name}" style="width:100%; height:220px; object-fit:cover; display:block;">
        </div>
        <div style="font-size:14px; font-weight:700; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${card.name}</div>
        <div style="font-size:13px; color:#444;">NM ${formatUSD(price)}</div>
        <button class="btn-cta" style="margin-top:6px; width:100%; font-size:14px; padding:8px 10px;">Add to Cart</button>
      `;
      tile.querySelector('button').addEventListener('click', () => {
        if (typeof window.addToCart === 'function') window.addToCart({ name: card.name, condition: 'NM', price: formatUSD(price), image: img });
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

  function openPackModal() { if (!packOverlay) return; packOverlay.style.display='flex'; packOverlay.setAttribute('aria-hidden','false'); packGrid.innerHTML=''; packCards=[]; }
  function closePackModal() { if (!packOverlay) return; packOverlay.style.display='none'; packOverlay.setAttribute('aria-hidden','true'); }
  if (openPackBtn) openPackBtn.addEventListener('click', openPackModal);
  if (packCloseBtn) packCloseBtn.addEventListener('click', closePackModal);
  if (packOverlay) packOverlay.addEventListener('click', (e)=>{ if(e.target===packOverlay) closePackModal(); });

  async function fetchRandomFromSet(setCode) {
    const url = `https://api.scryfall.com/cards/random?q=e%3A${encodeURIComponent(setCode)}+game%3Apaper+-is%3Afunny`;
    const res = await fetch(url);
    return res.json();
  }

  async function openPack() {
    if (!packGrid) return;
    packGrid.innerHTML = '';
    packCards = [];
    const set = packSetSelect ? packSetSelect.value : 'dmu';
    // Simple 10-card pack for prototype
    for (let i=0;i<10;i++) {
      try {
        const c = await fetchRandomFromSet(set);
        const img = (c.image_uris && (c.image_uris.normal || c.image_uris.small)) || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris && (c.card_faces[0].image_uris.normal || c.card_faces[0].image_uris.small)) || '';
        const price = (c.prices && (parseFloat(c.prices.usd) || parseFloat(c.prices.usd_foil) || parseFloat(c.prices.usd_etched))) || 0;
        packCards.push({ name: c.name, img, price });
        const cell = document.createElement('div');
        cell.innerHTML = `
          <div style="border-radius:10px; overflow:hidden; box-shadow:0 6px 14px rgba(0,0,0,0.25);">
            <img src="${img}" alt="${c.name}" style="width:100%; height:180px; object-fit:cover; display:block;">
          </div>
          <div style="font-size:12px; font-weight:700; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
          <div style="font-size:12px; color:#444;">NM $${price.toFixed(2)}</div>
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
    packCards.forEach(c => { if (typeof window.addToCart === 'function') window.addToCart({ name: c.name, condition: 'NM', price: `$${(c.price||0).toFixed(2)}`, image: c.img }); });
    alert('All pack cards added to cart.');
  });
  if (packSellAll) packSellAll.addEventListener('click', ()=>{
    if (!packCards.length) return;
    let total = packCards.reduce((s,c)=>s+(c.price||0),0);
    const credit = Math.round(total*0.7*100)/100;
    storeCredit += credit; saveStoreCreditForCurrentUser();
    renderCart();
    alert(`Sold pack to store for $${credit.toFixed(2)} credit.`);
  });

  // --- Checkout Modal (re‑add logic) ---
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
    const itemsTotal = cart.reduce((s,i)=>s+i.price,0);
    const freeShip = hasFreeShippingOnce();
    const sameDaySelected = (shipSameDay && shipSameDay.checked);
    shippingCost = sameDaySelected ? 9.99 : 0;
    if (!sameDaySelected && freeShip) shippingCost = 0;
    let total = itemsTotal + shippingCost;
    let creditApplied = 0;
    if (applyStoreCredit && applyStoreCredit.checked && storeCredit > 0) {
      creditApplied = Math.min(storeCredit, total);
      total = Math.max(0, total - creditApplied);
    }
    checkoutSummary.textContent = `Items: ${cart.length} • Items Total: $${itemsTotal.toFixed(2)} • Shipping: $${shippingCost.toFixed(2)} • Credit Applied: $${creditApplied.toFixed(2)} • Pay: $${total.toFixed(2)}`;
    if (availableCredit) availableCredit.textContent = `(Available: $${storeCredit.toFixed(2)})`;
  }
  function openCheckout() {
    if (!checkoutOverlay) return;
    if (!cart.length) { alert('Your cart is empty.'); return; }
    // reset defaults
    if (shipStandard) shipStandard.checked = true;
    if (shipSameDay) shipSameDay.checked = false;
    applyStoreCredit.checked = storeCredit > 0;
    updateSameDayAvailability();
    recalcCheckoutSummary();
    checkoutOverlay.style.display = 'flex';
    checkoutOverlay.setAttribute('aria-hidden','false');
  }
  function closeCheckout() {
    if (!checkoutOverlay) return;
    checkoutOverlay.style.display = 'none';
    checkoutOverlay.setAttribute('aria-hidden','true');
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
      alert('Please enter a shipping name, address, city, state, and ZIP.');
      return;
    }
    // recompute order totals
    const itemsTotal = cart.reduce((s,i)=>s+i.price,0);
    const freeShip = hasFreeShippingOnce();
    const sameDaySelected = (shipSameDay && shipSameDay.checked);
    shippingCost = sameDaySelected ? 9.99 : 0;
    if (!sameDaySelected && freeShip) shippingCost = 0;
    let total = itemsTotal + shippingCost;
    if (applyStoreCredit && applyStoreCredit.checked && storeCredit > 0) {
      const applied = Math.min(storeCredit, total);
      storeCredit -= applied;
      total = Math.max(0, total - applied);
      try { localStorage.setItem('cb_store_credit', String(storeCredit)); } catch(_) {}
    }
    if (!sameDaySelected && freeShip && shippingCost === 0) { consumeFreeShippingOnce(); }
    (async () => {
      try { await apiPost('/api/checkout/simulate', { }); } catch(_){}
      if (user) { try { await loadBinderFromServer(); } catch(_){}
      }
      cart.length = 0;
      renderCart();
      closeCheckout();
      alert(user ? 'Order placed! Items added to your binder.' : 'Order placed! Create an account to track purchases in your binder next time.');
    })();
  });
  if (checkoutBtn) checkoutBtn.addEventListener('click', (e)=>{ e.preventDefault(); openCheckout(); });

  function renderCart() {
    cartItemsEl.innerHTML = '';
    cart.forEach((item, idx) => {
      const li = document.createElement('li');
      li.textContent = `${item.name} (${item.condition}) - $${item.price.toFixed(2)}`;
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => removeFromCart(idx));
      li.appendChild(remove);
      cartItemsEl.appendChild(li);
    });
    const total = cart.reduce((sum, i) => sum + i.price, 0);
    cartTotalEl.textContent = `Total: $${total.toFixed(2)}`;
    checkoutBtn.style.display = cart.length ? 'block' : 'none';
    if (headerCartTotal) headerCartTotal.textContent = `$${total.toFixed(2)}`;
    if (headerCartCount) headerCartCount.textContent = String(cart.length);
    if (headerStoreCredit) headerStoreCredit.textContent = `+$${storeCredit.toFixed(2)} credit`;
  }

  function addToCart(item) {
    const priceNum = parseFloat(item.price.replace('$', ''));
    const entry = { ...item, price: priceNum };
    cart.push(entry);
    renderCart();
    if (headerCartPopup && headerCartPopup.style.display !== 'block') {
      headerCartPopup.style.display = 'block';
    }
    // Persist to server (guest or user session)
    try { serverAddToCart({ name: entry.name, condition: entry.condition, price: entry.price, image: entry.image || '' }); } catch(_){}
  }

  function removeFromCart(index) {
    const removed = cart.splice(index, 1);
    if (removed && removed[0]) { try { serverRemoveFromCart(removed[0]); } catch(_){} }
    renderCart();
  }

  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!headerCartPopup) return;
      const visible = headerCartPopup.style.display === 'block';
      headerCartPopup.style.display = visible ? 'none' : 'block';
    });
    document.addEventListener('click', (ev) => {
      if (!headerCartPopup || !headerCartBtn) return;
      const within = headerCartPopup.contains(ev.target) || headerCartBtn.contains(ev.target);
      if (!within) headerCartPopup.style.display = 'none';
    });
  }

  // expose globally for fetchCardImages.js
  window.addToCart = addToCart;

  // --- Binder and Sell sections ---
  function setupToggle(buttonId, contentId) {
    const btn = document.getElementById(buttonId);
    const content = document.getElementById(contentId);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const showing = content.style.display === 'block';
      content.style.display = showing ? 'none' : 'block';
      if (!showing && contentId === 'binderInfoPopup') { renderBinder(); }
    });
  }

  // New header popups
  setupToggle('binderHeaderBtn', 'binderInfoPopup');
  setupToggle('sellHeaderBtn', 'sellInfoPopup');

  // --- Simple authentication ---
  const loginBtn = document.getElementById('loginBtn');
  const binderHeaderBtn = document.getElementById('binderHeaderBtn');
  const loginForm = document.getElementById('loginForm');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const userStatus = document.getElementById('userStatus');
  const createAccountText = document.getElementById('createAccountText');
  const backToLoginText = document.getElementById('backToLoginText');
  const spinStackBtn = document.getElementById('spinStackBtn');
  const loginLabel = document.getElementById('loginLabel');

  let user = null;

  async function fetchCurrentUser() {
    try {
      const data = await apiGet('/api/me');
      if (data && data.user) {
        user = data.user;
        try { localStorage.setItem('user', JSON.stringify(user)); } catch(_){}
        await loadCartFromServer();
        await loadBinderFromServer();
      } else {
        // not logged in
        user = null;
      }
    } catch(_){}
    // Always hydrate cart for guest sessions, too
    try { await loadCartFromServer(); } catch(_){}
    loadStoreCreditForCurrentUser();
  }

  function updateAuthDisplay() {
    if (user) {
      userStatus.textContent = '';
      if (loginLabel) loginLabel.textContent = `Log Out — ${user.email}`;
      if (loginBtn) { setLoginOpen(false); }
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'inline-block';
      loadStoreCreditForCurrentUser();
      try { refreshSpinButtonUI(); } catch(_){}
    } else {
      userStatus.textContent = '';
      if (loginLabel) loginLabel.textContent = 'Log In';
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'none';
      loadStoreCreditForCurrentUser();
      try { refreshSpinButtonUI(); } catch(_){}
    }
  }

  function setLoginOpen(flag){
    if (!loginBtn) return;
    loginBtn.classList.toggle('open', !!flag);
    loginBtn.setAttribute('aria-expanded', String(!!flag));
    if (loginForm) {
      loginForm.style.display = flag ? 'block' : 'none';
      loginForm.style.maxHeight = flag ? '260px' : '0px';
    }
  }

  if (loginBtn) loginBtn.addEventListener('click', (e) => {
    // If clicking inside the form, don't toggle container
    if (loginForm && loginForm.contains(e.target)) return;
    if (user) {
      user = null;
      localStorage.removeItem('user');
      updateAuthDisplay();
    } else {
      const open = loginBtn.classList.contains('open');
      setLoginOpen(!open);
    }
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', (ev)=>{
    if (!loginBtn) return;
    if (!loginBtn.contains(ev.target)) {
      if (loginBtn.classList.contains('open')) setLoginOpen(false);
    }
  });

  let loginMode = 'login'; // 'login' | 'create' | 'forgot'
  async function doLogin() {
    const email = loginEmail.value || '';
    const password = loginPassword.value || '';
    if (!(await ensureApiReachable())) { return false; }
    const resp = await apiPost('/api/login', { email, password });
    if (resp && resp.user) {
      user = resp.user;
      try { localStorage.setItem('user', JSON.stringify(user)); } catch(_){}
      updateAuthDisplay();
      await loadCartFromServer();
      await loadBinderFromServer();
      if (loginBtn) { setLoginOpen(false); }
      try { maybeShowDailySpin('login'); } catch(_){}
      try { const ov = document.getElementById('cbEmailOverlay'); if (ov) { ov.style.display = 'none'; ov.setAttribute('aria-hidden','true'); } } catch(_){}
      return true;
    }
    if (resp && resp.error === 'not_found') {
      loginMode = 'create';
      loginSubmit.textContent = 'Create your account?';
      return false;
    }
    if (resp && resp.error === 'invalid_password') {
      loginMode = 'forgot';
      loginSubmit.textContent = 'Forgot password?';
      return false;
    }
    // email verification not required
    alert('Login failed.');
    return false;
  }

  async function doCreate() {
    const email = loginEmail.value || '';
    const password = loginPassword.value || '';
    if (!(await ensureApiReachable())) { return false; }
    const resp = await apiPost('/api/signup', { email, password });
    if (resp && resp.user) {
      user = resp.user;
      try { localStorage.setItem('user', JSON.stringify(user)); } catch(_){}
      updateAuthDisplay();
      await loadCartFromServer();
      await loadBinderFromServer();
      if (loginBtn) { setLoginOpen(false); }
      alert('Account created. You are now logged in.');
      return true;
    }
    if (resp && resp.error === 'already_exists') {
      alert('An account with this email already exists. Please enter your password to log in.');
      loginMode = 'login';
      loginSubmit.textContent = 'Submit';
      return false;
    }
    alert('Could not create account.');
    return false;
  }

  async function doForgot() {
    const email = loginEmail.value || '';
    await apiPost('/api/forgot', { email });
    alert('If this email exists, we sent a password reset link.');
    loginMode = 'login';
    loginSubmit.textContent = 'Submit';
    return true;
  }

  loginSubmit.addEventListener('click', async () => {
    try {
      if (loginMode === 'login') { await doLogin(); }
      else if (loginMode === 'create') { await doCreate(); }
      else if (loginMode === 'forgot') { await doForgot(); }
    } catch(_) {
      alert('Action failed.');
    }
  });

  function enterCreateMode() {
    loginMode = 'create';
    loginSubmit.textContent = 'Create account';
    if (createAccountText) createAccountText.style.display = 'none';
    if (backToLoginText) backToLoginText.style.display = 'inline-block';
  }
  function enterLoginMode() {
    loginMode = 'login';
    loginSubmit.textContent = 'Submit';
    if (createAccountText) createAccountText.style.display = 'inline-block';
    if (backToLoginText) backToLoginText.style.display = 'none';
  }

  if (createAccountText) createAccountText.addEventListener('click', (e)=>{ e.preventDefault(); enterCreateMode(); });
  if (backToLoginText) backToLoginText.addEventListener('click', (e)=>{ e.preventDefault(); enterLoginMode(); });

  // load existing user
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch (_) { user = null; }
  // hydrate from server session if present
  fetchCurrentUser();
  updateAuthDisplay();
  // If already logged in, show the daily spin once
  setTimeout(() => { try { maybeShowDailySpin('autoload'); } catch(_){} }, 800);
  // Daily spin auto-open disabled

  // --- Email capture modal (waitlist) ---
  const EMAIL_CAPTURE_ENDPOINT = null; // set to a backend URL later; null = simulate
  const overlay = document.getElementById('cbEmailOverlay');
  const submitBtn = document.getElementById('cbEmailSubmit');
  const dismissBtn = document.getElementById('cbEmailDismiss');
  const inputEl = document.getElementById('cbEmailInput');
  const msgEl = document.getElementById('cbEmailMessage');
  const modalArt = document.getElementById('cbModalArt');
  const modalStack = document.getElementById('cbModalStack');
  // Daily Spin elements

  function shouldShowEmailCapture() {
    try { return !!overlay && !user; } catch(_) { return !user; }
  }

  function showEmailCapture() {
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => { try { inputEl && inputEl.focus(); } catch(_){} }, 50);
  }

  function hideEmailCapture() {
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
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
      localStorage.setItem('cb_email_capture_submitted', JSON.stringify({ email, ts: Date.now() }));
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
      try { localStorage.setItem('cb_email_capture_opted_out', '1'); } catch(_){ }
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

  // Fetch Teferi art for the modal background
  (async function setTeferiArt(){
    try {
      const res = await fetch('https://api.scryfall.com/cards/named?exact=' + encodeURIComponent('Teferi, Hero of Dominaria'));
      const data = await res.json();
      const img = (data.image_uris && data.image_uris.normal) ||
                  (data.card_faces && data.card_faces[0] && data.card_faces[0].image_uris && data.card_faces[0].image_uris.normal);
      if (img && modalStack) {
        modalStack.innerHTML = [
          `<img class="cb-variant-image cb-bottom" src="${img}" alt="Teferi card (bottom)">`,
          `<img class="cb-variant-image cb-mid" src="${img}" alt="Teferi card (middle)">`,
          `<img class="cb-variant-image cb-top" src="${img}" alt="Teferi card (top)">`,
        ].join('');
      } else if (modalArt) {
        // Fallback to background if stacking container missing
        modalArt.style.backgroundImage = img ? `url(${img})` : 'none';
        if (!img) modalArt.style.background = 'linear-gradient(135deg,#1d3557,#457b9d)';
      }
    } catch (_) {
      if (modalArt) modalArt.style.background = 'linear-gradient(135deg,#1d3557,#457b9d)';
    }
  })();

  // --- High-res image overlay helpers ---
  const hiresOverlay = document.getElementById('hiresOverlay');
  const hiresImage = document.getElementById('hiresImage');
  const hiresClose = document.getElementById('hiresClose');
  function showHires(url) {
    if (!hiresOverlay || !hiresImage) return;
    hiresImage.src = url;
    hiresOverlay.style.display = 'flex';
    hiresOverlay.setAttribute('aria-hidden','false');
  }
  function hideHires() {
    if (!hiresOverlay) return;
    hiresOverlay.style.display = 'none';
    hiresOverlay.setAttribute('aria-hidden','true');
  }
  if (hiresClose) hiresClose.addEventListener('click', hideHires);
  if (hiresOverlay) hiresOverlay.addEventListener('click', (e) => { if (e.target === hiresOverlay) hideHires(); });
  window.showHires = showHires;

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
  function todayStr(){ const d=new Date(); const m=(d.getMonth()+1).toString().padStart(2,'0'); const day=d.getDate().toString().padStart(2,'0'); return `${d.getFullYear()}-${m}-${day}`; }
  function hasSpunToday() {
    try { if (!user) return false; const rec = JSON.parse(localStorage.getItem('cb_spin_daily')||'{}'); return rec[user.email] === todayStr(); } catch(_) { return false; }
  }
  function setSpunToday(reward) {
    try { if (!user) return; const key='cb_spin_daily'; const rec = JSON.parse(localStorage.getItem(key)||'{}'); rec[user.email] = todayStr(); localStorage.setItem(key, JSON.stringify(rec)); } catch(_){}
    try { refreshSpinButtonUI(); } catch(_){}
  }

  function appendRewardLedger(entry) {
    try {
      const key = 'cb_rewards_ledger';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push({ ...entry, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(arr));
    } catch(_){}
  }

  function getUserKey(){ return user && user.email ? user.email : null; }
  function getMap(key){ try { return JSON.parse(localStorage.getItem(key)||'{}'); } catch(_) { return {}; } }
  function setMap(key, obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(_){} }
  function grantFreeShippingOnce() {
    const u=getUserKey(); if (!u) return;
    const map=getMap('cb_free_ship_once'); map[u]=1; setMap('cb_free_ship_once', map);
  }
  function hasFreeShippingOnce() {
    const u=getUserKey(); if (!u) return false; const map=getMap('cb_free_ship_once'); return !!map[u];
  }
  function consumeFreeShippingOnce() {
    const u=getUserKey(); if (!u) return; const map=getMap('cb_free_ship_once'); if (map[u]) { delete map[u]; setMap('cb_free_ship_once', map); }
  }
  function addPoints(n){ const u=getUserKey(); if (!u) return; const map=getMap('cb_points'); map[u]=(map[u]||0)+n; setMap('cb_points', map); }

  function refreshSpinButtonUI(){
    if (!spinStackBtn) return;
    const used = hasSpunToday();
    spinStackBtn.disabled = false; // clickable to show prompt even if guest
    spinStackBtn.style.opacity = used ? '0.6' : '1.0';
    const sub = used ? '<div style="font-size:12px; opacity:0.9;">Come back tomorrow!</div>' : '<div id="spinSub" style="font-size:12px; opacity:0.9;"></div>';
    spinStackBtn.innerHTML = 'Daily Spin' + sub;
  }

  function showSpinOverlay() {
    if (!spinOverlay) return;
    spinOverlay.style.display = 'flex';
    spinOverlay.setAttribute('aria-hidden', 'false');
    if (spinResult) { spinResult.textContent = ''; }
    if (spinWheel) { spinWheel.style.transform = 'rotate(0deg)'; }
  }
  function hideSpinOverlay() {
    if (!spinOverlay) return;
    spinOverlay.style.display = 'none';
    spinOverlay.setAttribute('aria-hidden', 'true');
  }

  function maybeShowDailySpin(reason) { /* manual via header button only now */ }

  // Header manual trigger
  // no header spin button

  if (spinDismiss) spinDismiss.addEventListener('click', hideSpinOverlay);

  let spinning = false;
  if (spinBtn && spinWheel) {
    spinBtn.addEventListener('click', () => {
      if (spinning || hasSpunToday()) return;
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
        setSpunToday(chosen);
        appendRewardLedger({ kind: 'daily_spin', reward: chosen });
        if (chosen.id === 'credit10') {
          storeCredit = (storeCredit || 0) + 10;
          saveStoreCreditForCurrentUser();
          renderCart();
        }
        if (chosen.id === 'ship_free') { grantFreeShippingOnce(); }
        if (chosen.id === 'points100') { addPoints(100); }
        if (spinResult) spinResult.textContent = `You won: ${chosen.label}!`;
        spinning = false;
      }, 4200);
    });
  }

  if (spinStackBtn) {
    spinStackBtn.addEventListener('click', () => {
      if (!user) { alert('Please log in to spin.'); return; }
      if (hasSpunToday()) { refreshSpinButtonUI(); return; }
      showSpinOverlay();
    });
  }

  // --- Checkout -> move cart items to binder when logged in
  // replaced by modal-driven checkout; see below
})();

