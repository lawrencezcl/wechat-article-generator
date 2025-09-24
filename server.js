const express = require('express');
const cors = require('cors');
const { query } = require('./api/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const hotTopicsRoutes = require('./api/routes/hotTopics');
const { router: usersRoutes, authenticateToken } = require('./api/routes/users');
const articlesRoutes = require('./api/routes/articles');
const aiRoutes = require('./api/routes/ai');
const wechatRoutes = require('./api/routes/wechat');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'WeChat Article Generator API is running',
    timestamp: new Date().toISOString()
  });
});

// Database connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time');
    res.json({ 
      success: true, 
      message: 'Database connection successful',
      current_time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// API routes
app.use('/api/hot-topics', hotTopicsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/wechat', authenticateToken, wechatRoutes);

// Serve static files (frontend)
app.use(express.static('.'));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;