import { handleSupportQuestion } from "../services/support.js";

export default function register(bot) {
  bot.command("ask", async (ctx) => {
    const text = ctx.match?.trim?.() || "";
    if (!text) {
      await ctx.reply("Please add your support question after /ask.");
      return;
    }
    await handleSupportQuestion(ctx, text, { source: "command" });
  });
}
