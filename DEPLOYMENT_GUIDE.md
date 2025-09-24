# WeChat Article Generator - Vercel Deployment Guide

## Project Overview
This is a WeChat official account article generation platform built with Node.js, Express, PostgreSQL, and vanilla JavaScript. The application integrates with OpenAI for article generation and provides WeChat synchronization capabilities.

## Prerequisites
- Node.js 16+ 
- PostgreSQL database (using Neon DB)
- Vercel account
- OpenAI API key
- WeChat developer account (optional)

## Local Development Setup

### 1. Clone and Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```bash
# Copy from example
cp .env.example .env

# Edit with your actual values
nano .env
```

Required environment variables:
```
DATABASE_URL=postgresql://neondb_owner:npg_w9QEDSlLkyT3@ep-jolly-hill-adhlaq48-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-super-secure-jwt-secret-key-here
OPENAI_API_KEY=your-openai-api-key
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
NODE_ENV=development
PORT=3000
```

### 3. Database Setup
```bash
# Connect to your PostgreSQL database and run the schema
psql $DATABASE_URL -f schema.sql
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Vercel Deployment

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
# Deploy with environment variables
vercel --env DATABASE_URL=$DATABASE_URL --env JWT_SECRET=$JWT_SECRET --env OPENAI_API_KEY=$OPENAI_API_KEY

# Or deploy and configure environment variables in Vercel dashboard
vercel
```

### 4. Configure Environment Variables in Vercel
After deployment, go to your Vercel dashboard:
1. Select your project
2. Go to "Settings" → "Environment Variables"
3. Add all required variables from your `.env` file

### 5. Database Connection Test
After deployment, test the database connection:
```bash
curl https://your-app.vercel.app/api/db-test
```

## API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### Hot Topics
- `GET /api/hot-topics` - Get hot topics with pagination
- `GET /api/hot-topics/:id` - Get specific hot topic
- `GET /api/hot-topics/category/:category` - Get topics by category
- `GET /api/hot-topics/trending` - Get trending topics

### Articles
- `GET /api/articles` - Get articles with pagination
- `GET /api/articles/:id` - Get specific article
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `GET /api/articles/user` - Get user's articles

### AI Generation
- `POST /api/ai/generate` - Generate article with AI
- `GET /api/ai/history` - Get AI generation history

### WeChat Integration
- `POST /api/wechat/sync` - Sync article to WeChat
- `GET /api/wechat/sync-status/:article_id` - Get sync status
- `GET /api/wechat/sync-logs` - Get sync logs

## Features Implemented

✅ **Frontend UI**
- Responsive design with Tailwind CSS
- Dashboard with statistics
- Hot topics browsing
- Article generation interface
- Rich text editor
- Mobile responsive

✅ **Backend API**
- Express.js server with CORS
- PostgreSQL database integration
- JWT authentication
- CRUD operations for articles and hot topics
- AI article generation with OpenAI
- WeChat integration endpoints

✅ **Database Schema**
- Users table with authentication
- Hot topics table with categories
- Articles table with content and metadata
- WeChat sync logs
- AI generation history
- User preferences

✅ **Vercel Deployment**
- Serverless function configuration
- Environment variables setup
- Static file serving
- API route handling

## Testing Checklist

### Local Testing
- [ ] Database connection works
- [ ] User registration and login
- [ ] Hot topics loading
- [ ] Article creation and editing
- [ ] AI article generation
- [ ] WeChat sync simulation

### Production Testing
- [ ] Vercel deployment successful
- [ ] Database connection in production
- [ ] API endpoints working
- [ ] Frontend loads correctly
- [ ] User authentication
- [ ] Article generation

## Troubleshooting

### Database Connection Issues
1. Verify DATABASE_URL format
2. Check SSL requirements for Neon DB
3. Ensure database is accessible from Vercel IPs

### API Issues
1. Check environment variables are set correctly
2. Verify JWT_SECRET is strong and unique
3. Check OpenAI API key validity

### Deployment Issues
1. Ensure all dependencies are in package.json
2. Check vercel.json configuration
3. Verify file paths in server.js

## Security Considerations
- Keep JWT_SECRET secure and unique
- Never expose database credentials in client code
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Validate all user inputs
- Use parameterized queries to prevent SQL injection

## Next Steps
1. Add comprehensive error handling
2. Implement user roles and permissions
3. Add article templates and presets
4. Enhance WeChat integration with real API
5. Add analytics and reporting
6. Implement article scheduling
7. Add multi-language support
8. Enhance mobile experience