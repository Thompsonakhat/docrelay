import { requireAdmin } from "../lib/auth.js";
import { addFaqEntry } from "../services/admin.js";

export default function register(bot) {
  bot.command("addfaq", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const raw = ctx.match?.trim?.() || "";
    const parts = raw.split("|");
    if (parts.length < 2) {
      await ctx.reply("Usage: /addfaq Question | Answer");
      return;
    }
    const question = parts[0].trim();
    const answer = parts.slice(1).join("|").trim();
    const faq = await addFaqEntry({ question, answer, userId: ctx.from?.id });
    await ctx.reply(`FAQ saved with id ${faq.id}.`);
  });
}
