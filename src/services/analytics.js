import { getDb } from "../lib/db.js";
import { logError, safeErr } from "../lib/log.js";

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) {
    return { questions: 0, answers: 0, lowConfidence: 0, escalations: 0, feedback: 0, avgRating: 0 };
  }

  try {
    const [questions, answers, lowConfidence, escalations, feedbackRows] = await Promise.all([
      db.collection("messages").countDocuments({ sender: "user" }),
      db.collection("messages").countDocuments({ sender: "assistant" }),
      db.collection("messages").countDocuments({ sender: "assistant", answerQuality: "low_confidence" }),
      db.collection("supporttickets").countDocuments({}),
      db.collection("feedback").find({}).toArray()
    ]);

    const numeric = feedbackRows.map((row) => Number(row.ratingValue)).filter((v) => Number.isFinite(v));
    const avgRating = numeric.length ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(2) : "0.00";
    return { questions, answers, lowConfidence, escalations, feedback: feedbackRows.length, avgRating };
  } catch (err) {
    logError("[db] analytics failed", { error: safeErr(err) });
    return { questions: 0, answers: 0, lowConfidence: 0, escalations: 0, feedback: 0, avgRating: 0 };
  }
}
