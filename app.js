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

})();
