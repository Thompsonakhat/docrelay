import { requireAdmin } from "../lib/auth.js";
import { getAnalyticsSummary } from "../services/analytics.js";

export default function register(bot) {
  bot.command("analytics", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const stats = await getAnalyticsSummary();
    await ctx.reply(
      `Support analytics:\nQuestions: ${stats.questions}\nAnswers: ${stats.answers}\nLow confidence: ${stats.lowConfidence}\nEscalations: ${stats.escalations}\nFeedback count: ${stats.feedback}\nAvg rating: ${stats.avgRating}`
    );
  });
}
