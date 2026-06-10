import { cfg } from "../lib/config.js";
import { aiChat } from "../lib/ai.js";
import { addTurn, getRecentTurns, getUserProfileMemory, updateUserProfileMemory } from "../lib/memory.js";
import { getDb } from "../lib/db.js";
import { stripBotMention } from "../lib/runtime.js";
import { logError, safeErr } from "../lib/log.js";
import { retrieveSupportSources } from "./retrieval.js";
import { createEscalationFromContext } from "./tickets.js";

const lastAnswerCache = new Map();
const MAX_CACHE = 5000;

function setBounded(map, key, value) {
  if (map.size >= MAX_CACHE && !map.has(key)) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
  map.set(key, value);
}

function answerKey(userId, chatId) {
  return `${String(userId || "")}:${String(chatId || "")}`;
}

function normalizeConfidence(raw, sources) {
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed));
  if (!sources.length) return 0;
  return Math.min(0.8, 0.35 + (sources.length * 0.1));
}

function parseStructuredAnswer(text, sources) {
  const clean = String(text || "").trim();
  if (!clean) {
    return { answer: "I couldn't produce a grounded answer just now.", confidence: 0, needsEscalation: true };
  }

  try {
    const parsed = JSON.parse(clean);
    return {
      answer: String(parsed.answer || clean).trim(),
      confidence: normalizeConfidence(parsed.confidence, sources),
      needsEscalation: !!parsed.needsEscalation,
      followUp: String(parsed.followUp || "").trim()
    };
  } catch {
    return {
      answer: clean,
      confidence: normalizeConfidence(null, sources),
      needsEscalation: !sources.length,
      followUp: ""
    };
  }
}

