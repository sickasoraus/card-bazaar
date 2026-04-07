import { STORAGE_KEYS, safeGetItem, safeSetItem, safeRemoveItem, safeJSONParse } from './storage.mjs';

const state = {
  user: safeJSONParse(safeGetItem(STORAGE_KEYS.user, null), null),
  cart: [],
  binder: safeJSONParse(safeGetItem(STORAGE_KEYS.binder, '[]'), []),
  sellOrder: safeJSONParse(safeGetItem(STORAGE_KEYS.sellOrder, '[]'), []),
  storeCredit: parseFloat(safeGetItem(STORAGE_KEYS.storeCredit, '0')) || 0,
};

const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function setUser(user) {
  state.user = user;
  if (user) {
    safeSetItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    safeRemoveItem(STORAGE_KEYS.user);
  }
  emit();
}

export function setStoreCredit(value) {
  state.storeCredit = Number.isFinite(value) ? value : 0;
  safeSetItem(STORAGE_KEYS.storeCredit, String(state.storeCredit));
  emit();
}

export function addStoreCredit(delta) {
  setStoreCredit(state.storeCredit + (Number.isFinite(delta) ? delta : 0));
}

export function setBinder(items) {
  state.binder = Array.isArray(items) ? items.slice() : [];
  safeSetItem(STORAGE_KEYS.binder, JSON.stringify(state.binder));
  emit();
}

export function addBinderItem(item) {
  state.binder.push(item);
  safeSetItem(STORAGE_KEYS.binder, JSON.stringify(state.binder));
  emit();
}

export function removeBinderItem(index) {
  if (!Number.isFinite(index) || index < 0 || index >= state.binder.length) return;
  state.binder.splice(index, 1);
  safeSetItem(STORAGE_KEYS.binder, JSON.stringify(state.binder));
  emit();
}

export function reorderBinder(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
  if (from < 0 || from >= state.binder.length || to < 0 || to >= state.binder.length) return;
  const [moved] = state.binder.splice(from, 1);
  state.binder.splice(to, 0, moved);
  safeSetItem(STORAGE_KEYS.binder, JSON.stringify(state.binder));
  emit();
}

export function setSellOrder(items) {
  state.sellOrder = Array.isArray(items) ? items.slice() : [];
  safeSetItem(STORAGE_KEYS.sellOrder, JSON.stringify(state.sellOrder));
  emit();
}

export function addSellOrderItem(item) {
  state.sellOrder.push(item);
  safeSetItem(STORAGE_KEYS.sellOrder, JSON.stringify(state.sellOrder));
  emit();
}

export function removeSellOrderItem(index) {
  if (!Number.isFinite(index) || index < 0 || index >= state.sellOrder.length) return;
  state.sellOrder.splice(index, 1);
  safeSetItem(STORAGE_KEYS.sellOrder, JSON.stringify(state.sellOrder));
  emit();
}

export function clearSellOrder() {
  state.sellOrder.length = 0;
  safeSetItem(STORAGE_KEYS.sellOrder, JSON.stringify(state.sellOrder));
  emit();
}

export function addCartItem(item) {
  state.cart.push(item);
  emit();
}

export function removeCartItem(index) {
  if (!Number.isFinite(index) || index < 0 || index >= state.cart.length) return;
  state.cart.splice(index, 1);
  emit();
}

export function clearCart() {
  state.cart.length = 0;
  emit();
}
