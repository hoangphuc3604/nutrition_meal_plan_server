import app from "./app";
import Database from "./config/database";
import * as dotenv from "dotenv";
import { initWorkers, closeWorkers } from "./workers/index";

dotenv.config();

const PORT = process.env.PORT || 3001;
const ENABLE_WORKER = process.env.ENABLE_WORKER === "true";

const startServer = async () => {
  try {
    // Initialize database
    await Database.init();
    console.log("[SUCCESS] - Database connected successfully");

    // Start BullMQ Worker if enabled
    if (ENABLE_WORKER) {
      console.log("[INFO] - Starting BullMQ Worker...");
      await initWorkers();
      console.log("[SUCCESS] - BullMQ Worker started successfully");
    } else {
      console.log("[INFO] - Worker disabled (ENABLE_WORKER=false)");
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║       Meal Plan Generation Server             ║
║      Server is running on port ${PORT}           ║
║     http://localhost:${PORT}                     ║
║     Health: http://localhost:${PORT}/health      ║
║     API: http://localhost:${PORT}/api/meal-plan  ║
║     Worker: ${ENABLE_WORKER ? "✅ ENABLED" : "❌ DISABLED"}                    ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("[ERROR] - Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[INFO] - SIGTERM received, shutting down gracefully");
  await closeWorkers();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[INFO] - SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer();
