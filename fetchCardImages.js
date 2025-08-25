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
  EX: '$27.50',
  LP: '$24.99',
  HP: '$19.99'
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
        <img class="variant-image" data-condition="EX" data-price="${prices.EX}" src="${image}" alt="${name} EX">
        <img class="variant-image" data-condition="LP" data-price="${prices.LP}" src="${image}" alt="${name} LP">
        <img class="variant-image" data-condition="HP" data-price="${prices.HP}" src="${image}" alt="${name} HP">
      </div>
      <div class="overlay">
        <div class="info">
          <div class="price">Price: ${prices.NM}</div>
          <div>Rarity: Mythic</div>
          <div class="condition">Condition: NM</div>
          <div>Live Inventory: 4 copies</div>
        </div>
        <div class="variant-selector">
          <button data-condition="NM" data-price="${prices.NM}">NM</button>
          <button data-condition="EX" data-price="${prices.EX}">EX</button>
          <button data-condition="LP" data-price="${prices.LP}">LP</button>
          <button data-condition="HP" data-price="${prices.HP}">HP</button>
        </div>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');

    cardDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      const active = document.querySelector('.card.active');
      if (active && active !== cardDiv) {
        active.classList.remove('active');
        active.querySelector('.card-stack').classList.remove('show-stack');
      }
      cardDiv.classList.toggle('active');
      stack.classList.toggle('show-stack', cardDiv.classList.contains('active'));
    });

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        changeVariant(img, img.dataset.condition, img.dataset.price);
      });
    });
    cardDiv.querySelectorAll('.variant-selector button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeVariant(btn, btn.dataset.condition, btn.dataset.price);
      });
    });
    stack.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleVariant(stack);
    });

    grid.appendChild(cardDiv);
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.card.active').forEach(c => {
      c.classList.remove('active');
      c.querySelector('.card-stack').classList.remove('show-stack');
    });
  });
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
