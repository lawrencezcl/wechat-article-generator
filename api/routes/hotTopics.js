const { query } = require('../db');

// Get all hot topics with pagination and filtering
const getHotTopics = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      sortBy = 'hotness_score', 
      order = 'DESC' 
    } = req.query;

    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (category) {
      whereClause = 'WHERE category = $1';
      params.push(category);
    }
    
    const allowedSortBy = ['hotness_score', 'created_at', 'title'];
    const sortField = allowedSortBy.includes(sortBy) ? sortBy : 'hotness_score';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const countQuery = `SELECT COUNT(*) FROM hot_topics ${whereClause}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const selectQuery = `
      SELECT id, title, summary, category, source, hotness_score, 
             trend_data, related_keywords, created_at, updated_at
      FROM hot_topics
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
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
    console.error('Error fetching hot topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hot topics'
    });
  }
};

// Get hot topic by ID
const getHotTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT id, title, summary, category, source, hotness_score, 
             trend_data, related_keywords, created_at, updated_at
      FROM hot_topics
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Hot topic not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching hot topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hot topic'
    });
  }
};

// Get hot topics by category
const getHotTopicsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT id, title, summary, category, source, hotness_score, 
             trend_data, related_keywords, created_at
      FROM hot_topics
      WHERE category = $1
      ORDER BY hotness_score DESC
      LIMIT $2
    `, [category, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching hot topics by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hot topics by category'
    });
  }
};

// Create new hot topic
const createHotTopic = async (req, res) => {
  try {
    const { title, summary, category, source, hotness_score, trend_data, related_keywords } = req.body;
    
    const result = await query(`
      INSERT INTO hot_topics (title, summary, category, source, hotness_score, trend_data, related_keywords)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, summary, category, source, hotness_score, JSON.stringify(trend_data), related_keywords]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating hot topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hot topic'
    });
  }
};

// Get trending topics (top hot topics)
const getTrendingTopics = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(`
      SELECT id, title, summary, category, source, hotness_score, 
             trend_data, related_keywords, created_at
      FROM hot_topics
      WHERE hotness_score > 80
      ORDER BY hotness_score DESC
      LIMIT $1
    `, [limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics'
    });
  }
};

const express = require('express');
const router = express.Router();

// Get all hot topics with pagination and filtering
router.get('/', getHotTopics);

// Get trending topics (top hot topics) - MUST come before /:id route
router.get('/trending', getTrendingTopics);

// Get hot topics by category
router.get('/category/:category', getHotTopicsByCategory);

// Get hot topic by ID
router.get('/:id', getHotTopicById);

// Create new hot topic
router.post('/', createHotTopic);

module.exports = router;