import { findFaqs } from "../services/retrieval.js";

export default function register(bot) {
  bot.command("faq", async (ctx) => {
    const keyword = ctx.match?.trim?.() || "";
    const rows = await findFaqs(keyword, 5);
    if (!rows.length) {
      await ctx.reply(keyword ? "I couldn't find FAQs matching that keyword yet." : "No FAQs are available yet.");
      return;
    }

    const text = rows.map((row, index) => `${index + 1}. ${row.question}\n${row.answer}`).join("\n\n");
    await ctx.reply(text.slice(0, 3900));
  });
}
