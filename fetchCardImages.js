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
        <div>
          <div class="price">Price: ${prices.NM}</div>
          <div>Rarity: Mythic</div>
          <div class="condition">Condition: NM</div>
          <div>Live Inventory: 4 copies</div>
        </div>
      </div>
    `;
    const stack = cardDiv.querySelector('.card-stack');
    cardDiv.addEventListener('mouseenter', () => stack.classList.add('show-stack'));
    cardDiv.addEventListener('mouseleave', () => stack.classList.remove('show-stack'));

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', () => {
        changeVariant(img, img.dataset.condition, img.dataset.price);
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

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames, changeVariant };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
  window.changeVariant = changeVariant;
}
