import { getDb } from "../lib/db.js";
import { aiEmbeddings } from "../lib/ai.js";
import { logError, safeErr } from "../lib/log.js";

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreText(query, text) {
  const q = tokenize(query);
  const t = tokenize(text);
  if (!q.length || !t.length) return 0;
  const tSet = new Set(t);
  let hits = 0;
  for (const token of q) {
    if (tSet.has(token)) hits += 1;
  }
  return hits / Math.max(q.length, 1);
}

export async function findFaqs(keyword = "", limit = 5) {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db.collection("faqs")
      .find({ status: "active" })
      .sort({ priority: -1, updatedAt: -1 })
      .limit(50)
      .toArray();

    const ranked = rows
      .map((row) => ({ ...row, _score: scoreText(keyword, `${row.question} ${row.answer} ${(row.tags || []).join(" ")}`) }))
      .filter((row) => !keyword || row._score > 0)
      .sort((a, b) => b._score - a._score || (b.priority || 0) - (a.priority || 0))
      .slice(0, limit);

    return ranked;
  } catch (err) {
    logError("[db] faqs find failed", { collection: "faqs", operation: "find", error: safeErr(err) });
    return [];
  }
}

export async function retrieveSupportSources(query, limit = 4) {
  const db = await getDb();
  if (!db) return [];

  try {
    await aiEmbeddings(query, { feature: "support_retrieval" });
  } catch {}

  try {
    const faqRows = await db.collection("faqs").find({ status: "active" }).limit(100).toArray();
    const chunkRows = await db.collection("documentchunks").find({ status: "active" }).limit(200).toArray();

    const merged = [
      ...faqRows.map((row) => ({
        kind: "faq",
        sourceId: String(row._id),
        title: row.question,
        snippet: row.answer,
        text: `${row.question} ${row.answer} ${(row.tags || []).join(" ")}`
      })),
      ...chunkRows.map((row) => ({
        kind: "document",
        sourceId: String(row._id),
        title: row.title || row.documentTitle || "Support document",
        snippet: row.chunkText,
        text: `${row.title || ""} ${row.chunkText || ""} ${(row.tags || []).join(" ")}`
      }))
    ];

    const ranked = merged
      .map((item) => ({ ...item, score: scoreText(query, item.text) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked;
  } catch (err) {
    logError("[db] retrieval failed", { collection: "faqs/documentchunks", operation: "find", error: safeErr(err) });
    return [];
  }
}
