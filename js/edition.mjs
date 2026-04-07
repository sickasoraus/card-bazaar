import { initApp } from './app.mjs';
import { setSetFilter } from './cards.mjs';

const EDITIONS_URL = 'data/editions.json';

function decodeKey(value) {
  return decodeURIComponent(value || '').trim().toLowerCase();
}

async function hydrateEditionHeader(key) {
  const titleEl = document.getElementById('editionTitle');
  if (!titleEl || !key) return;
  try {
    const res = await fetch(EDITIONS_URL, { cache: 'no-store' });
    const data = await res.json();
    const editions = Array.isArray(data.editions) ? data.editions : [];
    const match = editions.find((ed) => (ed.key || '').toLowerCase() === key);
    if (match) {
      titleEl.textContent = match.name;
    }
  } catch (_) {
    // ignore
  }
}

const params = new URLSearchParams(window.location.search);
const raw = params.get('set') || '';
const key = decodeKey(raw);
if (key) {
  window.__CARD_BAZAAR_SET = key;
}

initApp();
if (key) {
  hydrateEditionHeader(key);
  const applyFilter = () => setSetFilter(key);
  applyFilter();
  setTimeout(applyFilter, 250);
}
