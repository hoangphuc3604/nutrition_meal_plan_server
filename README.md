# 🍽️ Nutrition Meal Plan Generation Server

AI-powered meal plan generation server using Google Gemini AI and BullMQ queue system.

## 🎯 Features

- ✅ AI-powered meal plan generation using Google Gemini
- ✅ Background job processing with BullMQ and Redis
- ✅ Queue-based architecture for scalability
- ✅ Automatic recipe creation with ingredients
- ✅ Nutritional information tracking
- ✅ RESTful API endpoints
- ✅ TypeScript for type safety
- ✅ PostgreSQL database with TypeORM
- ✅ Health check endpoints

## 🏗️ Architecture

This server works in conjunction with the main `nutrition_backend` server:

1. **nutrition_backend** (Port 3000):
   - Generates Day 1 meal plan immediately
   - Returns response to client
   - Enqueues remaining days to Redis queue

2. **nutrition_meal_plan_server** (Port 4000):
   - Provides manual API endpoints (optional)
   - **BullMQ Worker** picks up queued jobs
   - Generates remaining meal plan days (2-7)
   - Saves to shared PostgreSQL database

## 📋 Prerequisites

- Node.js >= 18.x
- Redis server
- PostgreSQL database
- Google Gemini API key

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# AI Service - Get from https://makersuite.google.com/app/apikey
API_KEY_GENERATE=your_google_gemini_api_key

# Server
NODE_ENV=dev
PORT=4000

# Worker - Enable background job processing
ENABLE_WORKER=true

# Redis - Must match nutrition_backend
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database - Same as nutrition_backend
DEV_DB_HOST=localhost
DEV_DB_USER=your_user
DEV_DB_PORT=5432
DEV_DB_PASSWORD=your_password
DEV_DB_NAME=nutritiondb
```

### 3. Start Redis

**Windows:**
```bash
# Download Redis from: https://github.com/microsoftarchive/redis/releases
redis-server
```

**Linux/Mac:**
```bash
redis-server
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Run the Server

#### Option A: Combined (API + Worker)
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

#### Option B: Separate Processes (Recommended)

**Terminal 1 - API Server:**
```bash
# Set ENABLE_WORKER=false in .env
npm run dev
```

**Terminal 2 - Worker Only:**
```bash
npm run worker
```

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:4000/health
```

Response:
```json
{
  "status": "ok",
  "message": "Meal Plan Server is running",
  "timestamp": "2025-10-13T10:30:00.000Z"
}
```

### Manual Meal Plan Generation (Optional)
```bash
POST http://localhost:4000/api/meal-plan/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-id",
  "startDate": "2025-10-13",
  "days": 7
}
```

## 🔄 Queue System

### How It Works

1. **Client Request** to `nutrition_backend`:
   ```
   POST /api/v1/private/generate/personalized
   {
     "startDate": "2025-10-13",
     "days": 7
   }
   ```

2. **Backend Response** (Immediate):
   - Generates Day 1 meal plan
   - Returns to client
   - Enqueues job for days 2-7

3. **Worker Processing** (Background):
   - Picks up job from Redis queue
   - Generates remaining 6 days
   - Saves to database
   - Logs progress

### Queue Configuration

**Queue Name:** `generate_week`

**Job Data:**
```typescript
{
  userId: string;
  startDate: string;      // YYYY-MM-DD
  numDays: number;        // Usually 6
  initialMealPlan: {
    id: string;
    startDate: string;
    endDate: string;
  }
}
```

**Job Options:**
- Attempts: 3 with exponential backoff
- Concurrency: 2 workers simultaneously
- Rate limit: 5 jobs per 60 seconds
- Retention: 24 hours for completed, 7 days for failed

### Check Worker Status

```bash
# View logs
npm run dev
# Look for: "✅ Worker ready and listening"
```

### Monitor Queue

#### Redis CLI:
```bash
# Check waiting jobs
redis-cli LLEN bull:generate_week:wait

# Check active jobs
redis-cli LLEN bull:generate_week:active

# Check failed jobs
redis-cli LLEN bull:generate_week:failed
```

#### Bull Board (Web UI):
```bash
npm install -g @bull-board/cli
bull-board
# Visit: http://localhost:3000
```

## 🛠️ Development

### Project Structure

```
src/
├── app.ts                      # Express app configuration
├── index.ts                    # Server entry point
├── config/
│   ├── database.ts            # TypeORM configuration
│   └── db.config.ts           # Database connection config
├── controllers/
│   └── mealPlan.controller.ts # API controllers
├── models/                     # TypeORM entities
│   ├── user.model.ts
│   ├── user_profile.model.ts
│   ├── meal_plan.model.ts
│   ├── meal_plan_item.model.ts
│   ├── recipe.model.ts
│   ├── ingredient.model.ts
│   └── ...
├── services/
│   ├── mealPlanService.ts     # Meal plan generation logic
│   ├── llmService.ts          # Google Gemini integration
│   ├── ingredientService.ts   # Ingredient management
│   └── categoryService.ts     # Category management
├── workers/
│   └── mealPlanWorker.ts      # BullMQ worker
└── utils/
    ├── prompt.builder.ts      # AI prompt construction
    └── auth.util.ts           # Authentication utilities
```

### Adding New Features

1. **Modify AI prompts:** Edit `utils/prompt.builder.ts`
2. **Change worker behavior:** Edit `workers/mealPlanWorker.ts`
3. **Add API endpoints:** Edit `routes/mealPlan.routes.ts`
4. **Modify generation logic:** Edit `services/mealPlanService.ts`

## 🔧 Troubleshooting

### Worker Not Processing Jobs

**Problem:** Jobs are enqueued but not processed

**Solutions:**

1. **Check worker is enabled:**
   ```env
   ENABLE_WORKER=true
   ```

2. **Check Redis connection:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Check queue name matches:**
   - Backend: `mealQueue = new Queue("generate_week")`
   - Worker: `new Worker("generate_week")`

4. **Check logs for errors:**
   ```bash
   npm run dev
   # Look for [WORKER] or [ERROR] messages
   ```

5. **Verify Redis configuration matches between servers:**
   ```env
   # Both nutrition_backend and nutrition_meal_plan_server
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Database Connection Failed

1. **Check database is running:**
   ```bash
   psql -h localhost -U your_user -d nutritiondb
   ```

2. **Verify credentials in `.env`**

3. **Check network connectivity:**
   ```bash
   nc -zv localhost 5432
   ```

### AI Rate Limiting

If you see "429 Too Many Requests":

1. **Reduce worker concurrency:**
   ```typescript
   // In mealPlanWorker.ts
   { concurrency: 1 }
   ```

2. **Increase rate limit duration:**
   ```typescript
   limiter: {
     max: 3,
     duration: 60000
   }
   ```

## 🔒 Security Notes

- Never commit `.env` file
- Keep API keys secure
- Use environment variables for all secrets
- Enable Redis password in production
- Use HTTPS in production
- Implement rate limiting on API endpoints

## 📝 Scripts

```bash
npm run dev       # Start in development mode with auto-reload
npm run build     # Build TypeScript to JavaScript
npm start         # Start production server
npm run worker    # Start worker only (separate process)
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Google Gemini AI for meal plan generation
- BullMQ for robust queue system
- TypeORM for database management
