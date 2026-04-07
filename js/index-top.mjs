import { initApp } from './app.mjs';
import { getCachedEntryPrice, renderCardListInto } from './cards.mjs';

const INDEX_DATA_URL = 'data/index-top.json';

function formatPrice(value) {
  const num = Number.isFinite(value) ? value : 0;
  return `$${num.toFixed(2)}`;
}

async function renderTier(tier, container) {
  const grid = document.createElement('div');
  grid.className = 'grid index-grid';

  const section = document.createElement('section');
  section.className = 'index-tier';
  section.innerHTML = `
    <div class="index-tier-title">${tier.label} &mdash; ${tier.cards.length} cards</div>
  `;
  section.appendChild(grid);
  container.appendChild(section);

  const normalized = await renderCardListInto(tier.cards || [], grid);
  return normalized.reduce((sum, entry) => sum + getCachedEntryPrice(entry), 0);
}

async function initIndex() {
  const tiersEl = document.getElementById('indexTiers');
  const totalEl = document.getElementById('indexTotal');
  if (!tiersEl) return;

  const res = await fetch(INDEX_DATA_URL, { cache: 'no-store' });
  const data = await res.json();
  const tiers = Array.isArray(data.tiers) ? data.tiers : [];
  tiersEl.innerHTML = '';

  let grandTotal = 0;
  for (const tier of tiers) {
    const tierTotal = await renderTier(tier, tiersEl);
    grandTotal += tierTotal;
  }

  if (totalEl) {
    totalEl.textContent = formatPrice(grandTotal);
  }
}

initApp();
initIndex();
