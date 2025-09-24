// Frontend API Integration Script
// This script replaces mock data with real API calls

document.addEventListener('DOMContentLoaded', function() {
  // Check authentication status
  checkAuthStatus();
  
  // Initialize hot topics (public data)
  loadHotTopics();
  
  // Setup event listeners
  setupEventListeners();
});

// Authentication functions
function checkAuthStatus() {
  const isAuthenticated = window.api.auth.isAuthenticated();
  const userData = window.api.auth.getCurrentUser();
  
  if (!isAuthenticated) {
    // Redirect to login or show login modal
    showLoginModal();
  } else {
    updateUserUI(userData);
  }
}

function showLoginModal() {
  // Create login modal if it doesn't exist
  if (!document.getElementById('loginModal')) {
    const modalHTML = `
      <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 class="text-2xl font-bold mb-6 text-center">登录热点文助手</h2>
          <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">用户名或邮箱</label>
              <input type="text" id="loginUsername" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" id="loginPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required>
            </div>
            <div id="loginError" class="text-red-600 text-sm hidden"></div>
            <button type="submit" class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors">
              登录
            </button>
          </form>
          <div class="mt-4 text-center">
            <p class="text-sm text-gray-600">还没有账号？ <a href="#register" class="text-primary hover:underline">立即注册</a></p>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submission handler
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorElement = document.getElementById('loginError');
  
  try {
    const result = await window.api.auth.login({ username, password });
    
    if (result.success) {
      // Hide modal and update UI
      document.getElementById('loginModal').style.display = 'none';
      updateUserUI(result.data.user);
      // Load dashboard data after successful login
      loadDashboardData();
    } else {
      errorElement.textContent = result.error || '登录失败，请重试';
      errorElement.classList.remove('hidden');
    }
  } catch (error) {
    errorElement.textContent = '网络错误，请检查连接';
    errorElement.classList.remove('hidden');
  }
}

function updateUserUI(userData) {
  const userMenuBtn = document.querySelector('#userMenuBtn span');
  if (userMenuBtn && userData) {
    userMenuBtn.textContent = userData.username || '用户';
  }
}

// Dashboard data loading
async function loadDashboardData() {
  try {
    // Load user articles statistics
    const articlesResult = await window.api.articles.getUserArticles({ limit: 10 });
    if (articlesResult.success) {
      updateDashboardStats(articlesResult.data);
    }
    
    // Load WeChat sync status
    const syncLogsResult = await window.api.wechat.getSyncLogs({ limit: 5 });
    if (syncLogsResult.success) {
      updateSyncStatus(syncLogsResult.data);
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

function updateDashboardStats(articles) {
  // Update the stats cards with real data
  const thisWeekArticles = articles.filter(article => {
    const articleDate = new Date(article.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return articleDate >= weekAgo;
  }).length;
  
  const syncedArticles = articles.filter(article => article.wechat_sync_status === 'synced').length;
  
  // Update the dashboard cards
  const statsElements = document.querySelectorAll('#dashboard .text-3xl');
  if (statsElements[0]) statsElements[0].textContent = thisWeekArticles;
  if (statsElements[1]) statsElements[1].textContent = syncedArticles;
}

function updateSyncStatus(syncLogs) {
  // Update sync status in the dashboard
  const recentSyncs = syncLogs.filter(log => log.sync_status === 'success').length;
  const syncElements = document.querySelectorAll('#dashboard .text-3xl');
  if (syncElements[1]) syncElements[1].textContent = recentSyncs;
}

// Hot topics loading
async function loadHotTopics() {
  try {
    window.api.ui.showLoading('hotTopicsContainer');
    
    const result = await window.api.hotTopics.getHotTopics({ limit: 12 });
    
    if (result.success) {
      renderHotTopics(result.data);
    } else {
      window.api.ui.showError('Failed to load hot topics');
    }
  } catch (error) {
    console.error('Failed to load hot topics:', error);
    window.api.ui.showError('Failed to load hot topics');
  } finally {
    window.api.ui.hideLoading('hotTopicsContainer');
  }
}

function renderHotTopics(topics) {
  const container = document.getElementById('hotTopicsContainer');
  if (!container) return;
  
  container.innerHTML = topics.map(topic => `
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer" data-topic-id="${topic.id}">
      <div class="flex justify-between items-start mb-3">
        <span class="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">${topic.category}</span>
        <span class="text-xs text-gray-500">热度: ${topic.hotness_score}</span>
      </div>
      <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2">${topic.title}</h3>
      <p class="text-gray-600 text-sm mb-4 line-clamp-3">${topic.summary}</p>
      <div class="flex justify-between items-center">
        <span class="text-xs text-gray-500">${window.api.ui.formatDate(topic.created_at)}</span>
        <button class="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition-colors" onclick="generateArticleFromTopic(${topic.id})">
          生成文章
        </button>
      </div>
    </div>
  `).join('');
}

// Article generation
async function generateArticleFromTopic(topicId) {
  try {
    // Get topic details
    const topicResult = await window.api.hotTopics.getHotTopicById(topicId);
    
    if (!topicResult.success) {
      window.api.ui.showError('Failed to load topic details');
      return;
    }
    
    const topic = topicResult.data;
    
    // Navigate to article generator section
    showSection('article-generator');
    
    // Pre-fill the article generator with topic data
    document.getElementById('articleTitle').value = topic.title;
    document.getElementById('articleContent').value = topic.summary;
    
  } catch (error) {
    console.error('Failed to generate article from topic:', error);
    window.api.ui.showError('Failed to generate article');
  }
}

// Event listeners setup
function setupEventListeners() {
  // Article generation form
  const generateForm = document.getElementById('generateArticleForm');
  if (generateForm) {
    generateForm.addEventListener('submit', handleArticleGeneration);
  }
  
  // Save article button
  const saveButton = document.getElementById('saveArticle');
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveArticle);
  }
  
  // Sync to WeChat button
  const syncButton = document.getElementById('syncToWeChat');
  if (syncButton) {
    syncButton.addEventListener('click', handleSyncToWeChat);
  }
}

async function handleArticleGeneration(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const generationData = {
    topic: formData.get('topic') || document.getElementById('articleTitle').value,
    article_type: formData.get('article_type') || 'news',
    style: formData.get('style') || 'professional',
    structure: formData.get('structure') || 'standard',
    word_count: parseInt(formData.get('word_count')) || 1000,
    additional_requirements: formData.get('additional_requirements') || ''
  };
  
  try {
    // Show loading state
    const generateButton = e.target.querySelector('button[type="submit"]');
    generateButton.disabled = true;
    generateButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>生成中...';
    
    // Start progress simulation
    simulateGenerationProgress();
    
    const result = await window.api.ai.generateArticle(generationData);
    
    if (result.success) {
      // Display generated article
      displayGeneratedArticle(result.data);
      window.api.ui.showSuccess('Article generated successfully');
    } else {
      window.api.ui.showError(result.error || 'Failed to generate article');
    }
    
  } catch (error) {
    console.error('Article generation failed:', error);
    window.api.ui.showError('Article generation failed');
  } finally {
    // Reset button state
    const generateButton = e.target.querySelector('button[type="submit"]');
    generateButton.disabled = false;
    generateButton.innerHTML = '<i class="fa fa-magic mr-2"></i>生成文章';
  }
}

function simulateGenerationProgress() {
  const progressBar = document.getElementById('generationProgress');
  const progressText = document.getElementById('generationStatus');
  
  if (!progressBar || !progressText) return;
  
  let progress = 0;
  const steps = [
    { progress: 20, text: '正在分析热点话题...' },
    { progress: 40, text: '正在生成文章大纲...' },
    { progress: 60, text: '正在撰写文章内容...' },
    { progress: 80, text: '正在优化文章结构...' },
    { progress: 100, text: '文章生成完成！' }
  ];
  
  steps.forEach((step, index) => {
    setTimeout(() => {
      progressBar.style.width = step.progress + '%';
      progressText.textContent = step.text;
      
      if (step.progress === 100) {
        setTimeout(() => {
          progressBar.style.width = '0%';
          progressText.textContent = '准备生成文章...';
        }, 2000);
      }
    }, index * 1000);
  });
}

function displayGeneratedArticle(article) {
  // Display the generated article in the editor
  const editor = document.getElementById('articleEditor');
  if (editor) {
    editor.innerHTML = article.content;
  }
  
  // Update article metadata
  const titleElement = document.getElementById('articleTitle');
  if (titleElement) {
    titleElement.value = article.title;
  }
}

async function handleSaveArticle() {
  try {
    const articleData = {
      title: document.getElementById('articleTitle').value,
      content: document.getElementById('articleEditor').innerHTML,
      word_count: document.getElementById('articleEditor').innerText.length,
      tags: ['generated', 'ai'],
      status: 'draft'
    };
    
    const result = await window.api.articles.createArticle(articleData);
    
    if (result.success) {
      window.api.ui.showSuccess('Article saved successfully');
      // Store article ID for later operations
      window.currentArticleId = result.data.id;
    } else {
      window.api.ui.showError(result.error || 'Failed to save article');
    }
    
  } catch (error) {
    console.error('Save article failed:', error);
    window.api.ui.showError('Failed to save article');
  }
}

async function handleSyncToWeChat() {
  if (!window.currentArticleId) {
    window.api.ui.showError('Please save the article first');
    return;
  }
  
  try {
    const result = await window.api.wechat.syncToWeChat(window.currentArticleId);
    
    if (result.success) {
      window.api.ui.showSuccess('Article synced to WeChat successfully');
    } else {
      window.api.ui.showError(result.error || 'Failed to sync to WeChat');
    }
    
  } catch (error) {
    console.error('WeChat sync failed:', error);
    window.api.ui.showError('Failed to sync to WeChat');
  }
}

// Navigation helper
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('main > section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
  }
}

// Export functions for global use
window.loadDashboardData = loadDashboardData;
window.loadHotTopics = loadHotTopics;
window.generateArticleFromTopic = generateArticleFromTopic;