import { getUserProfileMemory } from "../lib/memory.js";

export default function register(bot) {
  bot.command("memory", async (ctx) => {
    const memory = await getUserProfileMemory(ctx.from?.id);
    await ctx.reply(memory || "I don't have any saved profile memory for you yet.");
  });
}
