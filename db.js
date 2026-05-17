// Load environment variables from .env in non-production environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

async function query(text, params) {
  const start = Date.now();
  const res = await getPool().query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

// User operations
async function createUser(email, passwordHash) {
  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function findUserById(id) {
  const result = await query('SELECT id, email, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Notes operations
async function createNote(userId, content) {
  const result = await query(
    'INSERT INTO notes (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at',
    [userId, content]
  );
  return result.rows[0];
}

async function getNotesByUser(userId) {
  const result = await query(
    'SELECT id, content, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  createNote,
  getNotesByUser,
};
