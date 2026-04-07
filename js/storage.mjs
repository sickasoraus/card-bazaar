export const STORAGE_KEYS = {
  storeCredit: 'cb_store_credit',
  binder: 'cb_binder',
  user: 'user',
  sellOrder: 'cb_sell_order',
  emailCaptureSubmitted: 'cb_email_capture_submitted',
  emailCaptureOptedOut: 'cb_email_capture_opted_out',
  spinOnce: 'cb_spin_once',
  rewardsLedger: 'cb_rewards_ledger',
};

export function safeGetItem(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

export function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

export function safeRemoveItem(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

export function safeJSONParse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}
