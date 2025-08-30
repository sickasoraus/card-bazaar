const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');
const { initDB } = require('./db');
const { sendMail } = require('./mailer');

const app = express();
const db = initDB();

const PORT = process.env.PORT || 5173; // match README local port
const COOKIE_NAME = '__cb_sess';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const PEPPER = process.env.AUTH_PEPPER || 'dev-pepper-change-me';

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-cookie-secret'));

// --- Health ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Session middleware ---
app.use((req, res, next) => {
  let sid = req.signedCookies[COOKIE_NAME];
  const now = Date.now();
  if (!sid) {
    sid = uuidv4();
    const expires = now + SESSION_TTL_MS;
    db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at, ip, ua) VALUES (?,?,?,?,?,?)')
      .run(sid, null, now, expires, req.ip || '', req.headers['user-agent'] || '');
    res.cookie(COOKIE_NAME, sid, { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, signed: true, maxAge: SESSION_TTL_MS });
  } else {
    // extend expiry lazily
    db.prepare('UPDATE sessions SET expires_at=? WHERE id=?').run(now + SESSION_TTL_MS, sid);
  }
  req.sessionId = sid;
  const row = db.prepare('SELECT user_id FROM sessions WHERE id=?').get(sid);
  req.userId = row && row.user_id ? row.user_id : null;
  next();
});

// --- Helpers ---
function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function cents(n) { return Math.max(0, Math.round(Number(n || 0))); }

function ensureCartFor(sessionId, userId) {
  let cart;
  if (userId) {
    cart = db.prepare('SELECT * FROM carts WHERE user_id=?').get(userId);
  } else {
    cart = db.prepare('SELECT * FROM carts WHERE session_id=?').get(sessionId);
  }
  const now = Date.now();
  if (!cart) {
    const id = uuidv4();
    db.prepare('INSERT INTO carts (id, user_id, session_id, created_at, updated_at) VALUES (?,?,?,?,?)')
      .run(id, userId || null, userId ? null : sessionId, now, now);
    cart = db.prepare('SELECT * FROM carts WHERE id=?').get(id);
  }
  return cart;
}

function cartItemsFor(cartId) {
  return db.prepare('SELECT * FROM cart_items WHERE cart_id=? ORDER BY created_at ASC').all(cartId);
}

function binderItemsFor(userId) {
  return db.prepare('SELECT * FROM binder_items WHERE user_id=? ORDER BY order_index ASC, acquired_at ASC').all(userId);
}

// --- Auth ---
app.get('/api/me', (req, res) => {
  if (!req.userId) return res.json({ user: null });
  const u = db.prepare('SELECT id, email FROM users WHERE id=?').get(req.userId);
  res.json({ user: u ? { id: u.id, email: u.email } : null });
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const email_norm = normEmail(email);
    if (!email_norm || !password) return res.status(400).json({ error: 'email and password required' });
    const u = db.prepare('SELECT * FROM users WHERE email_norm=?').get(email_norm);
    if (!u) return res.status(404).json({ error: 'not_found' });
    const ok = await argon2.verify(u.password_hash, password + PEPPER);
    if (!ok) return res.status(401).json({ error: 'invalid_password' });
    db.prepare('UPDATE sessions SET user_id=? WHERE id=?').run(u.id, req.sessionId);
    // Optional: send login notification email (non-gating)
    sendMail({
      to: u.email,
      subject: 'New login to Card Bazaar',
      text: `A login to your Card Bazaar account just occurred. If this wasn't you, reset your password.`,
      html: `<p>A login to your Card Bazaar account just occurred.</p><p>If this wasn't you, <a href="${req.protocol}://${req.get('host')}/auth/reset">reset your password</a>.</p>`
    }).catch(()=>{});
    res.json({ user: { id: u.id, email: u.email } });
  } catch (e) {
    res.status(500).json({ error: 'login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  db.prepare('UPDATE sessions SET user_id=NULL WHERE id=?').run(req.sessionId);
  res.json({ ok: true });
});

// Signup: create account and auto-verify; attach session
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const email_norm = normEmail(email);
    if (!email_norm || !password) return res.status(400).json({ error: 'email and password required' });
    const exists = db.prepare('SELECT id FROM users WHERE email_norm=?').get(email_norm);
    if (exists) return res.status(409).json({ error: 'already_exists' });
    const id = uuidv4();
    const hash = await argon2.hash(password + PEPPER, { type: argon2.argon2id });
    const now = Date.now();
    db.prepare('INSERT INTO users (id, email, email_norm, password_hash, created_at, email_verified_at) VALUES (?,?,?,?,?,?)')
      .run(id, email, email_norm, hash, now, now);
    db.prepare('UPDATE sessions SET user_id=? WHERE id=?').run(id, req.sessionId);
    res.json({ user: { id, email } });
  } catch (e) {
    res.status(500).json({ error: 'signup failed' });
  }
});

