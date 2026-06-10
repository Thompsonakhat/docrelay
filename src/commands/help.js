export default function register(bot) {
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Public commands:\n/start\n/help\n/ask <question>\n/faq [keyword]\n/sources\n/escalate [reason]\n/status\n/feedback <rating> [comment]\n/reset\n/memory\n/forgetme\n\nAdmins: /admin, /addfaq, /upload, /reindex, /review, /analytics\n\nIn groups, I only answer when mentioned or when you reply to one of my messages."
    );
  });
}
