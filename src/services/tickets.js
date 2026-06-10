import { cfg } from "../lib/config.js";
import { getDb } from "../lib/db.js";
import { logError, safeErr } from "../lib/log.js";

function makeTicketNumber() {
  return `DOC-${Date.now().toString().slice(-8)}`;
}

export async function createEscalationFromContext(ctx, reason) {
  const db = await getDb();
  const doc = {
    ticketNumber: makeTicketNumber(),
    userId: String(ctx.from?.id || ""),
    chatId: String(ctx.chat?.id || ""),
    conversationId: `${ctx.chat?.id || ""}:${ctx.from?.id || ""}`,
    reason: String(reason || "Needs human support").slice(0, 500),
    transcriptRefs: [],
    status: "open",
    assignee: "",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (db) {
    try {
      await db.collection("supporttickets").insertOne(doc);
    } catch (err) {
      logError("[db] supporttickets insertOne failed", { collection: "supporttickets", operation: "insertOne", error: safeErr(err) });
    }
  }

  if (cfg.SUPPORT_CHAT_ID) {
    try {
      await ctx.api.sendMessage(cfg.SUPPORT_CHAT_ID, `New escalation ${doc.ticketNumber}\nUser: ${doc.userId}\nReason: ${doc.reason}`);
    } catch (err) {
      console.warn("[telegram] escalation notify failed", { error: safeErr(err) });
    }
  }

  return doc;
}

export async function getLatestTicketStatus(userId, chatId) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.collection("supporttickets").findOne(
      { userId: String(userId || ""), chatId: String(chatId || ""), status: { $in: ["open", "pending", "in_progress"] } },
      { sort: { updatedAt: -1 } }
    );
  } catch (err) {
    logError("[db] supporttickets findOne failed", { collection: "supporttickets", operation: "findOne", error: safeErr(err) });
    return null;
  }
}
