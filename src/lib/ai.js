import { cfg } from "./config.js";
import { buildBotProfile } from "./botProfile.js";
import { logError, logInfo, safeErr } from "./log.js";

function trimBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

export async function aiChat(messages, meta = {}) {
  if (!cfg.COOKMYBOTS_AI_ENDPOINT || !cfg.COOKMYBOTS_AI_KEY) {
    return { ok: false, error: "AI gateway is not configured." };
  }

  const payload = {
    messages: [
      { role: "system", content: buildBotProfile() },
      ...messages
    ],
    meta: { platform: "telegram", ...meta }
  };

  const url = `${trimBase(cfg.COOKMYBOTS_AI_ENDPOINT)}/chat`;
  logInfo("[ai] chat start", { feature: "chat", platform: "telegram" });
  const { signal, done } = timeoutSignal(cfg.AI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.COOKMYBOTS_AI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const error = safeErr({ response: { data: json }, message: `HTTP ${res.status}` });
      logError("[ai] chat failure", { feature: "chat", error });
      return { ok: false, error };
    }

    const content = json?.output?.content || "";
    logInfo("[ai] chat success", { feature: "chat", hasContent: !!content });
    return { ok: true, content: String(content || ""), raw: json };
  } catch (err) {
    const error = safeErr(err);
    logError("[ai] chat failure", { feature: "chat", error });
    return { ok: false, error };
  } finally {
    done();
  }
}

export async function aiEmbeddings(input, meta = {}) {
  if (!cfg.COOKMYBOTS_AI_ENDPOINT || !cfg.COOKMYBOTS_AI_KEY) {
    return { ok: false, error: "AI gateway is not configured." };
  }

  const url = `${trimBase(cfg.COOKMYBOTS_AI_ENDPOINT)}/embeddings`;
  logInfo("[ai] embeddings start", { feature: "embeddings", platform: "telegram" });
  const { signal, done } = timeoutSignal(cfg.AI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.COOKMYBOTS_AI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input, meta: { platform: "telegram", ...meta } }),
      signal
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const error = safeErr({ response: { data: json }, message: `HTTP ${res.status}` });
      logError("[ai] embeddings failure", { feature: "embeddings", error });
      return { ok: false, error };
    }

    logInfo("[ai] embeddings success", { feature: "embeddings" });
    return { ok: true, output: json?.output || null, raw: json };
  } catch (err) {
    const error = safeErr(err);
    logError("[ai] embeddings failure", { feature: "embeddings", error });
    return { ok: false, error };
  } finally {
    done();
  }
}