async function getOrCreateConversation(db, userId, chatId) {
  const filter = { userId: String(userId || ""), chatId: String(chatId || "") };
  const existing = await db.collection("conversations").findOne(filter);
  if (existing) return existing;

  const doc = {
    userId: String(userId || ""),
    chatId: String(chatId || ""),
    status: "open",
    tags: [],
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection("conversations").insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

async function saveMessage(db, message) {
  const payload = { ...message };
  delete payload._id;
  delete payload.createdAt;
  await db.collection("messages").updateOne(
    { messageId: payload.messageId },
    {
      $setOnInsert: { createdAt: new Date() },
      $set: { ...payload, updatedAt: new Date() }
    },
    { upsert: true }
  );
}

async function maybeUpdateProfileMemory(userId, userText, answerText) {
  const nextSummary = `Recent support topics: ${String(userText || "").slice(0, 180)} | Last answer summary: ${String(answerText || "").slice(0, 180)}`;
  await updateUserProfileMemory(userId, nextSummary);
}

export async function handleSupportQuestion(ctx, incomingText, meta = {}) {
  const rawText = stripBotMention(ctx, incomingText);
  const text = rawText.slice(0, 3000).trim();
  if (!text) {
    await ctx.reply("Please send your support question.");
    return;
  }

  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const db = await getDb();
  const memoryTurns = await getRecentTurns({ userId, chatId, platform: "telegram", limit: cfg.MAX_CONTEXT_TURNS });
  const profileMemory = await getUserProfileMemory(userId);
  const sources = await retrieveSupportSources(text, 4);

  await addTurn({ userId, chatId, platform: "telegram", role: "user", text });

  const sourceContext = sources.map((source, index) => `${index + 1}. ${source.title}\n${source.snippet}`).join("\n\n");
  const historyContext = memoryTurns.slice(-cfg.MAX_CONTEXT_TURNS).map((turn) => `${turn.role}: ${turn.text}`).join("\n");

  const prompt = [
    "Answer the user's support question using only the provided support sources.",
    "If the sources are weak or missing, say so clearly and suggest escalation.",
    "Return plain JSON with keys: answer, confidence, needsEscalation, followUp.",
    `User memory (may be empty): ${profileMemory || ""}`,
    `Recent conversation:\n${historyContext || "none"}`,
    `Support sources:\n${sourceContext || "none"}`,
    `Question: ${text}`
  ].join("\n\n");

  const ai = await aiChat([{ role: "user", content: prompt }], { feature: "support_answer", source: meta.source || "agent" });
  const parsed = parseStructuredAnswer(ai.content, sources);
  const lowConfidence = parsed.confidence < cfg.CONFIDENCE_THRESHOLD || !sources.length || parsed.needsEscalation;

  let finalText = parsed.answer;
  if (sources.length) {
    finalText += `\n\nSources:\n${sources.map((source, index) => `${index + 1}. ${source.title}`).join("\n")}`;
  }
  if (parsed.followUp) {
    finalText += `\n\nNext step: ${parsed.followUp}`;
  }
  if (lowConfidence) {
    finalText += "\n\nIf you'd like, use /escalate and I'll open a human support ticket.";
  }

  const cacheKey = answerKey(userId, chatId);
  setBounded(lastAnswerCache, cacheKey, sources);

  if (db) {
    try {
      const conversation = await getOrCreateConversation(db, userId, chatId);
      const now = new Date();

      await saveMessage(db, {
        messageId: `${conversation._id}:user:${now.getTime()}`,
        conversationId: String(conversation._id),
        userId: String(userId || ""),
        sender: "user",
        text,
        intent: "support_question",
        promptText: text
      });

      await saveMessage(db, {
        messageId: `${conversation._id}:assistant:${now.getTime() + 1}`,
        conversationId: String(conversation._id),
        userId: String(userId || ""),
        sender: "assistant",
        text: finalText,
        intent: "support_answer",
        answerQuality: lowConfidence ? "low_confidence" : "grounded",
        sourceRefs: sources,
        promptText: text
      });

      await db.collection("conversations").updateOne(
        { _id: conversation._id },
        {
          $set: { lastMessageAt: new Date(), updatedAt: new Date() }
        }
      );

      await db.collection("users").updateOne(
        { telegramId: String(userId || "") },
        {
          $setOnInsert: { telegramId: String(userId || "") },
          $set: {
            profile: {
              username: ctx.from?.username || "",
              firstName: ctx.from?.first_name || "",
              lastName: ctx.from?.last_name || ""
            },
            language: ctx.from?.language_code || "",
            roles: [],
            lastSeen: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (err) {
      logError("[db] support flow write failed", { error: safeErr(err) });
    }
  }

  await addTurn({ userId, chatId, platform: "telegram", role: "assistant", text: finalText });
  await maybeUpdateProfileMemory(userId, text, finalText);
  await ctx.reply(finalText.slice(0, 3900));

  if (lowConfidence && /human|agent|person|support/i.test(text)) {
    await createEscalationFromContext(ctx, "Low confidence support answer");
  }
}

export async function getLastAnswerSources(userId, chatId) {
  const key = answerKey(userId, chatId);
  if (lastAnswerCache.has(key)) return lastAnswerCache.get(key) || [];

  const db = await getDb();
  if (!db) return [];
  try {
    const row = await db.collection("messages").findOne(
      { userId: String(userId || ""), sender: "assistant", sourceRefs: { $exists: true, $ne: [] } },
      { sort: { } }
    );
    return row?.sourceRefs || [];
  } catch (err) {
    logError("[db] last sources lookup failed", { error: safeErr(err) });
    return [];
  }
}

function ratingToValue(rating) {
  const value = String(rating || "").toLowerCase();
  if (["great", "helpful", "good", "yes", "up"].includes(value)) return 5;
  if (["ok", "fine", "meh"].includes(value)) return 3;
  if (["bad", "wrong", "unhelpful", "no", "down"].includes(value)) return 1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function saveFeedbackForLastAnswer(userId, chatId, rating, comment) {
  const db = await getDb();
  if (!db) return false;

  try {
    const lastAnswer = await db.collection("messages").findOne(
      { userId: String(userId || ""), sender: "assistant" },
      { sort: { createdAt: -1 } }
    );
    if (!lastAnswer) return false;

    await db.collection("feedback").insertOne({
      messageId: String(lastAnswer.messageId || lastAnswer._id),
      userId: String(userId || ""),
      chatId: String(chatId || ""),
      rating: String(rating || ""),
      ratingValue: ratingToValue(rating),
      comment: String(comment || "").slice(0, 1000),
    });
    return true;
  } catch (err) {
    logError("[db] feedback insert failed", { error: safeErr(err) });
    return false;
  }
}
