import { requireAdmin } from "../lib/auth.js";

export default function register(bot) {
  bot.command("admin", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply("Admin commands: /addfaq, /upload, /reindex, /review, /analytics");
  });
}
