import { requireAdmin } from "../lib/auth.js";
import { getReviewQueue } from "../services/admin.js";

export default function register(bot) {
  bot.command("review", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const items = await getReviewQueue();
    if (!items.length) {
      await ctx.reply("Review queue is empty.");
      return;
    }
    const text = items.map((item, index) => `${index + 1}. ${item.reason}\nQ: ${item.text}`).join("\n\n");
    await ctx.reply(text.slice(0, 3900));
  });
}
