import { getDb } from "./db.js";
import { logError, safeErr } from "./log.js";

const inMemoryTurns = new Map();
const inMemoryProfiles = new Map();
const MAX_IN_MEMORY_KEYS = 5000;

function boundedSet(map, key, value) {
  if (map.size >= MAX_IN_MEMORY_KEYS && !map.has(key)) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
  map.set(key, value);
}

function memoryKey({ platform, userId, chatId }) {
  return `${platform}:${String(userId || "")}:${String(chatId || "")}`;
}

export async function addTurn({ userId, chatId, platform, role, text }) {
  const doc = {
    userId: String(userId || ""),
    chatId: String(chatId || ""),
    platform: String(platform || "telegram"),
    role: String(role || "user"),
    text: String(text || "").slice(0, 4000),
    ts: new Date()
  };

  const db = await getDb();
  if (!db) {
    const key = memoryKey(doc);
    const list = inMemoryTurns.get(key) || [];
    list.push(doc);
    while (list.length > 20) list.shift();
    boundedSet(inMemoryTurns, key, list);
    return;
  }

  try {
    await db.collection("memory_messages").insertOne(doc);
  } catch (err) {
    logError("[db] memory_messages insertOne failed", { error: safeErr(err) });
  }
}

export async function getRecentTurns({ userId, chatId, platform, limit = 12 }) {
  const db = await getDb();
  if (!db) {
    const key = memoryKey({ userId, chatId, platform });
    return (inMemoryTurns.get(key) || []).slice(-limit);
  }

  try {
    const rows = await db.collection("memory_messages")
      .find({ userId: String(userId || ""), chatId: String(chatId || ""), platform: String(platform || "telegram") })
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
    return rows.reverse();
  } catch (err) {
    logError("[db] memory_messages find failed", { error: safeErr(err) });
    return [];
  }
}

export async function clearUserMemory({ userId, chatId, platform }) {
  const db = await getDb();
  const key = memoryKey({ userId, chatId, platform });
  if (!db) {
    inMemoryTurns.delete(key);
    return;
  }

  try {
    await db.collection("memory_messages").deleteMany({
      userId: String(userId || ""),
      chatId: String(chatId || ""),
      platform: String(platform || "telegram")
    });
  } catch (err) {
    logError("[db] memory_messages deleteMany failed", { error: safeErr(err) });
  }
}

export async function getUserProfileMemory(userId) {
  const db = await getDb();
  const key = String(userId || "");
  if (!db) return inMemoryProfiles.get(key) || "";

  try {
    const row = await db.collection("user_memory").findOne({ userId: key });
    return row?.memorySummary || "";
  } catch (err) {
    logError("[db] user_memory findOne failed", { error: safeErr(err) });
    return "";
  }
}

export async function updateUserProfileMemory(userId, memorySummary) {
  const clean = String(memorySummary || "").slice(0, 800);
  const db = await getDb();
  const key = String(userId || "");
  if (!db) {
    boundedSet(inMemoryProfiles, key, clean);
    return;
  }

  try {
    await db.collection("user_memory").updateOne(
      { userId: key },
      {
        $setOnInsert: { createdAt: new Date(), userId: key },
        $set: { memorySummary: clean, lastUpdatedAt: new Date() }
      },
      { upsert: true }
    );
  } catch (err) {
    logError("[db] user_memory updateOne failed", { error: safeErr(err) });
  }
}

export async function clearUserProfileMemory(userId) {
  const db = await getDb();
  const key = String(userId || "");
  if (!db) {
    inMemoryProfiles.delete(key);
    return;
  }

  try {
    await db.collection("user_memory").deleteMany({ userId: key });
  } catch (err) {
    logError("[db] user_memory deleteMany failed", { error: safeErr(err) });
  }
}
