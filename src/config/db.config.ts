import "dotenv/config";

const dev = {
    app: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    },
    db: {
        url: process.env.DEV_DB_URL,
        host: process.env.DEV_DB_HOST || "localhost",
        user: process.env.DEV_DB_USER || "postgres",
        port: process.env.DEV_DB_PORT ? parseInt(process.env.DEV_DB_PORT) : 5432,
        password: process.env.DEV_DB_PASSWORD || "",
        database: process.env.DEV_DB_NAME || "nutritiondb",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    }
};

const prod = {
    app: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    },
    db: {
        url: process.env.PROD_DB_URL,
        host: process.env.PROD_DB_HOST || "localhost",
        user: process.env.PROD_DB_USER || "postgres",
        port: process.env.PROD_DB_PORT ? parseInt(process.env.PROD_DB_PORT) : 5432,
        password: process.env.PROD_DB_PASSWORD || "",
        database: process.env.PROD_DB_NAME || "nutritiondb",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    }
};

const isProduction = 
  process.env.NODE_ENV === "production" || 
  process.env.NODE_ENV === "prod" ||
  process.env.RENDER === "true" ||
  !!process.env.PROD_DB_URL ||
  !!process.env.PROD_DB_HOST;

type EnvConfig = typeof dev;
export const config: EnvConfig = isProduction ? prod : dev;

if (isProduction) {
  console.log("[INFO] - Using PRODUCTION database configuration");
  if (!prod.db.url && !prod.db.host) {
    console.error("[ERROR] - PROD_DB_URL or PROD_DB_HOST must be set in production!");
  }
} else {
  console.log("[INFO] - Using DEVELOPMENT database configuration");
}