import fs from "node:fs/promises";
import path from "node:path";
import { cfg } from "../lib/config.js";
import { getDb } from "../lib/db.js";
import { aiEmbeddings } from "../lib/ai.js";
import { logError, safeErr } from "../lib/log.js";

function chunkText(text, size = 900) {
  const clean = String(text || "").replace(/\r/g, "").trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size));
  }
  return chunks.filter(Boolean);
}

export async function addFaqEntry({ question, answer, userId }) {
  const db = await getDb();
  const now = new Date();
  const doc = {
    question: String(question || "").slice(0, 500),
    answer: String(answer || "").slice(0, 4000),
    tags: [],
    status: "active",
    priority: 1,
    updatedBy: String(userId || ""),
    createdAt: now,
    updatedAt: now
  };

  if (!db) return { id: "local-only" };
  const result = await db.collection("faqs").insertOne(doc);
  return { id: String(result.insertedId) };
}

export async function handleUploadCommand(ctx) {
  const db = await getDb();
  if (!db) {
    await ctx.reply("MongoDB is required for document uploads.");
    return;
  }

  try {
    await fs.mkdir(cfg.DOCS_STORAGE_DIR, { recursive: true });
    let text = "";
    let title = "Support document";

    if (ctx.message?.document) {
      const file = await ctx.getFile();
      const url = file.getUrl();
      const res = await fetch(url);
      text = await res.text();
      title = ctx.message.document.file_name || title;
      const target = path.join(cfg.DOCS_STORAGE_DIR, `${Date.now()}-${title.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
      await fs.writeFile(target, text, "utf8");
    } else if (ctx.message?.text) {
      text = ctx.message.text;
    }

    if (!text.trim()) {
      await ctx.reply("I couldn't read any text from that upload.");
      return;
    }

    const now = new Date();
    const docResult = await db.collection("documents").insertOne({
      title,
      sourceType: "telegram_upload",
      storagePath: cfg.DOCS_STORAGE_DIR,
      status: "active",
      version: 1,
      createdBy: String(ctx.from?.id || ""),
      createdAt: now,
      updatedAt: now
    });

    const parts = chunkText(text);
    for (let i = 0; i < parts.length; i += 1) {
      const chunk = parts[i];
      await aiEmbeddings(chunk, { feature: "document_chunk" }).catch(() => null);
      await db.collection("documentchunks").insertOne({
        documentId: String(docResult.insertedId),
        documentTitle: title,
        title,
        chunkText: chunk,
        chunkIndex: i,
        metadata: {},
        status: "active",
        createdAt: now,
        updatedAt: now
      });
    }

    await ctx.reply(`Document stored and indexed. Chunks: ${parts.length}.`);
  } catch (err) {
    logError("[admin] upload failed", { error: safeErr(err) });
    await ctx.reply("Upload failed. Please try again with a plain text document.");
  }
}

export async function rebuildRetrievalIndex(userId) {
  const db = await getDb();
  const now = new Date();
  if (!db) return { faqs: 0, documents: 0, chunks: 0 };

  let faqs = 0;
  let documents = 0;
  let chunks = 0;

  try {
    const faqRows = await db.collection("faqs").find({ status: "active" }).toArray();
    faqs = faqRows.length;
    for (const row of faqRows) {
      await aiEmbeddings(`${row.question}\n${row.answer}`, { feature: "faq_reindex" }).catch(() => null);
    }

    const docs = await db.collection("documents").find({ status: "active" }).toArray();
    documents = docs.length;
    const chunkRows = await db.collection("documentchunks").find({ status: "active" }).toArray();
    chunks = chunkRows.length;
    for (const row of chunkRows) {
      await aiEmbeddings(row.chunkText || "", { feature: "doc_reindex" }).catch(() => null);
    }

    await db.collection("adminjobs").insertOne({
      type: "reindex",
      status: "finished",
      startedAt: now,
      finishedAt: new Date(),
      result: { faqs, documents, chunks },
      createdBy: String(userId || "")
    });
  } catch (err) {
    logError("[admin] reindex failed", { error: safeErr(err) });
  }

  return { faqs, documents, chunks };
}

export async function getReviewQueue() {
  const db = await getDb();
  if (!db) return [];
  try {
    const lowConfidence = await db.collection("messages")
      .find({ sender: "assistant", answerQuality: "low_confidence" })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const poorFeedback = await db.collection("feedback")
      .find({ ratingValue: { $lte: 2 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return [
      ...lowConfidence.map((row) => ({ reason: "Low confidence", text: row.promptText || row.text || "" })),
      ...poorFeedback.map((row) => ({ reason: "Poor feedback", text: row.comment || row.rating || "" }))
    ].slice(0, 10);
  } catch (err) {
    logError("[admin] review queue failed", { error: safeErr(err) });
    return [];
  }
}
