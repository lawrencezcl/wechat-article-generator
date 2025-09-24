const { query } = require('../db');
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key'
});

// Generate article using AI
const generateArticle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      topic,
      article_type = 'educational',
      style = 'professional',
      structure = 'standard',
      word_count = 1000,
      additional_requirements,
      ai_model = 'gpt-3.5-turbo'
    } = req.body;
    
    // Validate input
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required for article generation'
      });
    }
    
    // Check user's daily article limit
    const limitCheck = await query(`
      SELECT COUNT(*) as articles_today
      FROM articles
      WHERE user_id = $1 AND created_at >= CURRENT_DATE
    `, [userId]);
    
    const userLimit = await query(`
      SELECT daily_article_limit FROM users WHERE id = $1
    `, [userId]);
    
    const articlesToday = parseInt(limitCheck.rows[0].articles_today);
    const dailyLimit = userLimit.rows[0].daily_article_limit;
    
    if (articlesToday >= dailyLimit) {
      return res.status(429).json({
        success: false,
        error: `Daily article limit reached (${dailyLimit} articles per day)`
      });
    }
    
    const startTime = Date.now();
    
    // Create prompt based on requirements
    let prompt = `Write a ${article_type} article about "${topic}" in a ${style} style. `;
    
    // Add structure requirements
    switch (structure) {
      case 'listicle':
        prompt += 'Use a list format with clear headings and bullet points. ';
        break;
      case 'how_to':
        prompt += 'Use a step-by-step format with clear instructions. ';
        break;
      case 'news':
        prompt += 'Use a news article format with an engaging headline and informative content. ';
        break;
      default:
        prompt += 'Use a standard article format with introduction, body, and conclusion. ';
    }
    
    prompt += `Target approximately ${word_count} words. `;
    
    // Add additional requirements
    if (additional_requirements) {
      if (additional_requirements.include_data) {
        prompt += 'Include relevant data and statistics to support the content. ';
      }
      if (additional_requirements.include_interaction) {
        prompt += 'Include engaging questions or calls-to-action for reader interaction. ';
      }
      if (additional_requirements.tone) {
        prompt += `Maintain a ${additional_requirements.tone} tone throughout. `;
      }
    }
    
    prompt += 'Make the content engaging, informative, and suitable for a WeChat audience. Ensure the content is original and well-structured.';
    
    // Log AI generation attempt
    const logResult = await query(`
      INSERT INTO ai_generation_logs (user_id, prompt, model_used, success)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [userId, prompt, ai_model, false]);
    
    const logId = logResult.rows[0].id;
    
    try {
      // Generate article using OpenAI
      const completion = await openai.chat.completions.create({
        model: ai_model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional content writer specializing in creating engaging articles for social media platforms like WeChat. Create original, informative, and engaging content that follows the specified requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.min(word_count * 2, 4000), // Rough estimate: 2 tokens per word
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });
      
      const generatedContent = completion.choices[0].message.content;
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const tokensUsed = completion.usage.total_tokens;
      
      // Calculate actual word count
      const actualWordCount = generatedContent.split(/\s+/).filter(word => word.length > 0).length;
      
      // Update AI generation log
      await query(`
        UPDATE ai_generation_logs 
        SET response = $1, tokens_used = $2, generation_time_seconds = $3, success = $4
        WHERE id = $5
      `, [generatedContent, tokensUsed, generationTime, true, logId]);
      
      // Create article in database
      const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : `Article about ${topic}`;
      
      const articleResult = await query(`
        INSERT INTO articles (
          user_id, title, content, article_type, style, structure, 
          word_count, ai_model, generation_time_seconds, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        userId, title, generatedContent, article_type, style, 
        structure, actualWordCount, ai_model, generationTime, 'draft'
      ]);
      
      // Update AI log with article ID
      await query(`
        UPDATE ai_generation_logs 
        SET article_id = $1 
        WHERE id = $2
      `, [articleResult.rows[0].id, logId]);
      
      // Log article creation
      await query(`
        INSERT INTO user_article_history (user_id, article_id, action, metadata)
        VALUES ($1, $2, $3, $4)
      `, [
        userId, 
        articleResult.rows[0].id, 
        'created', 
        JSON.stringify({ source: 'ai_generation', model: ai_model })
      ]);
      
      res.json({
        success: true,
        data: {
          article: articleResult.rows[0],
          generation_info: {
            model_used: ai_model,
            tokens_used: tokensUsed,
            generation_time_seconds: generationTime,
            actual_word_count: actualWordCount
          }
        }
      });
      
    } catch (aiError) {
      // Update AI generation log with error
      await query(`
        UPDATE ai_generation_logs 
        SET error_message = $1 
        WHERE id = $2
      `, [aiError.message, logId]);
      
      throw aiError;
    }
    
  } catch (error) {
    console.error('Error generating article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate article',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get AI generation history
const getGenerationHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const countResult = await query(`
      SELECT COUNT(*) FROM ai_generation_logs WHERE user_id = $1
    `, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const result = await query(`
      SELECT l.id, l.article_id, l.model_used, l.tokens_used, 
             l.generation_time_seconds, l.success, l.created_at,
             a.title as article_title
      FROM ai_generation_logs l
      LEFT JOIN articles a ON l.article_id = a.id
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
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
    console.error('Error fetching generation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generation history'
    });
  }
};

const express = require('express');
const router = express.Router();

// Protected routes
router.post('/generate', generateArticle);
router.get('/history', getGenerationHistory);

module.exports = router;