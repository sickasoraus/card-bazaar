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

const prices = {
  NM: '$29.99',
  VG: '$24.99',
  EX: '$19.99',
  G: '$9.99'
};

const inventory = {
  NM: 4,
  VG: 3,
  EX: 6,
  G: 2
};

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
        <img class="variant-image active" data-condition="NM" data-price="${prices.NM}" src="${image}" alt="${name} NM">
        <img class="variant-image" data-condition="VG" data-price="${prices.VG}" src="${image}" alt="${name} VG">
        <img class="variant-image" data-condition="EX" data-price="${prices.EX}" src="${image}" alt="${name} EX">
        <img class="variant-image" data-condition="G" data-price="${prices.G}" src="${image}" alt="${name} G">
      </div>
      <div class="info" style="display:none;">
        <div class="price">Price: ${prices.NM}</div>
        <div class="condition">Condition: NM</div>
      </div>
      <div class="condition-buttons">
        <button data-condition="NM" data-price="${prices.NM}">NM (${inventory.NM})</button>
        <button data-condition="VG" data-price="${prices.VG}">VG (${inventory.VG})</button>
        <button data-condition="EX" data-price="${prices.EX}">EX (${inventory.EX})</button>
        <button data-condition="G" data-price="${prices.G}">G (${inventory.G})</button>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');
    // ensure the initially active image is the last child so it sits on top
    const initialActive = stack.querySelector('.variant-image.active');
    if (initialActive) stack.appendChild(initialActive);

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        changeVariant(img, img.dataset.condition, img.dataset.price);
      });
    });
    cardDiv.querySelectorAll('.condition-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeVariant(btn, btn.dataset.condition, btn.dataset.price);
      });
    });

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

function cycleVariant(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  const activeIndex = images.findIndex(img => img.classList.contains('active'));
  const next = images[(activeIndex + 1) % images.length];
  changeVariant(next, next.dataset.condition, next.dataset.price);
}

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames, changeVariant, cycleVariant };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
  window.changeVariant = changeVariant;
  window.cycleVariant = cycleVariant;
}
