import { initApp } from './app.mjs';

const EDITIONS_URL = 'data/editions.json';

function slugify(value) {
  return encodeURIComponent(String(value || '').trim());
}

async function loadEditions() {
  const grid = document.getElementById('editionsGrid');
  if (!grid) return;
  const res = await fetch(EDITIONS_URL, { cache: 'no-store' });
  const data = await res.json();
  const editions = Array.isArray(data.editions) ? data.editions : [];

  grid.innerHTML = '';
  editions.forEach((edition) => {
    const link = document.createElement('a');
    link.className = 'edition-tile';
    link.href = `edition.html?set=${slugify(edition.key)}`;
    link.textContent = edition.name;
    grid.appendChild(link);
  });
}

initApp();
loadEditions();
