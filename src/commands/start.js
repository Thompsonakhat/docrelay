export default function register(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Welcome to DocRelay. I answer support questions using approved FAQs and support documents.\n\nUse /ask followed by your question, or just send a message in a private chat. Use /help to see everything I can do."
    );
  });
}
