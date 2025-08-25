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
        <img class="variant-image active" data-condition="NM" src="${image}" alt="${name} NM">
        <img class="variant-image" data-condition="EX" src="${image}" alt="${name} EX">
        <img class="variant-image" data-condition="LP" src="${image}" alt="${name} LP">
        <img class="variant-image" data-condition="HP" src="${image}" alt="${name} HP">
      </div>
      <div class="overlay">
        <div>
          <div class="price">Price: $29.99</div>
          <div>Rarity: Mythic</div>
          <div class="condition">Condition: NM</div>
          <div>Live Inventory: 4 copies</div>
          <div class="variant-selector">
            <button onclick="changeVariant(this, 'NM', '$29.99')">$29.99 - NM</button>
            <button onclick="changeVariant(this, 'EX', '$27.50')">$27.50 - EX</button>
            <button onclick="changeVariant(this, 'LP', '$24.99')">$24.99 - LP</button>
            <button onclick="changeVariant(this, 'HP', '$19.99')">$19.99 - HP</button>
          </div>
        </div>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');
    stack.addEventListener('click', () => stack.classList.toggle('show-stack'));
    grid.appendChild(cardDiv);
  }
}

function changeVariant(button, condition, price) {
  const card = button.closest('.card');
  const stack = card.querySelector('.card-stack');
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  const target = images.find(img => img.dataset.condition === condition);
  images.forEach(img => img.classList.remove('active'));
  target.classList.add('active');
  stack.appendChild(target);
  card.querySelector('.price').textContent = `Price: ${price}`;
  card.querySelector('.condition').textContent = `Condition: ${condition}`;
}

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames, changeVariant };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
  window.changeVariant = changeVariant;
}
