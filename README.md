# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
cd nutrition_meal_plan_server
npm install
```

## Step 2: Create .env File

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=12112004
DB_NAME=nutritiondb
GEMINI_API_KEY=your_api_key_here
```

## Step 3: Get Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Create an API key
3. Copy it into `.env`

## Step 4: Start Server

```bash
npm run dev
```

Server runs at: http://localhost:3001

## Step 5: Test API

### Test health check
```bash
curl http://localhost:3001/health
```

### Test with authentication

1. **Login to nutrition_backend to get token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@example.com","password":"your_password"}'
```

2. **Copy access token and generate meal plan:**
```bash
curl -X POST http://localhost:3001/api/meal-plan/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## 🎯 Expected Response

```json
{
  "status": "success",
  "message": "Meal plan generated successfully",
  "data": {
    "mealPlanId": "f7c3e4d5-...",
    "message": "Meal plan generated successfully",
    "details": {
      "start_date": "2025-10-06",
      "end_date": "2025-10-12",
      "total_days": 7,
      "total_recipes": 21
    }
  }
}
```

## ⚠️ Troubleshooting

### "Cannot find module" errors
→ Run `npm install`

### "Database connection failed"
→ Check that PostgreSQL is running and credentials in `.env` are correct

### "Unauthorized"
→ Token expired or invalid, login again to get a new token

### "Failed to generate meal plan from AI"
→ Check GEMINI_API_KEY in `.env`

## 🎉 Done!

Server is ready to generate meal plans!
