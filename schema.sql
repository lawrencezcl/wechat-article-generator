-- PostgreSQL Database Schema for WeChat Article Generator
-- Based on PRD requirements converted from MongoDB to PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wechat_openid VARCHAR(255),
    wechat_unionid VARCHAR(255),
    avatar_url VARCHAR(500),
    subscription_type VARCHAR(50) DEFAULT 'free',
    subscription_end_date TIMESTAMP,
    daily_article_limit INTEGER DEFAULT 5,
    monthly_article_limit INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hot topics table (replacing MongoDB collection)
CREATE TABLE IF NOT EXISTS hot_topics (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    source VARCHAR(100),
    hotness_score INTEGER DEFAULT 0,
    trend_data JSONB,
    related_keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    cover_image_url VARCHAR(500),
    article_type VARCHAR(50) DEFAULT 'educational',
    style VARCHAR(50) DEFAULT 'professional',
    structure VARCHAR(50) DEFAULT 'standard',
    word_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    wechat_sync_status VARCHAR(50) DEFAULT 'pending',
    wechat_article_id VARCHAR(255),
    wechat_sync_time TIMESTAMP,
    ai_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    generation_time_seconds INTEGER DEFAULT 0,
    hot_topic_id INTEGER REFERENCES hot_topics(id),
    additional_requirements JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Article images table
CREATE TABLE IF NOT EXISTS article_images (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    position_in_article INTEGER DEFAULT 0,
    image_type VARCHAR(50) DEFAULT 'content',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User article history table
CREATE TABLE IF NOT EXISTS user_article_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- WeChat sync logs table
CREATE TABLE IF NOT EXISTS wechat_sync_logs (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    sync_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    wechat_response JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI generation logs table
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    model_used VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    generation_time_seconds INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    default_article_type VARCHAR(50) DEFAULT 'educational',
    default_style VARCHAR(50) DEFAULT 'professional',
    default_structure VARCHAR(50) DEFAULT 'standard',
    default_word_count INTEGER DEFAULT 1000,
    preferred_ai_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    auto_image_matching BOOLEAN DEFAULT true,
    auto_wechat_sync BOOLEAN DEFAULT false,
    notification_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS idx_hot_topics_category ON hot_topics(category);
CREATE INDEX IF NOT EXISTS idx_hot_topics_hotness ON hot_topics(hotness_score DESC);
CREATE INDEX IF NOT EXISTS idx_hot_topics_created_at ON hot_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_hot_topic_id ON articles(hot_topic_id);
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_user_article_history_user_id ON user_article_history(user_id);
CREATE INDEX IF NOT EXISTS idx_wechat_sync_logs_article_id ON wechat_sync_logs(article_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hot_topics_updated_at BEFORE UPDATE ON hot_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for hot topics
INSERT INTO hot_topics (title, summary, category, source, hotness_score, trend_data, related_keywords) VALUES
('AI Technology Trends 2024', 'Latest developments in artificial intelligence and machine learning', 'Technology', 'Weibo', 95, '[{"date": "2024-01-01", "score": 80}, {"date": "2024-01-02", "score": 85}, {"date": "2024-01-03", "score": 95}]', ARRAY['AI', 'machine learning', 'technology']),
('Sustainable Living Tips', 'How to live more sustainably in urban environments', 'Lifestyle', 'Zhihu', 88, '[{"date": "2024-01-01", "score": 75}, {"date": "2024-01-02", "score": 82}, {"date": "2024-01-03", "score": 88}]', ARRAY['sustainability', 'green living', 'environment']),
('Remote Work Best Practices', 'Effective strategies for remote team management', 'Business', 'WeChat', 92, '[{"date": "2024-01-01", "score": 85}, {"date": "2024-01-02", "score": 89}, {"date": "2024-01-03", "score": 92}]', ARRAY['remote work', 'productivity', 'management']),
('Digital Marketing Trends', 'Emerging trends in digital marketing for 2024', 'Marketing', 'Baidu', 87, '[{"date": "2024-01-01", "score": 78}, {"date": "2024-01-02", "score": 83}, {"date": "2024-01-03", "score": 87}]', ARRAY['digital marketing', 'SEO', 'social media']),
('Health and Wellness Apps', 'Top health tracking applications for mobile devices', 'Health', 'App Store', 90, '[{"date": "2024-01-01", "score": 82}, {"date": "2024-01-02", "score": 86}, {"date": "2024-01-03", "score": 90}]', ARRAY['health apps', 'fitness', 'wellness']);

-- Insert sample user
INSERT INTO users (username, email, password_hash, subscription_type, daily_article_limit, monthly_article_limit) VALUES
('demo_user', 'demo@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'premium', 20, 200);

-- Insert sample article
INSERT INTO articles (user_id, title, content, article_type, style, structure, word_count, status, ai_model, hot_topic_id) VALUES
(1, 'The Future of AI in Content Creation', 'Artificial intelligence is revolutionizing content creation...', 'educational', 'professional', 'standard', 1200, 'published', 'gpt-3.5-turbo', 1);