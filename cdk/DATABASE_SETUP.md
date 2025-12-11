# Database Connection Setup

This CDK deployment uses external MongoDB and Redis connections instead of deploying DocumentDB and ElastiCache.

## Setup Instructions

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your connection strings:**
   ```bash
   # MongoDB (MongoDB Atlas free tier, or any MongoDB instance)
   MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster0.mongodb.net/tictactoe?retryWrites=true&w=majority

   # Redis (Upstash free tier, Redis Labs, or any Redis instance)
   REDIS_CONNECTION_STRING=redis://your-redis-host.upstash.io:6379
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   npm run bootstrap  # First time only
   npm run deploy
   ```

## Free Tier Options

### MongoDB
- **MongoDB Atlas**: 512MB free tier
  - Sign up at https://www.mongodb.com/cloud/atlas
  - Create a free cluster
  - Get connection string from "Connect" button

### Redis
- **Upstash**: Free Redis with 10,000 commands/day
  - Sign up at https://upstash.com/
  - Create a Redis database
  - Copy the connection string

- **Redis Labs**: 30MB free tier
  - Sign up at https://redis.com/try-free/
  - Create a free database
  - Get connection string

## Security Note

The `.env` file is gitignored to keep your credentials safe. Never commit it to git.
