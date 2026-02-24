# 🍽️ Nutrition Meal Plan Generation Server

AI-powered meal plan generation server using Google Gemini AI.

## 🎯 Features

- ✅ AI-powered meal plan generation using Google Gemini
- ✅ Automatic recipe creation with ingredients
- ✅ Nutritional information tracking
- ✅ RESTful API endpoints
- ✅ TypeScript for type safety
- ✅ PostgreSQL database with TypeORM
- ✅ Health check endpoints
- ✅ Background job processing (Image generation, Push notifications, Fridge expiry)
- ✅ Redis for caching/queueing

## 🏗️ Architecture

This server works in conjunction with the main `nutrition_backend` server:

1. **nutrition_backend** (Port 3000):
   - Generates Day 1 meal plan immediately
   - Returns response to client
   - Calls `nutrition_meal_plan_server` API for remaining days

2. **nutrition_meal_plan_server** (Port 4000):
   - Provides API endpoints for generating meal plans (days 2-7)
   - Generates NEW recipes using AI
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

# Worker - Enable background job processing (for images, notifications, etc.)
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

```bash
# Development
npm run dev

# Production
npm run build
npm start
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

### Generate Remaining Days
```bash
POST http://localhost:4000/api/meal-plan/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "days": 7
}
```
*Note: `userId` is extracted from the authentication token.*

### Server Status
```bash
GET http://localhost:4000/api/meal-plan/status
```

## 🛠️ Development

### Project Structure

```
src/
├── app.ts                      # Express app configuration
├── index.ts                    # Server entry point
├── config/
│   ├── database.ts            # TypeORM configuration
│   ├── db.config.ts           # Database connection config
│   ├── redis.connection.ts    # Redis connection
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
│   ├── imageUploadService.ts # Image upload handling
│   └── categoryService.ts     # Category management
├── workers/
│   ├── image.worker.ts        # Image processing worker
│   ├── recipe.image.worker.ts # Recipe image processing worker
│   ├── pushNotificationWorker.ts # Push notification worker
│   └── fridgeExpiry.worker.ts # Fridge expiry scanning worker
└── utils/
    ├── prompt.builder.ts      # AI prompt construction
    └── meal_plan_generator.util.ts # Meal plan generation helper
```

### Adding New Features

1. **Modify AI prompts:** Edit `utils/prompt.builder.ts`
2. **Add API endpoints:** Edit `routes/mealPlan.routes.ts`
3. **Modify generation logic:** Edit `services/mealPlanService.ts`

## 🔒 Security Notes

- Never commit `.env` file
- Keep API keys secure
- Use environment variables for all secrets
- Enable Redis password in production
- Use HTTPS in production

## 📝 Scripts

```bash
npm run dev       # Start in development mode with auto-reload
npm run build     # Build TypeScript to JavaScript
npm start         # Start production server
```

## 🙏 Acknowledgments

- Google Gemini AI for meal plan generation
- TypeORM for database management
- Redis for caching and queues
