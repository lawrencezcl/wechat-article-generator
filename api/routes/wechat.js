const { query } = require('../db');
const axios = require('axios');
require('dotenv').config();

// WeChat API configuration
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || 'your-wechat-app-id';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || 'your-wechat-app-secret';

// Sync article to WeChat
const syncToWeChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { article_id } = req.body;
    
    // Validate input
    if (!article_id) {
      return res.status(400).json({
        success: false,
        error: 'Article ID is required'
      });
    }
    
    // Get article details
    const articleResult = await query(`
      SELECT a.*, u.username as author_name
      FROM articles a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [article_id, userId]);
    
    if (articleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or unauthorized'
      });
    }
    
    const article = articleResult.rows[0];
    
    // Check if already synced
    if (article.wechat_sync_status === 'synced') {
      return res.status(400).json({
        success: false,
        error: 'Article already synced to WeChat'
      });
    }
    
    try {
      // Simulate WeChat API call (replace with actual WeChat API integration)
      const wechatResponse = await simulateWeChatPublish(article);
      
      // Update article sync status
      await query(`
        UPDATE articles 
        SET wechat_sync_status = $1, wechat_article_id = $2, wechat_sync_time = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['synced', wechatResponse.article_id, article_id]);
      
      // Log successful sync
      await query(`
        INSERT INTO wechat_sync_logs (article_id, sync_status, wechat_response)
        VALUES ($1, $2, $3)
      `, [article_id, 'success', JSON.stringify(wechatResponse)]);
      
      res.json({
        success: true,
        data: {
          message: 'Article successfully synced to WeChat',
          wechat_article_id: wechatResponse.article_id,
          sync_time: new Date().toISOString()
        }
      });
      
    } catch (syncError) {
      // Log failed sync
      await query(`
        INSERT INTO wechat_sync_logs (article_id, sync_status, error_message)
        VALUES ($1, $2, $3)
      `, [article_id, 'failed', syncError.message]);
      
      // Update article sync status
      await query(`
        UPDATE articles 
        SET wechat_sync_status = $1
        WHERE id = $2
      `, ['failed', article_id]);
      
      throw syncError;
    }
    
  } catch (error) {
    console.error('Error syncing to WeChat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync article to WeChat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get WeChat sync status
const getSyncStatus = async (req, res) => {
  try {
    const { article_id } = req.params;
    const userId = req.user.userId;
    
    // Verify article ownership
    const articleResult = await query(`
      SELECT id FROM articles WHERE id = $1 AND user_id = $2
    `, [article_id, userId]);
    
    if (articleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or unauthorized'
      });
    }
    
    // Get sync logs
    const syncLogsResult = await query(`
      SELECT * FROM wechat_sync_logs 
      WHERE article_id = $1 
      ORDER BY created_at DESC
    `, [article_id]);
    
    // Get current sync status
    const currentStatusResult = await query(`
      SELECT wechat_sync_status, wechat_article_id, wechat_sync_time
      FROM articles WHERE id = $1
    `, [article_id]);
    
    res.json({
      success: true,
      data: {
        current_status: currentStatusResult.rows[0],
        sync_history: syncLogsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status'
    });
  }
};

// Get WeChat sync logs
const getSyncLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const countResult = await query(`
      SELECT COUNT(*) 
      FROM wechat_sync_logs wsl
      JOIN articles a ON wsl.article_id = a.id
      WHERE a.user_id = $1
    `, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const result = await query(`
      SELECT wsl.*, a.title as article_title
      FROM wechat_sync_logs wsl
      JOIN articles a ON wsl.article_id = a.id
      WHERE a.user_id = $1
      ORDER BY wsl.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs'
    });
  }
};

// Simulate WeChat API call (replace with actual implementation)
const simulateWeChatPublish = async (article) => {
  // This is a simulation - replace with actual WeChat API integration
  console.log('Simulating WeChat API call for article:', article.title);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate random success/failure
  if (Math.random() > 0.1) { // 90% success rate
    return {
      success: true,
      article_id: `wechat_${Date.now()}_${article.id}`,
      published_at: new Date().toISOString(),
      wechat_url: `https://mp.weixin.qq.com/s/wechat_${Date.now()}_${article.id}`
    };
  } else {
    throw new Error('WeChat API rejected the article content');
  }
};

// Get WeChat account info (placeholder)
const getWeChatAccountInfo = async (req, res) => {
  try {
    // This would typically call WeChat API to get account information
    res.json({
      success: true,
      data: {
        app_id: WECHAT_APP_ID,
        account_status: 'active',
        subscription_type: 'service_account',
        followers_count: 1250, // Placeholder
        articles_published: 45, // Placeholder
        last_sync: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching WeChat account info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WeChat account information'
    });
  }
};

const express = require('express');
const router = express.Router();

// Protected routes
router.post('/sync', syncToWeChat);
router.get('/sync-status/:article_id', getSyncStatus);
router.get('/sync-logs', getSyncLogs);
router.get('/account-info', getWeChatAccountInfo);

module.exports = router;