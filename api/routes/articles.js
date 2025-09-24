const { query, transaction } = require('../db');

// Get all articles with pagination and filtering
const getArticles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      user_id,
      sortBy = 'created_at', 
      order = 'DESC' 
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (user_id) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }
    
    const allowedSortBy = ['created_at', 'updated_at', 'title', 'word_count', 'status'];
    const sortField = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const countQuery = `SELECT COUNT(*) FROM articles ${whereClause}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const selectQuery = `
      SELECT a.id, a.title, a.content, a.cover_image_url, a.article_type, 
             a.style, a.structure, a.word_count, a.status, a.wechat_sync_status,
             a.wechat_article_id, a.wechat_sync_time, a.ai_model, a.generation_time_seconds,
             a.created_at, a.updated_at, a.published_at,
             u.username as author_username,
             ht.title as hot_topic_title
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN hot_topics ht ON a.hot_topic_id = ht.id
      ${whereClause}
      ORDER BY a.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const result = await query(selectQuery, params);
    
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
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch articles'
    });
  }
};

// Get article by ID
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT a.*, u.username as author_username,
             ht.title as hot_topic_title, ht.summary as hot_topic_summary
      FROM articles a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN hot_topics ht ON a.hot_topic_id = ht.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }
    
    // Get article images
    const imagesResult = await query(`
      SELECT * FROM article_images 
      WHERE article_id = $1 
      ORDER BY position_in_article
    `, [id]);
    
    const article = result.rows[0];
    article.images = imagesResult.rows;
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article'
    });
  }
};

// Create new article
const createArticle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      content,
      cover_image_url,
      article_type = 'educational',
      style = 'professional',
      structure = 'standard',
      hot_topic_id,
      additional_requirements
    } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }
    
    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    const result = await query(`
      INSERT INTO articles (
        user_id, title, content, cover_image_url, article_type, 
        style, structure, word_count, hot_topic_id, additional_requirements
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      userId, title, content, cover_image_url, article_type,
      style, structure, wordCount, hot_topic_id, 
      additional_requirements ? JSON.stringify(additional_requirements) : null
    ]);
    
    // Log article creation
    await query(`
      INSERT INTO user_article_history (user_id, article_id, action, metadata)
      VALUES ($1, $2, $3, $4)
    `, [userId, result.rows[0].id, 'created', JSON.stringify({ source: 'manual' })]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create article'
    });
  }
};

// Update article
const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      title,
      content,
      cover_image_url,
      article_type,
      style,
      structure,
      status
    } = req.body;
    
    // Check if article exists and belongs to user
    const checkResult = await query(`
      SELECT id FROM articles WHERE id = $1 AND user_id = $2
    `, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or unauthorized'
      });
    }
    
    // Calculate new word count if content is provided
    let wordCount;
    if (content) {
      wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    const result = await query(`
      UPDATE articles 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          cover_image_url = COALESCE($3, cover_image_url),
          article_type = COALESCE($4, article_type),
          style = COALESCE($5, style),
          structure = COALESCE($6, structure),
          word_count = COALESCE($7, word_count),
          status = COALESCE($8, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [title, content, cover_image_url, article_type, style, structure, wordCount, status, id, userId]);
    
    // Log article update
    await query(`
      INSERT INTO user_article_history (user_id, article_id, action, metadata)
      VALUES ($1, $2, $3, $4)
    `, [userId, id, 'updated', JSON.stringify({ fields_updated: Object.keys(req.body) })]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article'
    });
  }
};

// Delete article
const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if article exists and belongs to user
    const checkResult = await query(`
      SELECT id FROM articles WHERE id = $1 AND user_id = $2
    `, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article not found or unauthorized'
      });
    }
    
    await transaction(async (client) => {
      // Log article deletion
      await client.query(`
        INSERT INTO user_article_history (user_id, article_id, action, metadata)
        VALUES ($1, $2, $3, $4)
      `, [userId, id, 'deleted', JSON.stringify({ reason: 'user_action' })]);
      
      // Delete article (cascade will handle related records)
      await client.query('DELETE FROM articles WHERE id = $1', [id]);
    });
    
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete article'
    });
  }
};

// Get user's articles
const getUserArticles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    const countQuery = `SELECT COUNT(*) FROM articles ${whereClause}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const selectQuery = `
      SELECT a.*, ht.title as hot_topic_title
      FROM articles a
      LEFT JOIN hot_topics ht ON a.hot_topic_id = ht.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const result = await query(selectQuery, params);
    
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
    console.error('Error fetching user articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user articles'
    });
  }
};

const express = require('express');
const router = express.Router();

// Public routes (or protected based on your needs)
router.get('/', getArticles);
router.get('/:id', getArticleById);

// Protected routes
router.post('/', createArticle);
router.put('/:id', updateArticle);
router.delete('/:id', deleteArticle);
router.get('/user/my-articles', getUserArticles);

module.exports = router;