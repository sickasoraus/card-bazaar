const test = require('node:test');
const assert = require('node:assert/strict');
const { changeVariant } = require('../fetchCardImages');

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.className = '';
    this.dataset = {};
    this.textContent = '';
  }
  get classList() {
    const el = this;
    return {
      add(cls) {
        if (!el.className.split(' ').includes(cls)) {
          el.className += (el.className ? ' ' : '') + cls;
        }
      },
      remove(cls) {
        el.className = el.className
          .split(' ')
          .filter(c => c !== cls)
          .join(' ');
      },
      contains(cls) {
        return el.className.split(' ').includes(cls);
      }
    };
  }
  appendChild(child) {
    if (child.parentElement) {
      const idx = child.parentElement.children.indexOf(child);
      if (idx !== -1) child.parentElement.children.splice(idx, 1);
    }
    child.parentElement = this;
    this.children.push(child);
  }
  insertBefore(newChild, referenceChild) {
    if (newChild.parentElement) {
      const idx = newChild.parentElement.children.indexOf(newChild);
      if (idx !== -1) newChild.parentElement.children.splice(idx, 1);
    }
    const refIdx = this.children.indexOf(referenceChild);
    newChild.parentElement = this;
    if (refIdx === -1) {
      this.children.push(newChild);
    } else {
      this.children.splice(refIdx, 0, newChild);
    }
  }
  get lastElementChild() {
    return this.children[this.children.length - 1];
  }
  get firstElementChild() {
    return this.children[0];
  }
}

function matches(el, selector) {
  if (!selector.startsWith('.')) return false;
  const classes = selector.slice(1).split('.');
  const classList = el.className.split(' ').filter(Boolean);
  return classes.every(c => classList.includes(c));
}

Element.prototype.querySelector = function(selector) {
  for (const child of this.children) {
    if (matches(child, selector)) return child;
    const found = child.querySelector(selector);
    if (found) return found;
  }
  return null;
};

Element.prototype.querySelectorAll = function(selector) {
  let results = [];
  for (const child of this.children) {
    if (matches(child, selector)) results.push(child);
    results = results.concat(child.querySelectorAll(selector));
  }
  return results;
};

Element.prototype.closest = function(selector) {
  let current = this;
  while (current) {
    if (matches(current, selector)) return current;
    current = current.parentElement;
  }
  return null;
};

function el(tag, className) {
  const e = new Element(tag);
  if (className) className.split(' ').forEach(c => e.classList.add(c));
  return e;
}

function buildCard() {
  const card = el('div', 'card');
  const stack = el('div', 'card-stack');
  const price = el('div', 'price');
  price.textContent = 'Price: $29.99';
  const condition = el('div', 'condition');
  condition.textContent = 'Condition: NM';
  card.appendChild(stack);
  card.appendChild(price);
  card.appendChild(condition);

  const variants = ['NM', 'EX', 'LP', 'HP'].map(cond => {
    const img = el('img', 'variant-image');
    img.dataset.condition = cond;
    stack.appendChild(img);
    return img;
  });
  variants[0].classList.add('active');

  const selector = el('div', 'variant-selector');
  const buttons = ['NM', 'EX', 'LP', 'HP'].map(() => el('button'));
  buttons.forEach(btn => selector.appendChild(btn));
  card.appendChild(selector);

  return { card, stack, price, condition, buttons };
}

test('changeVariant reorders stack and updates labels', () => {
  const { card, stack, price, condition, buttons } = buildCard();

    changeVariant(buttons[2], 'LP', '$24.99');
    assert.equal(stack.firstElementChild.dataset.condition, 'LP');
    assert.equal(stack.querySelector('.variant-image.active').dataset.condition, 'LP');
    assert.equal(price.textContent, 'Price: $24.99');
    assert.equal(condition.textContent, 'Condition: LP');

    changeVariant(buttons[3], 'HP', '$19.99');
    assert.equal(stack.firstElementChild.dataset.condition, 'HP');
    assert.equal(stack.querySelector('.variant-image.active').dataset.condition, 'HP');
    assert.equal(price.textContent, 'Price: $19.99');
    assert.equal(condition.textContent, 'Condition: HP');

  assert.equal(stack.querySelectorAll('.variant-image').length, 4);
});

