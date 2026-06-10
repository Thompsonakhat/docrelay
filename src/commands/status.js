import { getLatestTicketStatus } from "../services/tickets.js";

export default function register(bot) {
  bot.command("status", async (ctx) => {
    const status = await getLatestTicketStatus(ctx.from?.id, ctx.chat?.id);
    if (!status) {
      await ctx.reply("You don't have an open support ticket right now.");
      return;
    }
    await ctx.reply(`Ticket ${status.ticketNumber} is currently ${status.status}. Reason: ${status.reason}`);
  });
}
