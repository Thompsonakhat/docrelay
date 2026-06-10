import { getLastAnswerSources } from "../services/support.js";

export default function register(bot) {
  bot.command("sources", async (ctx) => {
    const result = await getLastAnswerSources(ctx.from?.id, ctx.chat?.id);
    if (!result.length) {
      await ctx.reply("I don't have source details for your last answer yet.");
      return;
    }

    const text = result.map((item, index) => `${index + 1}. ${item.title}\n${item.snippet}`).join("\n\n");
    await ctx.reply(text.slice(0, 3900));
  });
}
