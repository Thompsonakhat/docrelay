import { cfg } from "./config.js";

export async function requireAdmin(ctx, opts = {}) {
  const userId = String(ctx.from?.id || "");
  const allowed = cfg.ADMIN_USER_IDS.includes(userId);
  if (!allowed && !opts.silent) {
    await ctx.reply("This command is admin-only.");
  }
  return allowed;
}
