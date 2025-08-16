import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { cleanup } from "~encore/clients";

// Daily cleanup job at 3 AM
const dailyCleanup = new CronJob("daily-cleanup", {
  title: "Daily Data Cleanup",
  schedule: "0 3 * * *", // 3 AM every day
  endpoint: runDailyCleanup,
});

// Runs daily cleanup of old data
export const runDailyCleanup = api<void, void>(
  { expose: false, method: "POST", path: "/cleanup/daily" },
  async () => {
    try {
      const result = await cleanup.purgeOldData({ dryRun: false });
      
      console.log("Daily cleanup completed:", {
        deletedSubmissions: result.deletedSubmissions,
        deletedDocChunks: result.deletedDocChunks,
        deletedScriptChunks: result.deletedScriptChunks,
      });
    } catch (error) {
      console.error("Daily cleanup failed:", error);
      throw error;
    }
  }
);
