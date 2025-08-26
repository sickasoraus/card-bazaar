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
  const preset = [
    { x: -20, y: -20, r: -4 },
    { x: -10, y: 10, r: -2 },
    { x: 10, y: -10, r: 2 },
    { x: 0, y: 0, r: 0 }
  ];

  // Rotate preset each time so the top card lands in a new spot
  const shift = stack._offsetShift || 0;
  const rotated = preset.slice(shift).concat(preset.slice(0, shift));

  images.forEach((img, i) => {
    const off = rotated[i] || rotated[rotated.length - 1];
    img.dataset.offsetX = off.x;
    img.dataset.offsetY = off.y;
    img.dataset.rotate = off.r;
    img.style.transform = `translate(${off.x}px, ${off.y}px) rotate(${off.r}deg)`;
    img.style.zIndex = i + 1;
  });

  stack._offsetShift = (shift + 1) % preset.length;

  const active = stack.querySelector('.variant-image.active');
  if (active && active.style) active.style.zIndex = images.length + 10;
}

function resetOffsets(stack) {
  const images = Array.from(stack.querySelectorAll('.variant-image'));
  images.forEach(img => {
    img.style.transform = 'translate(0px, 0px) rotate(0deg)';
  });
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
        <button class="add-cart-btn">Add to Cart</button>
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
    resetOffsets(stack);
    stack._hovered = false;

    cardDiv.addEventListener('mouseenter', () => {
      stack._hovered = true;
      applyOffsets(stack);
    });

    cardDiv.addEventListener('mouseleave', () => {
      stack._hovered = false;
      resetOffsets(stack);
    });

    let clickTimer;
    stack.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        cycleVariant(stack);
        clickTimer = null;
      }, 200);
    });

    stack.querySelectorAll('.variant-image').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        animateToCondition(cardDiv, img.dataset.condition);
      });
    });
    cardDiv.querySelectorAll('.condition-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('add-cart-btn')) {
          const active = cardDiv.querySelector('.variant-image.active');
          if (active && typeof addToCart === 'function') {
            addToCart({ name, condition: active.dataset.condition, price: active.dataset.price });
          }
        } else {
          animateToCondition(cardDiv, btn.dataset.condition);
        }
      });
    });

    cardDiv.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      const active = cardDiv.querySelector('.variant-image.active');
      if (active && typeof addToCart === 'function') {
        addToCart({ name, condition: active.dataset.condition, price: active.dataset.price });
      }
    });

    grid.appendChild(cardDiv);
  }
}

async function changeVariant(button, condition, price) {
  const card = button.closest('.card');
  await animateToCondition(card, condition);
  if (card) {
    card.querySelector('.price').textContent = `Price: ${price}`;
    card.querySelector('.condition').textContent = `Condition: ${condition}`;
  }
}

  function cycleVariant(stack) {
    const images = Array.from(stack.querySelectorAll('.variant-image'));
    const activeIndex = images.findIndex(img => img.classList.contains('active'));
    const nextIndex = (activeIndex - 1 + images.length) % images.length;
    const active = images[activeIndex];
    const next = images[nextIndex];
    const card = stack.closest('.card');

    // Smoothly move each image to its next position
    images.forEach(img => {
      img.style.transition = 'transform 0.3s ease-in-out';
    });

    // Active image flips and slides to the back of the stack
    const bottom = images[0];
    const targetX = bottom.dataset.offsetX || 0;
    const targetY = bottom.dataset.offsetY || 0;
    const targetR = bottom.dataset.rotate || 0;
    active.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${targetR}deg) rotateY(180deg)`;

    // Remaining images shift forward one slot
    images.forEach((img, i) => {
      if (i !== activeIndex) {
        const ref = images[(i + 1) % images.length];
        img.style.transform = `translate(${ref.dataset.offsetX || 0}px, ${ref.dataset.offsetY || 0}px) rotate(${ref.dataset.rotate || 0}deg)`;
      }
    });

    // Lower z-index mid-animation so the card appears behind others
    setTimeout(() => {
      active.style.zIndex = 1;
    }, 150);

    return new Promise(resolve => {
      setTimeout(() => {
        images.forEach(img => {
          img.style.transition = '';
        });
        active.classList.remove('active');
        stack.insertBefore(active, stack.firstChild);
        next.classList.add('active');
        if (card) {
          card.querySelector('.price').textContent = `Price: ${next.dataset.price}`;
          card.querySelector('.condition').textContent = `Condition: ${next.dataset.condition}`;
        }
        applyOffsets(stack);
        if (!stack._hovered) resetOffsets(stack);
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
      await cycleVariant(stack);
      await new Promise(r => setTimeout(r, 50));
      steps--;
    }
  }

// UMD-style export so function is available in browser and Node tests
if (typeof module !== 'undefined') {
  module.exports = { fetchCardImages, cardNames, changeVariant, cycleVariant, animateToCondition };
} else {
  window.fetchCardImages = fetchCardImages;
  window.cardNames = cardNames;
  window.changeVariant = changeVariant;
  window.cycleVariant = cycleVariant;
  window.animateToCondition = animateToCondition;
}
