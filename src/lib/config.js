const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  MONGODB_URI: process.env.MONGODB_URI || "",
  COOKMYBOTS_AI_ENDPOINT: process.env.COOKMYBOTS_AI_ENDPOINT || "",
  COOKMYBOTS_AI_KEY: process.env.COOKMYBOTS_AI_KEY || "",
  AI_TIMEOUT_MS: toNumber(process.env.AI_TIMEOUT_MS, 600000),
  AI_MAX_RETRIES: toNumber(process.env.AI_MAX_RETRIES, 2),
  CONCURRENCY: toNumber(process.env.CONCURRENCY, 20),
  CONFIDENCE_THRESHOLD: Number(process.env.CONFIDENCE_THRESHOLD || 0.55),
  MAX_CONTEXT_TURNS: toNumber(process.env.MAX_CONTEXT_TURNS, 12),
  MEMORY_LOG_INTERVAL_MS: toNumber(process.env.MEMORY_LOG_INTERVAL_MS, 60000),
  DOCS_STORAGE_DIR: process.env.DOCS_STORAGE_DIR || "./data/docs",
  ADMIN_USER_IDS: String(process.env.ADMIN_USER_IDS || "").split(",").map((v) => v.trim()).filter(Boolean),
  SUPPORT_CHAT_ID: process.env.SUPPORT_CHAT_ID || "",
};
