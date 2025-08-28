// Front-end interactions for cart, binder, selling and authentication
(function() {
  if (typeof document === 'undefined') return; // ensure browser environment

  // --- Cart logic ---
  const cart = [];
  const headerCartBtn = document.getElementById('headerCartBtn');
  const headerCartPopup = document.getElementById('headerCartPopup');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const headerCartTotal = document.getElementById('headerCartTotal');
  const headerCartCount = document.getElementById('headerCartCount');
  const headerStoreCredit = document.getElementById('headerStoreCredit');
  let storeCredit = 0; try { storeCredit = parseFloat(localStorage.getItem('cb_store_credit') || '0'); } catch(_) {}

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
    cart.push({ ...item, price: priceNum });
    renderCart();
    if (headerCartPopup && headerCartPopup.style.display !== 'block') {
      headerCartPopup.style.display = 'block';
    }
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
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
      content.style.display = content.style.display === 'block' ? 'none' : 'block';
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

  let user = null;

  function updateAuthDisplay() {
    if (user) {
      userStatus.textContent = `Logged in as ${user.email}`;
      loginBtn.textContent = 'Log Out';
      loginForm.style.display = 'none';
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'inline-block';
    } else {
      userStatus.textContent = '';
      loginBtn.textContent = 'Log In';
      if (binderHeaderBtn) binderHeaderBtn.style.display = 'none';
    }
  }

  loginBtn.addEventListener('click', () => {
    if (user) {
      user = null;
      localStorage.removeItem('user');
      updateAuthDisplay();
    } else {
      loginForm.style.display = loginForm.style.display === 'block' ? 'none' : 'block';
    }
  });

  loginSubmit.addEventListener('click', () => {
    if (loginEmail.value && loginPassword.value) {
      user = { email: loginEmail.value };
      localStorage.setItem('user', JSON.stringify(user));
      updateAuthDisplay();
    }
  });

  // load existing user
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      user = JSON.parse(stored);
    }
  } catch (e) {
    user = null;
  }
  updateAuthDisplay();
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
  const spinOverlay = document.getElementById('cbWheelOverlay');
  const spinBtn = document.getElementById('cbWheelSpin');
  const spinDismiss = document.getElementById('cbWheelDismiss');
  const spinResult = document.getElementById('cbWheelResult');
  const spinWheel = document.getElementById('cbWheel');
  const dailySpinBtn = document.getElementById('dailySpinBtn');
  // Daily Spin elements
  const spinOverlay = document.getElementById('cbWheelOverlay');
  const spinBtn = document.getElementById('cbWheelSpin');
  const spinDismiss = document.getElementById('cbWheelDismiss');
  const spinResult = document.getElementById('cbWheelResult');
  const spinWheel = document.getElementById('cbWheel');
  const dailySpinBtn = document.getElementById('dailySpinBtn');

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

  // Show after short delay on first visit
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
    try { if (!user) return false; const rec = JSON.parse(localStorage.getItem('cb_spin_once')||'{}'); return !!rec[user.email]; } catch(_) { return false; }
  }
  function setSpunOnce(reward) {
    try { if (!user) return; const key='cb_spin_once'; const rec = JSON.parse(localStorage.getItem(key)||'{}'); rec[user.email] = { ts: Date.now(), reward }; localStorage.setItem(key, JSON.stringify(rec)); } catch(_){}
  }

  function appendRewardLedger(entry) {
    try {
      const key = 'cb_rewards_ledger';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push({ ...entry, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(arr));
    } catch(_){}
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

  function maybeShowDailySpin(reason) {
    if (!user) return;
    if (!hasSpunOnce()) showSpinOverlay();
  }

  // Header manual trigger
  // no header spin button

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
          storeCredit = (storeCredit || 0) + 10;
          try { localStorage.setItem('cb_store_credit', String(storeCredit)); } catch(_){}
          renderCart();
        }
        if (spinResult) spinResult.textContent = `You won: ${chosen.label}!`;
        spinning = false;
      }, 4200);
    });
  }
})();

