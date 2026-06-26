const mariadb = require('mariadb');
require('dotenv').config();

// ── Env-var validation (fail-fast at boot) ───────────────────────────
const REQUIRED_ENV = ['DISCORD_TOKEN', 'DB_PASS'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Explicit check for TLS in production
if (process.env.NODE_ENV === 'production' && process.env.DB_USE_TLS !== 'true') {
  console.error(`[FATAL] Production mode requires DB_USE_TLS=true for security. Enable it or change NODE_ENV.`);
  process.exit(1);
}

const pool = mariadb.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'microvolts',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME     || 'microvolts',
  connectionLimit: 10,
  acquireTimeout: 10000,
  ssl: process.env.DB_USE_TLS === 'true' || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true } 
    : undefined
});

/**
 * Run a query with automatic connection management.
 * @param {string} sql
 * @param {any[]}  params
 */
async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get a raw connection for transactional work.
 * Caller is responsible for commit/rollback/release.
 */
async function getConnection() {
  return pool.getConnection();
}

/**
 * Verify DB connectivity, then ensure the bot's linking table exists.
 * The `users` table is owned by the game server — never touch it here.
 */
async function initDB() {
  // ── Connectivity check ──────────────────────────────────────────
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    console.log('[DB] Connection verified.');
  } catch (err) {
    console.error('[FATAL] Cannot connect to database:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }

  // ── Bot-managed bridge table (maps Discord IDs → game AccountIDs) ─
  await query(`
    CREATE TABLE IF NOT EXISTS discord_links (
      AccountID   INT(11)      NOT NULL,
      DiscordID   VARCHAR(20)  NOT NULL COMMENT 'Discord snowflake ID',
      LinkedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      Passphrase  VARCHAR(255) DEFAULT NULL COMMENT 'Hashed recovery passphrase',
      LastPasswordChange DATETIME DEFAULT NULL,
      ChangePwFailures INT NOT NULL DEFAULT 0,
      ChangePwLockoutUntil DATETIME DEFAULT NULL,
      PRIMARY KEY (AccountID),
      INDEX idx_discord (DiscordID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  
  // Migrate existing tables that had the strict 1-account UNIQUE constraint
  try {
    await query(`ALTER TABLE discord_links DROP INDEX DiscordID`);
    await query(`CREATE INDEX idx_discord ON discord_links (DiscordID)`);
  } catch (e) {
    // Ignore errors if the index doesn't exist or was already fixed
  }

  // Migrate columns for existing installs
  try {
    await query(`ALTER TABLE discord_links 
      ADD COLUMN Passphrase VARCHAR(255) DEFAULT NULL,
      ADD COLUMN LastPasswordChange DATETIME DEFAULT NULL,
      ADD COLUMN ChangePwFailures INT NOT NULL DEFAULT 0,
      ADD COLUMN ChangePwLockoutUntil DATETIME DEFAULT NULL`);
  } catch (e) {
    // Ignore errors if columns already exist
  }

  console.log('[DB] Table "discord_links" ready.');
}

module.exports = { query, getConnection, initDB };
