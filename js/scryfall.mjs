export function getCardImage(cardData, sizes) {
  const uris = cardData && cardData.image_uris;
  if (uris) {
    for (const size of sizes) {
      if (uris[size]) return uris[size];
    }
  }
  const faces = cardData && cardData.card_faces;
  if (faces && faces[0] && faces[0].image_uris) {
    const faceUris = faces[0].image_uris;
    for (const size of sizes) {
      if (faceUris[size]) return faceUris[size];
    }
  }
  return '';
}

export function getCardPrice(cardData) {
  const prices = cardData && cardData.prices;
  const raw = prices && (prices.usd || prices.usd_foil || prices.usd_etched);
  const parsed = raw != null ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchCardByName(name) {
  const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
  return res.json();
}

export async function fetchCardsSearch(query) {
  const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function fetchRandomFromSet(setCode) {
  const url = `https://api.scryfall.com/cards/random?q=e%3A${encodeURIComponent(setCode)}+game%3Apaper+-is%3Afunny`;
  const res = await fetch(url);
  return res.json();
}
