// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Authentication helper
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API helper functions
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// User Authentication API
const authAPI = {
  register: async (userData) => {
    return apiCall('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  login: async (credentials) => {
    const result = await apiCall('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (result.success && result.data.token) {
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('userData', JSON.stringify(result.data.user));
    }
    
    return result;
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  }
};

// Hot Topics API
const hotTopicsAPI = {
  getHotTopics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/hot-topics?${queryString}`);
  },
  
  getHotTopicById: async (id) => {
    return apiCall(`/hot-topics/${id}`);
  },
  
  getHotTopicsByCategory: async (category, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/hot-topics/category/${category}?${queryString}`);
  },
  
  getTrendingTopics: async () => {
    return apiCall('/hot-topics/trending');
  }
};

// Articles API
const articlesAPI = {
  getArticles: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/articles?${queryString}`);
  },
  
  getArticleById: async (id) => {
    return apiCall(`/articles/${id}`);
  },
  
  createArticle: async (articleData) => {
    return apiCall('/articles', {
      method: 'POST',
      body: JSON.stringify(articleData)
    });
  },
  
  updateArticle: async (id, articleData) => {
    return apiCall(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(articleData)
    });
  },
  
  deleteArticle: async (id) => {
    return apiCall(`/articles/${id}`, {
      method: 'DELETE'
    });
  },
  
  getUserArticles: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/articles/user/my-articles?${queryString}`);
  }
};

// AI Generation API
const aiAPI = {
  generateArticle: async (generationData) => {
    return apiCall('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(generationData)
    });
  },
  
  getGenerationHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/ai/history?${queryString}`);
  }
};

// WeChat Integration API
const wechatAPI = {
  syncToWeChat: async (articleId) => {
    return apiCall('/wechat/sync', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId })
    });
  },
  
  getSyncStatus: async (articleId) => {
    return apiCall(`/wechat/sync-status/${articleId}`);
  },
  
  getSyncLogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/wechat/sync-logs?${queryString}`);
  },
  
  getAccountInfo: async () => {
    return apiCall('/wechat/account-info');
  }
};

// UI Helper Functions
const uiHelpers = {
  showLoading: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
  },
  
  hideLoading: (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = '';
    }
  },
  
  showError: (message, elementId = 'error-message') => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    }
  },
  
  showSuccess: (message, elementId = 'success-message') => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
    }
  },
  
  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Export for use in other scripts
window.api = {
  auth: authAPI,
  hotTopics: hotTopicsAPI,
  articles: articlesAPI,
  ai: aiAPI,
  wechat: wechatAPI,
  ui: uiHelpers
};