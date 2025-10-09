# 🚀 Quick Start Guide

## Bước 1: Cài đặt dependencies

```bash
cd nutrition_meal_plan_server
npm install
```

## Bước 2: Tạo file .env

```bash
cp .env.example .env
```

Sửa file `.env` với thông tin của bạn:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=12112004
DB_NAME=nutritiondb
GEMINI_API_KEY=your_api_key_here
```

## Bước 3: Lấy Gemini API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Tạo API key
3. Copy vào `.env`

## Bước 4: Chạy server

```bash
npm run dev
```

Server chạy tại: http://localhost:3001

## Bước 5: Test API

### Test health check
```bash
curl http://localhost:3001/health
```

### Test with authentication

1. **Login vào nutrition_backend để lấy token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@example.com","password":"your_password"}'
```

2. **Copy access token và generate meal plan:**
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
→ Chạy `npm install`

### "Database connection failed"
→ Kiểm tra PostgreSQL đang chạy và credentials trong `.env`

### "Unauthorized"
→ Token hết hạn hoặc không hợp lệ, login lại để lấy token mới

### "Failed to generate meal plan from AI"
→ Kiểm tra GEMINI_API_KEY trong `.env`

## 🎉 Done!

Server đã sẵn sàng gen meal plan!
