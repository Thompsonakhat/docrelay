import { MongoClient } from "mongodb";
import { cfg } from "./config.js";
import { logError, logInfo, safeErr } from "./log.js";

let client = null;
let db = null;
let warnedNoMongo = false;

export async function connectDb() {
  if (db) return db;
  if (!cfg.MONGODB_URI) {
    if (!warnedNoMongo) {
      warnedNoMongo = true;
      logInfo("[db] mongodb disabled, using in-memory fallback where possible");
    }
    return null;
  }

  try {
    client = new MongoClient(cfg.MONGODB_URI, { maxPoolSize: 10, ignoreUndefined: true });
    await client.connect();
    db = client.db();
    await ensureIndexes(db);
    logInfo("[db] connected", { mongo: true });
    return db;
  } catch (err) {
    logError("[db] connect failed", { error: safeErr(err) });
    throw err;
  }
}

export async function getDb() {
  if (db) return db;
  return connectDb();
}

async function ensureIndexes(database) {
  try {
    await database.collection("users").createIndex({ telegramId: 1 }, { unique: true });
    await database.collection("conversations").createIndex({ userId: 1, updatedAt: -1 });
    await database.collection("messages").createIndex({ conversationId: 1, createdAt: -1 });
    await database.collection("messages").createIndex({ userId: 1, createdAt: -1 });
    await database.collection("documents").createIndex({ status: 1, updatedAt: -1 });
    await database.collection("documentchunks").createIndex({ documentId: 1, chunkIndex: 1 });
    await database.collection("documentchunks").createIndex({ updatedAt: -1 });
    await database.collection("faqs").createIndex({ status: 1, priority: -1, updatedAt: -1 });
    await database.collection("supporttickets").createIndex({ userId: 1, status: 1, updatedAt: -1 });
    await database.collection("feedback").createIndex({ userId: 1, createdAt: -1 });
    await database.collection("adminjobs").createIndex({ type: 1, startedAt: -1 });
    await database.collection("memory_messages").createIndex({ platform: 1, userId: 1, chatId: 1, ts: -1 });
    await database.collection("user_memory").createIndex({ userId: 1 }, { unique: true });
    await database.collection("user_profiles").createIndex({ userId: 1 }, { unique: true });
  } catch (err) {
    logError("[db] ensureIndexes failed", { error: safeErr(err) });
  }
}
