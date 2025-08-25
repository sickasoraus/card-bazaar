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

function applyOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  images.forEach((img, i) => {
    if (!img.dataset.offsetX) {
      img.dataset.offsetX = (Math.random() * 12 - 6).toFixed(2);
      img.dataset.offsetY = (Math.random() * 12 - 6).toFixed(2);
      img.dataset.rotate = (Math.random() * 4 - 2).toFixed(2);
    }
    img.style = img.style || {};
    img.style.transform = `translate(${img.dataset.offsetX}px, ${img.dataset.offsetY}px) rotate(${img.dataset.rotate}deg)`;
    img.style.zIndex = i + 1;
  });
  const active = stack.querySelector('.variant-image.active');
  if (active && active.style) active.style.zIndex = images.length + 10;
}

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
    applyOffsets(stack);

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        animateToCondition(cardDiv, img.dataset.condition);
      });
    });
    cardDiv.querySelectorAll('.condition-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        animateToCondition(cardDiv, btn.dataset.condition);
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
  applyOffsets(stack);
}

  function cycleVariant(stack) {
    const images = Array.from(stack.querySelectorAll('.variant-image'));
    const activeIndex = images.findIndex(img => img.classList.contains('active'));
    const nextIndex = (activeIndex - 1 + images.length) % images.length;
    const active = images[activeIndex];
    const next = images[nextIndex];
    const card = stack.closest('.card');

    const baseTransform = `translate(${active.dataset.offsetX}px, ${active.dataset.offsetY}px) rotate(${active.dataset.rotate}deg)`;
    active.style.transform = baseTransform;
    active.style.transition = 'transform 0.3s ease-in-out';
    active.style.transform = `${baseTransform} translate(40px, 40px) rotate(10deg)`;

    return new Promise(resolve => {
      setTimeout(() => {
        active.style.transition = '';
        active.classList.remove('active');
        stack.insertBefore(active, stack.firstChild);
        next.classList.add('active');
        if (card) {
          card.querySelector('.price').textContent = `Price: ${next.dataset.price}`;
          card.querySelector('.condition').textContent = `Condition: ${next.dataset.condition}`;
        }
        applyOffsets(stack);
        resolve();
      }, 300);
    });
  }

  async function animateToCondition(card, condition) {
    const stack = card.querySelector('.card-stack');
    const images = Array.from(stack.querySelectorAll('.variant-image'));
    const currentIndex = images.findIndex(img => img.classList.contains('active'));
    const targetIndex = images.findIndex(img => img.dataset.condition === condition);
    let steps = (currentIndex - targetIndex + images.length) % images.length;

    while (steps > 0) {
      const active = stack.querySelector('.variant-image.active');
      if (active && active.classList) active.classList.add('flipping');
      await new Promise(r => setTimeout(r, 150));
      if (active && active.classList) active.classList.remove('flipping');
      await cycleVariant(stack);
      await new Promise(r => setTimeout(r, 50));
      steps--;
    }
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
