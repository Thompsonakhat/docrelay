import "dotenv/config";

function safeErr(err) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || String(err);
}

process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection", { error: safeErr(err) });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException", { error: safeErr(err) });
  process.exit(1);
});

async function boot() {
  console.log("[boot] start");
  try {
    const [{ cfg }, { createBot }, { registerCommands }, { registerAgent }, { run }, { connectDb }] = await Promise.all([
      import("./lib/config.js"),
      import("./bot.js"),
      import("./commands/loader.js"),
      import("./features/agent.js"),
      import("@grammyjs/runner"),
      import("./lib/db.js"),
    ]);

    console.log("[boot] config", {
      TELEGRAM_BOT_TOKEN_set: !!cfg.TELEGRAM_BOT_TOKEN,
      MONGODB_URI_set: !!cfg.MONGODB_URI,
      COOKMYBOTS_AI_ENDPOINT_set: !!cfg.COOKMYBOTS_AI_ENDPOINT,
      COOKMYBOTS_AI_KEY_set: !!cfg.COOKMYBOTS_AI_KEY,
      ADMIN_USER_IDS_count: cfg.ADMIN_USER_IDS.length,
      SUPPORT_CHAT_ID_set: !!cfg.SUPPORT_CHAT_ID,
    });

    if (!cfg.TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is required. Add it in your environment and redeploy.");
      process.exit(1);
    }

    try {
      await connectDb();
    } catch (err) {
      console.error("[db] boot connect failed", { error: safeErr(err) });
    }

    const bot = createBot(cfg.TELEGRAM_BOT_TOKEN);
    await registerCommands(bot);
    registerAgent(bot);

    bot.catch((err) => {
      console.error("[telegram] bot.catch", { error: safeErr(err) });
    });

    try {
      await bot.init();
    } catch (err) {
      console.warn("[boot] bot.init failed", { error: safeErr(err) });
    }

    try {
      await bot.api.setMyCommands([
        { command: "start", description: "Welcome and quick usage" },
        { command: "help", description: "Show commands and support scope" },
        { command: "ask", description: "Ask a support question" },
        { command: "faq", description: "Browse FAQs" },
        { command: "sources", description: "Show sources from the last answer" },
        { command: "escalate", description: "Escalate to human support" },
        { command: "feedback", description: "Rate the last answer" },
        { command: "status", description: "Check ticket status" },
        { command: "reset", description: "Clear chat memory" },
        { command: "memory", description: "Show remembered profile summary" },
        { command: "forgetme", description: "Clear remembered profile" },
        { command: "admin", description: "Admin controls" },
        { command: "addfaq", description: "Admin: add FAQ" },
        { command: "upload", description: "Admin: upload support doc" },
        { command: "reindex", description: "Admin: rebuild retrieval index" },
        { command: "review", description: "Admin: review low-confidence questions" },
        { command: "analytics", description: "Admin: view support analytics" }
      ]);
    } catch (err) {
      console.warn("[boot] setMyCommands failed", { error: safeErr(err) });
    }

    let runner = null;
    let restartLock = false;
    let backoffMs = 2000;

    async function startPollingLoop() {
      if (restartLock) return;
      restartLock = true;

      while (true) {
        try {
          console.log("[poll] starting");
          await bot.api.deleteWebhook({ drop_pending_updates: true });
          console.log("[poll] webhook cleared");

          runner = run(bot, {
            runner: {
              fetch: {
                allowed_updates: ["message", "callback_query"]
              }
            },
            sink: {
              concurrency: 1
            }
          });

          console.log("[poll] started", { concurrency: 1 });
          restartLock = false;
          return;
        } catch (err) {
          const message = safeErr(err);
          console.error("[poll] start failed", { error: message, backoffMs });
          if (!String(message).includes("409")) {
            console.warn("[poll] retrying after transient failure");
          }
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          backoffMs = Math.min(backoffMs === 2000 ? 5000 : backoffMs * 2, 20000);
          if (runner?.isRunning?.()) {
            try {
              runner.stop();
            } catch {}
          }
          runner = null;
        }
      }
    }

    process.once("SIGINT", async () => {
      console.log("[boot] SIGINT received");
      try {
        runner?.stop?.();
      } catch {}
      process.exit(0);
    });

    process.once("SIGTERM", async () => {
      console.log("[boot] SIGTERM received");
      try {
        runner?.stop?.();
      } catch {}
      process.exit(0);
    });

    await startPollingLoop();
    console.log("[boot] complete");
  } catch (err) {
    console.error("[boot] failed", { error: safeErr(err) });
    process.exit(1);
  }
}

boot();
