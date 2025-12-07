import { fridgeScanQueue } from "../config/message.config";

const DEFAULT_CRON = process.env.FRIDGE_SCAN_CRON || "0 9 * * *";
const DEFAULT_DAYS = parseInt(process.env.FRIDGE_EXPIRY_DAYS_BEFORE || "1", 10);
const DEFAULT_TZ = process.env.FRIDGE_SCAN_TZ || "UTC";

export const initCronJobs = async () => {
  await fridgeScanQueue.add(
    "fridge_expiry_scan",
    { daysBefore: DEFAULT_DAYS },
    {
      repeat: {
        pattern: DEFAULT_CRON,
        tz: DEFAULT_TZ,
      },
      jobId: "fridge_expiry_scan_daily",
    }
  );

  console.log(
    `[CRON] Scheduled fridge expiry scan (cron=${DEFAULT_CRON}, daysBefore=${DEFAULT_DAYS}, tz=${DEFAULT_TZ})`
  );
};


