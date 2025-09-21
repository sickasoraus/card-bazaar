const cardNames = [
  "Teferi, Hero of Dominaria",
  "Liliana of the Veil",
  "Sheoldred, the Apocalypse",
  "Cut Down",
  "Go for the Throat",
  "Cavern of Souls",
  "Arcane Signet",
  "Boseiju, Who Endures",
  "Command Tower",
  "Ossification"
];

// Pricing multipliers per condition; base price comes from Scryfall (USD)
const CONDITION_MULTIPLIERS = {
  NM: 1.0,
  EX: 0.85,
  VG: 0.75,
};

// Simple demo inventory counts for visible conditions (starting values)
const inventory = {
  NM: 4,
  EX: 6,
  VG: 3,
};

function applyOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  // Three-card stack presets (NM/EX/VG)
  const preset = [
    { x: -18, y: -18, r: -4 },
    { x: 10, y: -8, r: 2 },
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

// related-cards helpers removed (tabled)

function formatPrice(n) {
  const num = Number.isFinite(n) ? n : 0;
  return `$${num.toFixed(2)}`;
}

function getBaseUsdPrice(cardData) {
  const p = (cardData && cardData.prices) || {};
  const raw = p.usd || p.usd_foil || p.usd_etched || null;
  const n = raw != null ? parseFloat(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function lastSeenPrice(name, condition) {
  try {
    const key = `cb_price_${name}__${condition}`;
    const v = localStorage.getItem(key);
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

function saveSeenPrice(name, condition, value) {
  try {
    const key = `cb_price_${name}__${condition}`;
    localStorage.setItem(key, String(value));
  } catch (_) {}
}

function priceColorDelta(name, condition, value) {
  const prev = lastSeenPrice(name, condition);
  if (prev == null) return '';
  if (value > prev) return '#7CFC9A'; // slight green
  if (value < prev) return '#FF7A7A'; // slight red
  return '';
}

async function fetchCardImages() {
  const grid = document.getElementById("cardGrid");
  const isCoarse = (typeof window !== 'undefined') && (
    ('matchMedia' in window && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window)
  );
  for (let name of cardNames) {
    const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
    const data = await res.json();
    const image = data.image_uris && data.image_uris.normal ? data.image_uris.normal : (data.card_faces && data.card_faces[0] && data.card_faces[0].image_uris ? data.card_faces[0].image_uris.normal : '');
    const hires = data.image_uris && (data.image_uris.png || data.image_uris.large) ? (data.image_uris.png || data.image_uris.large) : (data.card_faces && data.card_faces[0] && data.card_faces[0].image_uris ? (data.card_faces[0].image_uris.png || data.card_faces[0].image_uris.large) : '');

    // Compute real-time prices per condition from Scryfall USD
    const base = getBaseUsdPrice(data);
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

    // Determine per-condition color deltas vs. last seen and persist
    const colors = {
      NM: priceColorDelta(name, 'NM', computed.NM),
      EX: priceColorDelta(name, 'EX', computed.EX),
      VG: priceColorDelta(name, 'VG', computed.VG),
    };
    saveSeenPrice(name, 'NM', computed.NM);
    saveSeenPrice(name, 'EX', computed.EX);
    saveSeenPrice(name, 'VG', computed.VG);

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      <div class="card-stack">
        <img class="variant-image active" data-condition="NM" data-price="${priceStrings.NM}" src="${image}" alt="${name} NM">
        <img class="variant-image" data-condition="EX" data-price="${priceStrings.EX}" src="${image}" alt="${name} EX">
        <img class="variant-image" data-condition="VG" data-price="${priceStrings.VG}" src="${image}" alt="${name} VG">
        <div class="lastcopy-badge" aria-hidden="true">LAST COPY</div>
      </div>
      <div class="info" style="display:none;">
        <div class="price">Price: ${priceStrings.NM}</div>
        <div class="condition">Condition: NM</div>
      </div>
      <div class="condition-buttons" style="display:none;">
        <button class="add-cart-btn">Add to Cart</button>
        <button class="hires-btn" ${hires ? '' : 'disabled'}>View Scan</button>
        <button data-condition="NM" data-price="${priceStrings.NM}">
          NM (${inventory.NM}) G현 <span class="price-span" style="${colors.NM ? `color:${colors.NM}` : ''}">${priceStrings.NM}</span>
        </button>
        <button data-condition="EX" data-price="${priceStrings.EX}">
          EX (${inventory.EX}) G현 <span class="price-span" style="${colors.EX ? `color:${colors.EX}` : ''}">${priceStrings.EX}</span>
        </button>
        <button data-condition="VG" data-price="${priceStrings.VG}">
          VG (${inventory.VG}) G현 <span class="price-span" style="${colors.VG ? `color:${colors.VG}` : ''}">${priceStrings.VG}</span>
        </button>
      </div>
      <div class="card-meta">
        <span class="testimonial-user"></span>
        <span class="testimonial-sold"></span>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');
    // ensure the initially active image is the last child so it sits on top
    const initialActive = stack.querySelector('.variant-image.active');
    if (initialActive) stack.appendChild(initialActive);
    // Attach per-card inventory snapshot
    cardDiv._inv = { NM: inventory.NM, EX: inventory.EX, VG: inventory.VG };
    // Seeded testimonial data per card
    function seededRandom(seed) {
      let x = Math.sin(seed) * 10000; return x - Math.floor(x);
    }
    const seed = Array.from(name).reduce((a,c)=>a+c.charCodeAt(0),0);
    const userId = Math.floor(seededRandom(seed) * 9000) + 1000;
    const initialSold = Math.floor(seededRandom(seed+42) * 120) + 5;
    cardDiv._soldCount = initialSold;
    const userEl = cardDiv.querySelector('.testimonial-user');
    const soldEl = cardDiv.querySelector('.testimonial-sold');
    function updateTestimonial() {
      if (userEl) userEl.textContent = `Sold to us by: User ${userId}`;
      if (soldEl) soldEl.textContent = `${cardDiv._soldCount} copies sold`;
    }
    updateTestimonial();
    applyOffsets(stack);
    resetOffsets(stack);
    stack._hovered = false;
    const buttonsBar = cardDiv.querySelector('.condition-buttons');
    const lastBadge = cardDiv.querySelector('.lastcopy-badge');

    function labelFor(cond, count, priceStr) {
      return `${cond} (${count}) G현 <span class="price-span">${priceStr}</span>`;
    }

    function updateButtons() {
      ['NM','EX','VG'].forEach(c => {
        const btn = cardDiv.querySelector(`.condition-buttons button[data-condition="${c}"]`);
        if (!btn) return;
        const cnt = cardDiv._inv[c];
        const priceStr = priceStrings[c];
        btn.innerHTML = labelFor(c, cnt, priceStr);
        btn.classList.toggle('disabled', cnt <= 0);
      });
      // Show/hide last copy badge if active condition has 1 left
      const active = cardDiv.querySelector('.variant-image.active');
      if (active && lastBadge) {
        const c = active.dataset.condition;
        lastBadge.classList.toggle('show', cardDiv._inv[c] === 1);
      }
    }

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
      // increment public sold count
      cardDiv._soldCount += 1;
      updateTestimonial();
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
      // Hide bars when tapping elsewhere
      document.addEventListener('click', (ev) => {
        if (!cardDiv.contains(ev.target)) {
          if (buttonsBar) buttonsBar.style.display = 'none';
        }
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

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        animateToCondition(cardDiv, img.dataset.condition);
      });
    });
    cardDiv.querySelectorAll('.condition-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('add-cart-btn')) {
          const active = cardDiv.querySelector('.variant-image.active');
          if (active && typeof window.addToCart === 'function') {
            // adjust inventory + celebrations
            const proceed = handleAddForActive();
            if (proceed) window.addToCart({ name, condition: active.dataset.condition, price: active.dataset.price, image: active.getAttribute('src') });
          }
        } else if (btn.classList.contains('hires-btn')) {
          if (hires && typeof window.showHires === 'function') window.showHires(hires);
        } else {
          animateToCondition(cardDiv, btn.dataset.condition);
          // update last-copy badge visibility after animation completes
          setTimeout(updateButtons, 320);
        }
      });
    });

    cardDiv.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      const active = cardDiv.querySelector('.variant-image.active');
      if (active && typeof window.addToCart === 'function') {
        const proceed = handleAddForActive();
        if (proceed) window.addToCart({ name, condition: active.dataset.condition, price: active.dataset.price, image: active.getAttribute('src') });
      }
    });

    grid.appendChild(cardDiv);

    // related-cards insertion removed
  }
}

async function changeVariant(button, condition, price) {
  const card = button.closest('.card');
  await animateToCondition(card, condition);
  if (card) {
    card.querySelector('.price').textContent = `Price: ${price}`;
    card.querySelector('.condition').textContent = `Condition: ${condition}`;
  }
}

  function cycleVariant(stack) {
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
        updateButtons();
        resolve();
      }, 300);
    });
  }

  async function animateToCondition(card, condition) {
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

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames, changeVariant, cycleVariant, animateToCondition };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
  window.changeVariant = changeVariant;
  window.cycleVariant = cycleVariant;
  window.animateToCondition = animateToCondition;
}
