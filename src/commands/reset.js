import { clearUserMemory, clearUserProfileMemory } from "../lib/memory.js";

export default function register(bot) {
  bot.command("reset", async (ctx) => {
    await clearUserMemory({ userId: ctx.from?.id, chatId: ctx.chat?.id, platform: "telegram" });
    await clearUserProfileMemory(ctx.from?.id);
    await ctx.reply("Your conversation memory has been cleared.");
  });
}
