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

    const variants = [
      { condition: 'NM', price: '$29.99' },
      { condition: 'EX', price: '$27.50' },
      { condition: 'LP', price: '$24.99' },
      { condition: 'HP', price: '$19.99' }
    ];

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      <div class="card-stack">
        ${variants
          .map(
            (v, i) =>
              `<img class="variant-image${i === 0 ? ' active' : ''}" data-condition="${v.condition}" data-price="${v.price}" src="${image}" alt="${name} ${v.condition}">`
          )
          .join('')}
      </div>
      <div class="overlay">
        <div>
          <div class="price">Price: ${variants[0].price}</div>
          <div>Rarity: Mythic</div>
          <div class="condition">Condition: ${variants[0].condition}</div>
          <div>Live Inventory: 4 copies</div>
          <div class="variant-selector">
            ${variants
              .map(
                v =>
                  `<button onclick="changeVariant(this, '${v.condition}', '${v.price}')">${v.price} - ${v.condition}</button>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    const stack = cardDiv.querySelector('.card-stack');
    cardDiv.addEventListener('mouseenter', () => stack.classList.add('show-stack'));
    cardDiv.addEventListener('mouseleave', () => stack.classList.remove('show-stack'));
    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', () =>
        changeVariant(img, img.dataset.condition, img.dataset.price)
      );
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
