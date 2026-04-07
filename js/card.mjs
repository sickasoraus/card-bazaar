const params = new URLSearchParams(window.location.search);
const name = params.get('name') || '';
const set = params.get('set') || '';
const collector = params.get('collector') || '';
const lang = params.get('lang') || '';

const cardTitle = document.getElementById('cardTitle');
const cardSubtitle = document.getElementById('cardSubtitle');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const cardPrints = document.getElementById('cardPrints');
const scryfallLink = document.getElementById('cardScryfallLink');
const ckLink = document.getElementById('cardCkLink');
const tcgLink = document.getElementById('cardTcgLink');

const BACK_IMAGE = 'https://cards.scryfall.io/back.png';

function buildScryfallUrl() {
  if (set && collector) {
    const base = `https://api.scryfall.com/cards/${encodeURIComponent(set)}/${collector}`;
    return lang ? `${base}/${encodeURIComponent(lang)}` : base;
  }
  if (name) {
    return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
  }
  return '';
}

function getImage(data) {
  if (!data) return '';
  if (data.image_uris && data.image_uris.normal) return data.image_uris.normal;
  if (data.card_faces && data.card_faces[0] && data.card_faces[0].image_uris) {
    return data.card_faces[0].image_uris.normal || '';
  }
  return '';
}

async function loadCard() {
  const url = buildScryfallUrl();
  if (!url) return;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (cardTitle) cardTitle.textContent = data.name || name || 'Card';
    if (cardSubtitle) {
      const setName = data.set_name || set.toUpperCase();
      const collectorNum = data.collector_number || collector;
      cardSubtitle.textContent = `${setName} · #${collectorNum}`.trim();
    }
    const front = getImage(data);
    if (cardFront) cardFront.src = front;
    if (cardBack) cardBack.src = BACK_IMAGE;
    if (scryfallLink) scryfallLink.href = data.scryfall_uri || '#';
    if (ckLink) ckLink.href = (data.purchase_uris && data.purchase_uris.cardkingdom) || data.scryfall_uri || '#';
    if (tcgLink) tcgLink.href = (data.purchase_uris && data.purchase_uris.tcgplayer) || data.scryfall_uri || '#';

    if (data.prints_search_uri && cardPrints) {
      const printsRes = await fetch(data.prints_search_uri);
      const printsData = await printsRes.json();
      const prints = (printsData.data || []).slice(0, 8);
      cardPrints.innerHTML = '';
      prints.forEach((print) => {
        const imgUrl = getImage(print);
        if (!imgUrl) return;
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = print.name;
        img.className = 'card-print-thumb';
        cardPrints.appendChild(img);
      });
    }
  } catch (err) {
    console.error('Failed to load card data', err);
  }
}

function initRotator() {
  const rotator = document.getElementById('cardRotator');
  const inner = document.getElementById('cardRotatorInner');
  if (!rotator || !inner) return;
  let isDragging = false;
  let lastX = 0;
  let rotationY = 0;

  const updateRotation = () => {
    inner.style.transform = `rotateY(${rotationY}deg)`;
  };

  rotator.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    rotator.setPointerCapture(e.pointerId);
  });

  rotator.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const delta = e.clientX - lastX;
    rotationY += delta * 0.6;
    lastX = e.clientX;
    updateRotation();
  });

  rotator.addEventListener('pointerup', () => {
    isDragging = false;
  });

  rotator.addEventListener('pointerleave', () => {
    isDragging = false;
  });
}

loadCard();
initRotator();
