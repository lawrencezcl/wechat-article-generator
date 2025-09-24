const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file path
const dbPath = path.join(__dirname, '../../wechat_article.db');

// Create and connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Convert PostgreSQL-style queries to SQLite format
function convertQuery(text) {
  // Simple conversion for common PostgreSQL patterns
  return text
    .replace(/\$\d+/g, '?') // Replace $1, $2, etc. with ?
    .replace(/::\w+/g, ''); // Remove type casts like ::text, ::int
}

// Database query helper (SQLite version)
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const sqliteQuery = convertQuery(text);
    console.log('Converting query:', { original: text, converted: sqliteQuery });
    
    return new Promise((resolve, reject) => {
      db.all(sqliteQuery, params, (err, rows) => {
        const duration = Date.now() - start;
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          console.log('Executed query', { text: sqliteQuery, duration, rows: rows?.length || 0 });
          resolve({ rows, rowCount: rows?.length || 0 });
        }
      });
    });
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Transaction helper (simplified for SQLite)
const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      callback(db)
        .then(result => {
          db.run('COMMIT');
          resolve(result);
        })
        .catch(error => {
          db.run('ROLLBACK');
          reject(error);
        });
    });
  });
};

// Initialize database schema
const initializeDatabase = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS hot_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      category TEXT,
      source TEXT,
      hotness_score INTEGER DEFAULT 0,
      trend_data TEXT,
      related_keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      hot_topic_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      cover_image_url TEXT,
      article_type TEXT DEFAULT 'educational',
      style TEXT DEFAULT 'professional',
      structure TEXT DEFAULT 'standard',
      word_count INTEGER DEFAULT 0,
      ai_prompt TEXT,
      ai_generated_content TEXT,
      status TEXT DEFAULT 'draft',
      tags TEXT,
      wechat_sync_status TEXT DEFAULT 'pending',
      wechat_article_id TEXT,
      wechat_sync_time DATETIME,
      ai_model TEXT,
      generation_time_seconds INTEGER,
      published_at DATETIME,
      additional_requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (hot_topic_id) REFERENCES hot_topics (id)
    );

    CREATE TABLE IF NOT EXISTS ai_generation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      prompt TEXT NOT NULL,
      generated_content TEXT,
      model_used TEXT,
      tokens_used INTEGER,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS wechat_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      sync_status TEXT,
      wechat_article_id TEXT,
      error_message TEXT,
      sync_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles (id)
    );

    -- Insert sample data
    INSERT OR IGNORE INTO hot_topics (title, summary, category, source, hotness_score, trend_data, related_keywords) VALUES
    ('人工智能写作助手', '探索AI如何改变内容创作方式', 'technology', 'weibo', 85, '{"trend": "up"}', 'AI,写作,技术'),
    ('微信公众号运营', '分享微信公众号的运营技巧和策略', 'marketing', 'wechat', 72, '{"trend": "stable"}', '微信,运营,营销'),
    ('内容营销策略', '如何通过优质内容吸引目标受众', 'marketing', 'zhihu', 68, '{"trend": "up"}', '营销,内容,策略'),
    ('SEO优化技巧', '提升文章搜索引擎排名的实用技巧', 'seo', 'baidu', 78, '{"trend": "up"}', 'SEO,优化,搜索'),
    ('社交媒体趋势', '2024年社交媒体发展趋势分析', 'social', 'douyin', 65, '{"trend": "down"}', '社交,趋势,媒体');

    INSERT OR IGNORE INTO users (username, email, password_hash, profile_data) VALUES
    ('demo_user', 'demo@example.com', '$2b$10$rQK9qGp2YQpGQpGQpGQpGQpGQpGQpGQpGQpGQpGQpGQpGQpGQpGQpG', '{"name": "Demo User", "bio": "Demo account for testing"');

    INSERT OR IGNORE INTO articles (user_id, hot_topic_id, title, content, cover_image_url, article_type, style, structure, word_count, ai_prompt, ai_generated_content, status, tags, wechat_sync_status) VALUES
    (1, 1, 'AI写作助手使用指南', '本文将详细介绍如何使用AI写作助手...', 'https://example.com/ai-writing.jpg', 'educational', 'professional', 'standard', 1200, '写一篇关于AI写作助手的文章', 'AI写作助手是近年来兴起的一种智能工具...', 'published', 'AI,写作,技术', 'synced'),
    (1, 2, '微信公众号运营技巧', '分享一些实用的微信公众号运营技巧...', 'https://example.com/wechat-ops.jpg', 'educational', 'casual', 'listicle', 800, '写一篇关于微信公众号运营的文章', '微信公众号运营需要掌握一些核心技巧...', 'draft', '微信,运营,营销', 'pending'),
    (1, 3, '内容营销策略分析', '深入分析内容营销的有效策略...', 'https://example.com/marketing.jpg', 'analytical', 'professional', 'standard', 1500, '分析内容营销的策略和方法', '内容营销是现代营销的重要组成部分...', 'published', '营销,内容,策略', 'synced');
  `;

  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error initializing database schema:', err);
        reject(err);
      } else {
        console.log('Database schema initialized successfully');
        resolve();
      }
    });
  });
};

// Initialize database on startup
initializeDatabase().catch(console.error);

module.exports = {
  db,
  query,
  transaction
};