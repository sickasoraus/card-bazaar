const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function initDB() {
  const dataDir = path.join(process.cwd(), 'data');
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, 'app.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      email_norm TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      email_verified_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ip TEXT,
      ua TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL,
      card_id TEXT,
      name TEXT NOT NULL,
      condition TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      image TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(cart_id) REFERENCES carts(id)
    );

    CREATE TABLE IF NOT EXISTS binder_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT,
      name TEXT NOT NULL,
      condition TEXT NOT NULL,
      qty INTEGER NOT NULL,
      acq_price_cents INTEGER NOT NULL,
      acquired_at INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      image TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  return db;
}

module.exports = { initDB };