// Email verification landing
app.get('/auth/verify', (req, res) => {
  const { token } = req.query || {};
  const now = Date.now();
  const row = db.prepare('SELECT * FROM email_verifications WHERE token=?').get(token);
  if (!row || (row.expires_at < now) || row.used_at) {
    return res.status(400).send('<h1>Invalid or expired verification link</h1>');
  }
  db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(now, row.user_id);
  db.prepare('UPDATE email_verifications SET used_at=? WHERE token=?').run(now, token);
  // attach session to this user if current session exists
  if (req.sessionId) db.prepare('UPDATE sessions SET user_id=? WHERE id=?').run(row.user_id, req.sessionId);
  res.send('<h1>Account confirmed</h1><p>You can return to the site and continue.</p>');
});

// Forgot password -> send reset link
app.post('/api/forgot', (req, res) => {
  const { email } = req.body || {};
  const email_norm = normEmail(email);
  if (!email_norm) return res.status(400).json({ error: 'email required' });
  const u = db.prepare('SELECT * FROM users WHERE email_norm=?').get(email_norm);
  // Respond 200 even if not found, to avoid account enumeration
  if (!u) return res.json({ ok: true });
  const token = uuidv4();
  const now = Date.now();
  const ttl = 1000 * 60 * 60; // 1h
  db.prepare('INSERT INTO password_resets (token, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .run(token, u.id, now, now + ttl);
  const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset?token=${encodeURIComponent(token)}`;
  sendMail({
    to: u.email,
    subject: 'Reset your Card Bazaar password',
    text: `Reset your password: ${resetUrl}`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  }).catch(()=>{});
  res.json({ ok: true });
});

// Reset password form + submit
app.get('/auth/reset', (req, res) => {
  const { token } = req.query || {};
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset Password</title></head>
  <body style="font-family: sans-serif; max-width: 640px; margin: 40px auto;">
    <h1>Reset Password</h1>
    <form method="POST" action="/auth/reset">
      <input type="hidden" name="token" value="${String(token||'').replace(/"/g,'&quot;')}">
      <div style="margin:8px 0;">
        <label>New password<br><input type="password" name="password" required></label>
      </div>
      <div style="margin:8px 0;">
        <label>Confirm password<br><input type="password" name="password2" required></label>
      </div>
      <button type="submit">Set Password</button>
    </form>
  </body></html>`;
  res.set('Content-Type', 'text/html').send(html);
});

app.post('/auth/reset', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { token, password, password2 } = req.body || {};
    if (!token || !password || password !== password2) return res.status(400).send('<h1>Invalid request</h1>');
    const row = db.prepare('SELECT * FROM password_resets WHERE token=?').get(token);
    const now = Date.now();
    if (!row || row.used_at || row.expires_at < now) return res.status(400).send('<h1>Invalid or expired token</h1>');
    const hash = await argon2.hash(password + PEPPER, { type: argon2.argon2id });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, row.user_id);
    db.prepare('UPDATE password_resets SET used_at=? WHERE token=?').run(now, token);
    // attach session to this user if possible
    if (req.sessionId) db.prepare('UPDATE sessions SET user_id=? WHERE id=?').run(row.user_id, req.sessionId);
    res.send('<h1>Password updated</h1><p>You can return to the site and log in.</p>');
  } catch (e) {
    res.status(500).send('<h1>Server error</h1>');
  }
});

