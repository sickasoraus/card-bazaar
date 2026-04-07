import { initApp } from './app.mjs';
import { getCardImage, getCardPrice } from './scryfall.mjs';
import { addBinderItem, addCartItem, addSellOrderItem } from './state.mjs';
import { setOverlayVisible } from './ui/overlays.mjs';

const PACK_SIZE = 12;
const MYTHIC_RATE = 1 / 8;
const EXCLUDED_QUERY = '-is:funny';

function applyOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  const preset = [
    { x: -28, y: -22, r: -5 },
    { x: 16, y: -10, r: 3 },
    { x: 0, y: 0, r: 0 },
  ];
  const shift = stack._offsetShift || 0;
  const rotated = preset.slice(shift).concat(preset.slice(0, shift));
  images.forEach((img, i) => {
    const off = rotated[i] || rotated[rotated.length - 1];
    img.style.transform = `translate(${off.x}px, ${off.y}px) rotate(${off.r}deg)`;
    img.style.zIndex = i + 1;
  });
  stack._offsetShift = (shift + 1) % preset.length;
  const active = stack.querySelector('.variant-image.active');
  if (active && active.style) active.style.zIndex = images.length + 10;
}

function resetOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  images.forEach((img) => {
    img.style.transform = 'translate(0px, 0px) rotate(0deg)';
  });
}

function initPackHover() {
  document.querySelectorAll('.pack-card').forEach((card) => {
    const stack = card.querySelector('.pack-stack');
    if (!stack) return;
    resetOffsets(stack);
    card.addEventListener('mouseenter', () => {
      applyOffsets(stack);
    });
    card.addEventListener('mouseleave', () => {
      resetOffsets(stack);
    });
  });
}

async function fetchRandomCard(setCode, rarity) {
  const q = `set:${setCode} rarity:${rarity} game:paper ${EXCLUDED_QUERY}`;
  const url = `https://api.scryfall.com/cards/random?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data && data.object === 'error') return null;
  return data;
}

async function buildPackResults(setCode) {
  const rareslot = Math.random() < MYTHIC_RATE ? 'mythic' : 'rare';
  const slots = [
    rareslot,
    'uncommon', 'uncommon', 'uncommon',
    'common', 'common', 'common', 'common',
    'common', 'common', 'common', 'common',
  ];
  const pulls = await Promise.all(slots.map((rarity) => fetchRandomCard(setCode, rarity)));
  return pulls.filter(Boolean);
}

function renderPackResults(cards) {
  const grid = document.getElementById('packResultsGrid');
  const results = document.getElementById('packResults');
  if (!grid || !results) return;
  grid.innerHTML = '';
  cards.forEach((card) => {
    const img = getCardImage(card, ['normal', 'small']);
    const price = getCardPrice(card);
    const tile = document.createElement('div');
    tile.className = 'pack-result-card';
    tile.innerHTML = `
      <img src="${img}" alt="${card.name}">
      <div class="pack-result-name">${card.name}</div>
      <div class="pack-result-actions">
        <button class="btn-ghost pack-add-buy" type="button">Add to Buy Cart</button>
        <button class="btn-ghost pack-add-sell" type="button">Add to Sell Cart</button>
      </div>
    `;
    const payload = {
      name: card.name,
      condition: 'NM',
      price: 0,
      image: img,
      set: card.set || '',
      collector: card.collector_number || '',
      lang: card.lang || '',
    };
    tile.querySelector('.pack-add-buy').addEventListener('click', () => {
      addCartItem({ ...payload, price: 0 });
      addBinderItem({ ...payload, price: 0 });
    });
    tile.querySelector('.pack-add-sell').addEventListener('click', () => {
      addSellOrderItem({
        name: payload.name,
        condition: payload.condition,
        purchasePrice: 0,
        livePrice: 0,
        offerPrice: 0,
        image: payload.image,
        set: payload.set,
        collector: payload.collector,
        lang: payload.lang,
      });
    });
    grid.appendChild(tile);
  });
  results.style.display = 'block';
}

function initPackModal() {
  const overlay = document.getElementById('packOverlay');
  const closeBtn = document.getElementById('packCloseBtn');
  const revealBtn = document.getElementById('packRevealBtn');
  const preview = document.getElementById('packPreview');
  const title = document.getElementById('packTitle');
  const results = document.getElementById('packResults');
  let activePack = null;

  function openOverlay(pack) {
    activePack = pack;
    if (title) title.textContent = pack.name;
    if (preview) preview.src = pack.image;
    if (results) results.style.display = 'none';
    setOverlayVisible(overlay, true);
  }

  if (closeBtn) closeBtn.addEventListener('click', () => setOverlayVisible(overlay, false));
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) setOverlayVisible(overlay, false);
    });
  }
  document.querySelectorAll('.pack-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      openOverlay({
        name: btn.dataset.pack || 'Open a Pack',
        set: btn.dataset.set || 'dmu',
        image: btn.dataset.image || '',
      });
    });
  });
  if (revealBtn) {
    revealBtn.addEventListener('click', async () => {
      if (!activePack) return;
      const pulls = await buildPackResults(activePack.set);
      renderPackResults(pulls);
    });
  }
}

function initPackCartButtons() {
  document.querySelectorAll('.pack-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.pack || 'Sealed Pack';
      const image = btn.dataset.image || '';
      const price = parseFloat(btn.dataset.price || '0');
      addCartItem({ name, condition: 'NM', price, image });
    });
  });
}

initApp();
initPackHover();
initPackModal();
initPackCartButtons();
