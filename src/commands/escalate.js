import { createEscalationFromContext } from "../services/tickets.js";

export default function register(bot) {
  bot.command("escalate", async (ctx) => {
    const reason = ctx.match?.trim?.() || "User requested human support";
    const ticket = await createEscalationFromContext(ctx, reason);
    await ctx.reply(`I've escalated this to human support. Ticket: ${ticket.ticketNumber}. Status: ${ticket.status}.`);
  });
}
