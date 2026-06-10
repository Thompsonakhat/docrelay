import { saveFeedbackForLastAnswer } from "../services/support.js";

export default function register(bot) {
  bot.command("feedback", async (ctx) => {
    const raw = ctx.match?.trim?.() || "";
    if (!raw) {
      await ctx.reply("Please send a rating like /feedback helpful or /feedback bad Missing billing details.");
      return;
    }

    const [rating, ...rest] = raw.split(/\s+/);
    const comment = rest.join(" ").trim();
    const ok = await saveFeedbackForLastAnswer(ctx.from?.id, ctx.chat?.id, rating, comment);
    await ctx.reply(ok ? "Thanks. Your feedback was saved." : "I couldn't find a recent answer to attach that feedback to.");
  });
}
