const { Pool } = require('pg');
require('dotenv').config();

let db;
let query;
let transaction;

function setupSQLite() {
  const sqlite = require('./sqlite');
  db = sqlite.db;
  query = sqlite.query;
  transaction = sqlite.transaction;
  console.log('SQLite setup complete');
}

function setupPostgreSQL(pool) {
  db = pool;
  
  query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  transaction = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };
  
  console.log('PostgreSQL setup complete');
}

// Initialize database connection
try {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_w9QEDSlLkyT3@ep-jolly-hill-adhlaq48-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.connect((err, client, done) => {
    if (err) {
      console.log('PostgreSQL connection failed, falling back to SQLite...');
      setupSQLite();
    } else {
      console.log('Connected to PostgreSQL database');
      done();
      setupPostgreSQL(pool);
    }
  });
} catch (error) {
  console.log('PostgreSQL not available, using SQLite...');
  setupSQLite();
}

// Export functions that will be available after initialization
module.exports = {
  query: async (...args) => {
    if (!query) {
      throw new Error('Database not initialized yet');
    }
    return query(...args);
  },
  transaction: async (...args) => {
    if (!transaction) {
      throw new Error('Database not initialized yet');
    }
    return transaction(...args);
  },
  getDb: () => db
};