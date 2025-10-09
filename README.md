# Nutrition Meal Plan Server

Server chuyên biệt sinh meal plan với **RECIPES MỚI** được tạo bởi AI (Google Gemini) cho hệ thống Nutrition App.

## 🎯 Tính năng

- ✅ **Tạo Recipes MỚI bằng AI**: KHÔNG chỉ chọn từ recipes có sẵn mà TẠO MỚI hoàn toàn
- ✅ **Gen Linh Hoạt**: Có thể gen 1-7 ngày tùy theo yêu cầu
- ✅ **Chi Tiết Đầy Đủ**: Mỗi recipe có ingredients, instructions, nutritional_info
- ✅ **Tránh Trùng Lặp**: AI check recipe history để không tạo món đã ăn
- ✅ **AI Integration**: Google Gemini 2.0 Flash (giống nutrition_backend)
- ✅ **Authentication**: Bảo vệ API bằng JWT middleware
- ✅ **Database Sharing**: Dùng chung PostgreSQL với nutrition_backend
- ✅ **TypeScript + TypeORM**: Full type safety

## 📋 Yêu cầu

- Node.js >= 16.x
- PostgreSQL >= 13.x (database đã được setup bởi nutrition_backend)
- Redis >= 6.x (optional - cho Bull Queue)
- Google Gemini API Key

## 🚀 Cài đặt

### 1. Clone và cài đặt dependencies

```bash
cd nutrition_meal_plan_server
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Cập nhật các biến môi trường trong file `.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database (cùng database với nutrition_backend)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=nutritiondb

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Lấy Gemini API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Tạo API key mới
3. Copy và paste vào file `.env`

## 🎮 Sử dụng

### Development Mode

```bash
# Chạy server với hot reload
npm run dev
```

Server sẽ chạy tại: `http://localhost:3001`

### Production Mode

```bash
# Build TypeScript
npm run build

# Chạy production server
npm start
```

### Chạy Worker (Optional - cho background jobs)

```bash
# Terminal riêng cho worker
npm run worker
```

## 📡 API Endpoints

### Health Check & Status
```http
GET /api/meal-plan/status
```

Kiểm tra trạng thái server và tính năng.

**Response:**
```json
{
  "server": "Meal Plan Server",
  "version": "1.0.0",
  "purpose": "Generates meal plans with NEW AI-created recipes",
  "features": [
    "Creates NEW recipes (not selecting from existing)",
    "Flexible days generation (1-7 days)",
    "Avoids recipe duplicates from history",
    "Full ingredient and nutrition details"
  ],
  "status": "operational"
}
```

### Generate Meal Plan (Flexible Days)
```http
POST /api/meal-plan/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "days": 6  // Optional: 1-7 days, default = 6
}
```

Tạo meal plan với số ngày linh hoạt. AI sẽ tạo **RECIPES MỚI** hoàn toàn.

**Response:**
```json
{
  "message": "6 days generated successfully with NEW recipes",
  "data": {
    "mealPlanId": "uuid",
    "weekStartDate": "2025-10-06",
    "weekEndDate": "2025-10-12",
    "daysGenerated": 6,
    "message": "6 days generated successfully"
  }
}
```

### Generate For Specific Week
```http
POST /api/meal-plan/generate-week
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "weekStartDate": "2025-10-13",  // Required: YYYY-MM-DD
  "days": 7  // Optional: 1-7 days, default = 6
}
```

Tạo meal plan cho tuần cụ thể với số ngày tùy chỉnh.
      "total_days": 7,
      "total_recipes": 21
    }
  }
}
```

## 🔐 Authentication

Server sử dụng JWT authentication giống nutrition_backend:

1. User login qua nutrition_backend → nhận JWT token
2. Gửi request đến meal_plan_server với header:
   ```
   Authorization: Bearer <jwt_token>
   ```
3. Server verify token bằng public key trong database

## 🗄️ Database

Server **SHARE** cùng database với nutrition_backend:

- `users` - User accounts
- `user_profiles` - User health profiles
- `recipes` - Recipe catalog
- `ingredients` - Ingredient database
- `meal_plans` - Generated meal plans
- `meal_plan_items` - Individual meals in plans
- `recipe_ingredients` - Recipe-ingredient relationships
- `key_tokens` - JWT public/private keys

## 🏗️ Kiến trúc

```
nutrition_meal_plan_server/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── index.ts                  # Server entry point
│   ├── config/
│   │   └── database.ts           # TypeORM configuration
│   ├── controllers/
│   │   └── mealPlan.controller.ts # Meal plan endpoints
│   ├── core/
│   │   ├── error.response.ts     # Error handling
│   │   └── success.response.ts   # Success responses
│   ├── middlewares/
│   │   └── auth.middleware.ts    # JWT authentication
│   ├── models/                   # TypeORM entities (copied from backend)
│   │   ├── user.model.ts
│   │   ├── meal_plan.model.ts
│   │   ├── recipe.model.ts
│   │   └── ...
│   ├── routes/
│   │   └── mealPlan.routes.ts    # API routes
│   ├── services/
│   │   ├── llmService.ts         # Google Gemini integration
│   │   └── mealPlanService.ts    # Meal plan generation logic
│   ├── utils/
│   │   └── auth.util.ts          # JWT utilities
│   └── workers/
│       └── mealPlanWorker.ts     # Bull Queue worker
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Scripts

```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "worker": "ts-node-dev --respawn --transpile-only src/workers/mealPlanWorker.ts"
}
```

## 🧪 Testing với Postman/cURL

### 1. Lấy JWT Token từ nutrition_backend

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### 2. Generate Meal Plan

```bash
curl -X POST http://localhost:3001/api/meal-plan/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 📝 Workflow

1. **User Request**: Client gọi API với JWT token
2. **Authentication**: Middleware verify token
3. **Profile Loading**: Load user profile và preferences
4. **Recipe Fetching**: Lấy available recipes từ DB
5. **AI Generation**: Call Gemini API với prompt
6. **Parse & Validate**: Parse JSON response từ AI
7. **Database Save**: Lưu meal plan, recipes, ingredients vào DB
8. **Response**: Trả về meal plan ID và details

## ⚠️ Lưu ý

- Server này **KHÔNG** tự tạo database schema. Database phải được setup bởi `nutrition_backend` trước
- Cần Redis nếu muốn sử dụng Bull Queue worker
- Gemini API có rate limit - cân nhắc khi gen nhiều meal plan

## 🐛 Troubleshooting

### Database connection failed
- Kiểm tra PostgreSQL đang chạy
- Verify credentials trong `.env`
- Đảm bảo database `nutritiondb` đã tồn tại

### Authentication failed
- Kiểm tra JWT token còn hạn
- Verify `key_tokens` table có public key của user

### AI generation failed
- Kiểm tra API key
- Verify API key còn hạn và có credit
- Check network/firewall

## 👥 Contributors

Nutrition App Team
