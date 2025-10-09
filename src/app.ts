import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mealPlanRoutes from "./routes/mealPlan.routes";

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:19006',
    'http://localhost:3000',
    'http://localhost:8081',
    'exp://localhost:19000',
    /^https?:\/\/.*\.expo\.dev$/,
    /^https?:\/\/.*\.ngrok\.io$/,
    /^https?:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Meal Plan Server is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/meal-plan', mealPlanRoutes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.statusCode || 500;
  res.status(status).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default app;
