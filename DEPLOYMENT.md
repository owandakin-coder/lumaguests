# Luma Guests - Deployment Guide

## Backend Deployment (Node.js + Express)

### Option 1: Render.com (Recommended)

1. **Create PostgreSQL database on Render**
   - Create a new PostgreSQL instance
   - Note the connection string

2. **Prepare backend for deployment**
   ```bash
   # Create Procfile in backend folder
   echo "web: npm start" > Procfile
   ```

3. **Deploy to Render**
   - Push code to GitHub
   - Create new Web Service on Render
   - Connect GitHub repository
   - Set environment variables:
     - `NODE_ENV=production`
     - `PORT=10000` (or whatever Render assigns)
     - `DATABASE_URL=your_postgres_connection_string`
   - Deploy

### Option 2: Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your_postgres_url

# Deploy
git push heroku main
```

### Option 3: DigitalOcean App Platform

1. Push code to GitHub
2. Create new App on DigitalOcean
3. Select GitHub repository
4. Configure:
   - Build command: `npm install && npx prisma migrate deploy`
   - Run command: `npm start`
5. Set environment variables
6. Deploy

## Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend folder
cd frontend
vercel

# During setup, configure:
# - Framework: Vite
# - Output directory: dist
# - Environment variables:
#   VITE_API_URL=https://your-backend-url.com/api
```

### Option 2: Netlify

1. Build frontend
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to Netlify
   - Connect GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variables:
     - `VITE_API_URL=https://your-backend-url.com/api`

### Option 3: AWS S3 + CloudFront

```bash
# Build frontend
cd frontend
npm run build

# Upload dist folder to S3
# Create CloudFront distribution
# Set CNAME to your domain
```

## Database Migration in Production

```bash
cd backend

# Run migrations on production database
DATABASE_URL=your_production_db_url npx prisma migrate deploy

# Or for initial setup
DATABASE_URL=your_production_db_url npx prisma migrate reset
```

## Environment Variables Checklist

### Backend (Production)
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000` (or your port)
- [ ] `DATABASE_URL=postgresql://...`

### Frontend (Production)
- [ ] `VITE_API_URL=https://your-backend-domain.com/api`

## Pre-Deployment Checklist

- [ ] Database backups configured
- [ ] Error logging set up
- [ ] CORS properly configured for production domain
- [ ] Environment variables are not hardcoded
- [ ] Database migrations tested locally
- [ ] Frontend build tested with `npm run build && npm run preview`
- [ ] API endpoints tested with production URLs
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured (if needed)

## Monitoring

### Backend
- Set up error tracking (Sentry, LogRocket)
- Monitor server logs
- Set up uptime monitoring
- Track API response times

### Frontend
- Monitor JavaScript errors
- Track performance metrics
- Set up Google Analytics (optional)

## Continuous Integration/Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm install && npm run build
      - run: cd frontend && npm install && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # Deploy backend
      - run: git push heroku main
      # Deploy frontend
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## Scaling Tips

1. **Database**
   - Set up connection pooling
   - Enable read replicas for high traffic
   - Regular backups

2. **Backend**
   - Use load balancer
   - Deploy multiple instances
   - Cache responses with Redis

3. **Frontend**
   - Use CDN
   - Enable compression
   - Optimize bundle size

## Rollback Procedure

```bash
# If deployment fails, revert to previous version
git revert <commit-hash>
git push

# Or deploy specific tag
git push origin <tag-name>
```

## Support

For deployment questions, consult platform-specific documentation or contact support.
