export const GENERATION_CONFIG = {
  maxPlansToScan: Number(process.env.HISTORY_MAX_PLANS || "10"),
  maxItemsPerPlan: Number(process.env.HISTORY_MAX_ITEMS_PER_PLAN || "5"),
  maxRecentRecipes: Number(process.env.HISTORY_MAX_RECENT_RECIPES || "20"),
  dayDelayMs: Number(process.env.GENERATE_DAY_DELAY_MS || "1000"),
} as const;

