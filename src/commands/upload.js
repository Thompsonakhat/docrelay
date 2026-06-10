import { requireAdmin } from "../lib/auth.js";
import { handleUploadCommand } from "../services/admin.js";

export default function register(bot) {
  bot.command("upload", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply("Send a text document as your next message, or upload a .txt file with a caption. I'll store and index it.");
  });

  bot.on("message:document", async (ctx, next) => {
    if (!(await requireAdmin(ctx, { silent: true }))) return next();
    const caption = ctx.message.caption || "";
    if (!caption.toLowerCase().includes("upload") && !ctx.message.document?.file_name?.toLowerCase?.().endsWith?.(".txt")) {
      return next();
    }
    await handleUploadCommand(ctx);
  });
}
