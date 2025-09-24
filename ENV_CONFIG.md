# Environment Variables Configuration

This file contains all the environment variables required for the WeChat Article Generator application.

## Required Variables

### Database Configuration
```bash
DATABASE_URL=postgresql://neondb_owner:npg_w9QEDSlLkyT3@ep-jolly-hill-adhlaq48-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### JWT Configuration
```bash
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

### WeChat API Configuration
```bash
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

### OpenAI Configuration
```bash
OPENAI_API_KEY=your-openai-api-key
```

## Optional Variables

### Application Settings
```bash
NODE_ENV=development
PORT=3000
```

### Redis Configuration (Optional)
```bash
REDIS_URL=redis://localhost:6379
```

### Rate Limiting (Optional)
```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### CORS Configuration (Optional)
```bash
CORS_ORIGIN=http://localhost:3000
```

## Vercel Deployment Instructions

1. Copy this file to `.env.local` for local development
2. Add the following environment variables to your Vercel project:
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Click on "Environment Variables"
   - Add each variable with its corresponding value

3. For production deployment, ensure all required variables are set in Vercel

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique values for `JWT_SECRET`
- Keep your `OPENAI_API_KEY` secure and never expose it in client-side code
- Rotate API keys regularly
- Use environment-specific configurations for different deployment stages