// --- Cart ---
app.get('/api/cart', (req, res) => {
  const cart = ensureCartFor(req.sessionId, req.userId);
  const items = cartItemsFor(cart.id);
  res.json({ cart: { id: cart.id, items } });
});

app.post('/api/cart/add', (req, res) => {
  const { name, condition, unit_price_cents, qty = 1, image = '', card_id = null } = req.body || {};
  if (!name || !condition) return res.status(400).json({ error: 'invalid item' });
  const cart = ensureCartFor(req.sessionId, req.userId);
  const id = uuidv4();
  const now = Date.now();
  db.prepare('INSERT INTO cart_items (id, cart_id, card_id, name, condition, qty, unit_price_cents, image, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, cart.id, card_id, name, condition, qty, cents(unit_price_cents), image, now);
  db.prepare('UPDATE carts SET updated_at=? WHERE id=?').run(now, cart.id);
  res.json({ ok: true, item_id: id });
});

app.post('/api/cart/remove_one', (req, res) => {
  const { id, name, condition, unit_price_cents } = req.body || {};
  const cart = ensureCartFor(req.sessionId, req.userId);
  if (id) {
    db.prepare('DELETE FROM cart_items WHERE id=? AND cart_id=?').run(id, cart.id);
  } else if (name && condition && (unit_price_cents !== undefined)) {
    const row = db.prepare('SELECT id FROM cart_items WHERE cart_id=? AND name=? AND condition=? AND unit_price_cents=? ORDER BY created_at ASC LIMIT 1')
      .get(cart.id, name, condition, cents(unit_price_cents));
    if (row) db.prepare('DELETE FROM cart_items WHERE id=?').run(row.id);
  }
  res.json({ ok: true });
});

// --- Checkout (prototype) -> move cart items to binder for logged-in users ---
app.post('/api/checkout/simulate', (req, res) => {
  const userId = req.userId;
  const cart = ensureCartFor(req.sessionId, req.userId);
  const items = cartItemsFor(cart.id);
  const now = Date.now();
  if (userId && items.length) {
    // choose starting order_index
    const last = db.prepare('SELECT order_index FROM binder_items WHERE user_id=? ORDER BY order_index DESC LIMIT 1').get(userId);
    let idx = last ? (last.order_index + 1) : 1;
    const insert = db.prepare('INSERT INTO binder_items (id, user_id, card_id, name, condition, qty, acq_price_cents, acquired_at, order_index, image) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const it of items) {
      insert.run(uuidv4(), userId, it.card_id || null, it.name, it.condition, it.qty, it.unit_price_cents, now, idx++, it.image || '');
    }
  }
  db.prepare('DELETE FROM cart_items WHERE cart_id=?').run(cart.id);
  res.json({ ok: true, moved_to_binder: !!userId });
});

// --- Binder ---
app.get('/api/binder', (req, res) => {
  if (!req.userId) return res.json({ items: [] });
  const items = binderItemsFor(req.userId);
  res.json({ items });
});

app.post('/api/binder/reorder', (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'auth required' });
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array of ids' });
  const upd = db.prepare('UPDATE binder_items SET order_index=? WHERE id=? AND user_id=?');
  let i = 1; for (const id of order) { upd.run(i++, id, req.userId); }
  res.json({ ok: true });
});

app.post('/api/binder/remove', (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'auth required' });
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  db.prepare('DELETE FROM binder_items WHERE id=? AND user_id=?').run(id, req.userId);
  res.json({ ok: true });
});

// --- Static site (keep UI the same) ---
const staticDir = process.cwd();
app.use(express.static(staticDir, { extensions: ['html'] }));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Card Bazaar server listening on http://localhost:${PORT}`);
});
