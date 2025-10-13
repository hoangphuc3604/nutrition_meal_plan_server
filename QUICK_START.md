# 🚀 Quick Start - Meal Plan Server with Queue

## ⚡ TL;DR - For Impatient Developers

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your settings

# 3. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 4. Run server with worker
npm run dev
```

Done! Worker is now listening for jobs from `nutrition_backend`.

---

## 📋 Step-by-Step Guide

### Step 1: Install Dependencies

```bash
cd nutrition_meal_plan_server
npm install
```

### Step 2: Setup Environment

Copy example file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# ✅ REQUIRED: Google Gemini API Key
API_KEY_GENERATE=your_google_gemini_api_key_here

# ✅ REQUIRED: Enable worker to process queue jobs
ENABLE_WORKER=true

# ✅ REQUIRED: Redis connection (must match nutrition_backend)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ✅ REQUIRED: Database connection (must match nutrition_backend)
DEV_DB_HOST=localhost
DEV_DB_USER=postgres
DEV_DB_PORT=5432
DEV_DB_PASSWORD=your_password
DEV_DB_NAME=nutritiondb

# Optional: Server port
PORT=4000
NODE_ENV=dev
```

**Get Gemini API Key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste into `.env`

### Step 3: Start Redis Server

Choose one method:

**Option A - Docker (Recommended):**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Option B - Windows:**
```bash
# Download from: https://github.com/microsoftarchive/redis/releases
redis-server.exe
```

**Option C - Linux/Mac:**
```bash
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### Step 4: Start Meal Plan Server

```bash
npm run dev
```

**Expected output:**
```
[SUCCESS] - Database connected successfully
[INFO] - Starting BullMQ Worker...
[SUCCESS] - Worker: Database connected
[INFO] - Meal Plan Worker is ready to process jobs from queue: generate_week
[INFO] - Redis connection: localhost:6379
[SUCCESS] - BullMQ Worker started successfully

╔═══════════════════════════════════════════════╗
║       Meal Plan Generation Server             ║
║      Server is running on port 4000           ║
║     http://localhost:4000                     ║
║     Health: http://localhost:4000/health      ║
║     API: http://localhost:4000/api/meal-plan  ║
║     Worker: ✅ ENABLED                        ║
╚═══════════════════════════════════════════════╝
```

### Step 5: Test the System

#### A. Test Health Check

```bash
curl http://localhost:4000/health
```

Expected:
```json
{
  "status": "ok",
  "message": "Meal Plan Server is running",
  "timestamp": "2025-10-13T10:30:00.000Z"
}
```

#### B. Test Full Queue Flow

1. **Start nutrition_backend** (in another terminal):
```bash
cd ../nutrition_backend
npm run dev
```

2. **Login to get token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

3. **Generate meal plan** (triggers queue):
```bash
curl -X POST http://localhost:3000/api/v1/private/generate/personalized \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-10-13",
    "days": 7
  }'
```

4. **Watch logs** in meal plan server terminal:
```
[QUEUE] - Enqueued background job for user xxx, 6 remaining days
[WORKER] - Processing job xxx
[INFO] - Generating 6 days for user: xxx
[SUCCESS] - Day 2025-10-14 saved: 3 items
[SUCCESS] - Day 2025-10-15 saved: 3 items
...
[SUCCESS] - Meal plan generation complete
[INFO] - Successful: 6/6 days
```

## ✅ Verification Checklist

Use this to verify your setup:

- [ ] Node.js >= 18 installed (`node --version`)
- [ ] Redis running (`redis-cli ping` returns "PONG")
- [ ] PostgreSQL running and accessible
- [ ] `.env` file exists with all required variables
- [ ] `ENABLE_WORKER=true` in `.env`
- [ ] Redis config matches between backend and meal plan server
- [ ] Database config matches between backend and meal plan server
- [ ] `npm install` completed without errors
- [ ] Server starts with "✅ ENABLED" for Worker
- [ ] Health endpoint returns 200 OK
- [ ] Worker logs show "ready to process jobs"

## 🔍 Monitoring Queue Activity

### Check Queue Status

```bash
# Check waiting jobs
redis-cli LLEN bull:generate_week:wait

