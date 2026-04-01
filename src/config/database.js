const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const env = require('./env');

const dbDir = path.dirname(path.resolve(env.db.path));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDatabase(dbPath) {
  if (db) return db;

  const resolvedPath = dbPath || path.resolve(env.db.path);
  db = new Database(resolvedPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  return db;
}

function initializeSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'analyst', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK(amount > 0),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_type ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_records_date ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_records_created_by ON financial_records(created_by);
    CREATE INDEX IF NOT EXISTS idx_records_is_deleted ON financial_records(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function resetDatabase() {
  db = null;
}

module.exports = { getDatabase, closeDatabase, resetDatabase };

