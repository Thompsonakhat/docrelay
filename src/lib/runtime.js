import { cfg } from "./config.js";

const perChatLocks = new Set();
let globalInflight = 0;
let lastMemoryLogAt = 0;

function memoryLog() {
  const now = Date.now();
  if (now - lastMemoryLogAt < cfg.MEMORY_LOG_INTERVAL_MS) return;
  lastMemoryLogAt = now;
  const m = process.memoryUsage();
  console.log("[mem]", { rssMB: Math.round(m.rss / 1e6), heapUsedMB: Math.round(m.heapUsed / 1e6) });
}

export function acquireJobLock(key) {
  memoryLog();
  if (perChatLocks.has(key)) {
    return { ok: false, message: "I'm working on your last request. Please wait a moment." };
  }
  if (globalInflight >= 2) {
    return { ok: false, message: "Busy right now. Please try again in a moment." };
  }
  perChatLocks.add(key);
  globalInflight += 1;
  return { ok: true };
}

export function releaseJobLock(key) {
  perChatLocks.delete(key);
  globalInflight = Math.max(0, globalInflight - 1);
}

export async function isGroupEligible(ctx) {
  const chatType = ctx.chat?.type || "private";
  if (chatType === "private") return true;

  const raw = ctx.message?.text || "";
  const botUsername = ctx.me?.username || ctx.botInfo?.username || "";
  const replyTo = ctx.message?.reply_to_message;
  const isReplyToBot = !!replyTo?.from?.is_bot && String(replyTo?.from?.username || "").toLowerCase() === String(botUsername).toLowerCase();
  const entities = Array.isArray(ctx.message?.entities) ? ctx.message.entities : [];
  const isMentioned = !!botUsername && entities.some((entity) => {
    if (entity.type !== "mention") return false;
    const text = raw.slice(entity.offset, entity.offset + entity.length);
    return text.toLowerCase() === `@${String(botUsername).toLowerCase()}`;
  });
  return isMentioned || isReplyToBot;
}

export function stripBotMention(ctx, text) {
  const botUsername = ctx.me?.username || ctx.botInfo?.username || "";
  if (!botUsername) return String(text || "").trim();
  const pattern = new RegExp(`@${botUsername}\\b`, "ig");
  return String(text || "").replace(pattern, "").trim();
}
