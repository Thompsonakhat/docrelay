import { requireAdmin } from "../lib/auth.js";
import { rebuildRetrievalIndex } from "../services/admin.js";

export default function register(bot) {
  bot.command("reindex", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const result = await rebuildRetrievalIndex(ctx.from?.id);
    await ctx.reply(`Reindex finished. FAQs: ${result.faqs}. Documents: ${result.documents}. Chunks: ${result.chunks}.`);
  });
}
