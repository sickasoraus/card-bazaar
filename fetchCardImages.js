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

async function fetchCardImages() {
  const grid = document.getElementById("cardGrid");
  for (let name of cardNames) {
    const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
    const data = await res.json();
    const image = data.image_uris.normal;

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      <div class="card-stack">
        <img class="variant-image active" src="${image}" alt="${name} NM">
        <img class="variant-image" src="${image}" alt="${name} EX">
        <img class="variant-image" src="${image}" alt="${name} LP">
      </div>
      <div class="overlay">
        <div>
          <div class="price">Price: $29.99</div>
          <div>Rarity: Mythic</div>
          <div class="condition">Condition: NM</div>
          <div>Live Inventory: 4 copies</div>
          <div class="variant-selector">
            <button onclick="changeVariant(this, 0, '$29.99', 'NM')">$29.99 - NM</button>
            <button onclick="changeVariant(this, 1, '$27.50', 'EX')">$27.50 - EX</button>
            <button onclick="changeVariant(this, 2, '$24.99', 'LP')">$24.99 - LP</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(cardDiv);
  }
}

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
}
