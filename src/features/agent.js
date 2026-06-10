import { handleSupportQuestion } from "../services/support.js";
import { acquireJobLock, releaseJobLock, isGroupEligible } from "../lib/runtime.js";

export function registerAgent(bot) {
  bot.on("message:text", async (ctx, next) => {
    const raw = ctx.message?.text || "";
    if (raw.startsWith("/")) return next();
    if (!(await isGroupEligible(ctx))) return next();

    const key = String(ctx.chat?.id || ctx.from?.id || "unknown");
    const lock = acquireJobLock(key);
    if (!lock.ok) {
      await ctx.reply(lock.message);
      return;
    }

    try {
      await handleSupportQuestion(ctx, raw, { source: "agent" });
    } finally {
      releaseJobLock(key);
    }
  });
}