# Check active jobs
redis-cli LLEN bull:generate_week:active

# Check completed jobs
redis-cli LLEN bull:generate_week:completed

# Check failed jobs
redis-cli LLEN bull:generate_week:failed
```

### View Queue Details

```bash
# Get all queue keys
redis-cli KEYS "bull:generate_week:*"

# Monitor all Redis activity
redis-cli MONITOR
```

## 🐛 Common Issues

### ❌ Worker Not Starting

**Symptoms:** No worker logs, jobs not processed

**Solution:**
```bash
# Check .env
cat .env | grep ENABLE_WORKER
# Should show: ENABLE_WORKER=true

# If false, change to true and restart
```

### ❌ Redis Connection Failed

**Symptoms:** `Error: connect ECONNREFUSED`

**Solutions:**
```bash
# 1. Check Redis is running
redis-cli ping

# 2. Check Redis host/port in .env
cat .env | grep REDIS
# Should match your Redis configuration

# 3. Restart Redis
docker restart redis
# or
redis-server
```

### ❌ Queue Name Mismatch

**Symptoms:** Jobs enqueued but never processed

**Solution:**
```bash
# Backend should use: "generate_week"
# Check: nutrition_backend/src/queues/mealQueue.ts
grep 'new Queue' nutrition_backend/src/queues/mealQueue.ts

# Worker should listen to: "generate_week"  
# Check: src/workers/mealPlanWorker.ts
grep 'new Worker' src/workers/mealPlanWorker.ts

# Both must match exactly (case-sensitive)
```

### ❌ Database Connection Error

**Symptoms:** `Error: connect ECONNREFUSED` for database

**Solutions:**
```bash
# 1. Check PostgreSQL is running
psql -h localhost -U postgres -c "SELECT 1"

# 2. Verify database exists
psql -h localhost -U postgres -l | grep nutritiondb

# 3. Check credentials in .env match database
```

### ❌ AI API Errors

**Symptoms:** `Failed to generate meal plan`, `429 Too Many Requests`

**Solutions:**
```bash
# 1. Verify API key in .env
cat .env | grep API_KEY_GENERATE

# 2. Check API key is valid at:
# https://makersuite.google.com/app/apikey

# 3. Reduce worker concurrency in mealPlanWorker.ts:
# { concurrency: 1 }
```

## 🔄 Restarting the System

```bash
# Stop server (Ctrl+C in terminal)

# Restart server
npm run dev

# Or restart with worker only
npm run worker
```

## 📊 Understanding the Logs

```bash
[QUEUE]   - Queue operations from nutrition_backend
[WORKER]  - Worker operations (picking up jobs)
[INFO]    - General information
[SUCCESS] - Successful operations
[ERROR]   - Errors that need attention
```

## 🎯 What Happens When You Generate a Meal Plan

1. **Client → Backend** (Port 3000)
   - `POST /api/v1/private/generate/personalized`
   - Backend generates Day 1 immediately
   - Backend returns response to client (fast!)
   - Backend enqueues job for Days 2-7

2. **Backend → Redis Queue**
   - Job added to `bull:generate_week:wait`
   - Job contains: userId, startDate, numDays

3. **Worker Picks Up Job** (Port 4000)
   - Worker detects new job in queue
   - Starts processing Days 2-7
   - Logs: `[WORKER] - Processing job xxx`

4. **Worker Generates Days**
   - Calls Google Gemini AI for each day
   - Creates recipes with ingredients
   - Saves to database
   - Logs progress for each day

5. **Job Completes**
   - Worker marks job as completed
   - Job moved to completed list
   - Logs: `[SUCCESS] - Meal plan generation complete`

## 🎉 Success!

If you see these logs, everything is working:

```
✅ Database connected
✅ Worker ready and listening
✅ Server is running on port 4000
✅ Worker: ENABLED
```

You're ready to process meal plan generation jobs in the background! 🚀

---

**Next Steps:**
- Read [README.md](./README.md) for full documentation
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Check logs regularly to monitor job processing
