// Front-end interactions for cart, binder, selling and authentication
(function() {
  if (typeof document === 'undefined') return; // ensure browser environment

  // --- Cart logic ---
  const cart = [];
  const cartToggle = document.getElementById('cartToggle');
  const cartMenu = document.getElementById('cartMenu');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

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
  }

  function addToCart(item) {
    const priceNum = parseFloat(item.price.replace('$', ''));
    cart.push({ ...item, price: priceNum });
    renderCart();
    if (cartMenu.style.display !== 'block') {
      cartMenu.style.display = 'block';
    }
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
  }

  cartToggle.addEventListener('click', (e) => {
    e.preventDefault();
    cartMenu.style.display = cartMenu.style.display === 'block' ? 'none' : 'block';
  });

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

  setupToggle('binderToggle', 'binderInfo');
  setupToggle('sellToggle', 'sellInfo');

  // --- Simple authentication ---
  const loginBtn = document.getElementById('loginBtn');
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
    } else {
      userStatus.textContent = '';
      loginBtn.textContent = 'Log In/Create My Account';
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
      try { maybeShowDailySpin('login'); } catch (_) {}
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
  // If already logged in on load, consider showing the daily spin
  setTimeout(() => { try { maybeShowDailySpin('autoload'); } catch(_){} }, 1200);

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

  function shouldShowEmailCapture() {
    try {
      if (!overlay) return false;
      if (user) return false; // logged-in users skip
      const optedOut = localStorage.getItem('cb_email_capture_opted_out') === '1';
      const submitted = localStorage.getItem('cb_email_capture_submitted');
      return !optedOut && !submitted;
    } catch (_) {
      return true;
    }
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
  setTimeout(() => {
    if (shouldShowEmailCapture()) showEmailCapture();
  }, 2000);

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
  const REWARDS = [
    { id: 'credit10', label: '$10 Store Credit' },
    { id: 'ship_free', label: 'Free Shipping' },
    { id: 'points100', label: '100 CB Points' },
    { id: 'free_card', label: 'A Free Card' },
  ];

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function hasSpunToday() {
    try {
      const rec = JSON.parse(localStorage.getItem('cb_spin_record') || 'null');
      return rec && rec.date === todayKey();
    } catch (_) { return false; }
  }

  function setSpunToday(reward) {
    try { localStorage.setItem('cb_spin_record', JSON.stringify({ date: todayKey(), reward })); } catch(_){}
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
    // Show only for logged-in users; do not auto-open for guests
    if (!user) return;
    if (!hasSpunToday()) {
      showSpinOverlay();
    }
  }

  // Header manual trigger
  if (dailySpinBtn) {
    dailySpinBtn.addEventListener('click', () => {
      showSpinOverlay();
      if (hasSpunToday()) {
        const rec = JSON.parse(localStorage.getItem('cb_spin_record') || 'null');
        if (rec && spinResult) spinResult.textContent = `Already spun today: ${rec.reward.label}`;
      }
    });
  }

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
        if (spinResult) spinResult.textContent = `You won: ${chosen.label}!`;
        spinning = false;
      }, 4200);
    });
  }
})();
