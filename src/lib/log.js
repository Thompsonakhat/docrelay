export function safeErr(err) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || String(err);
}

export function logInfo(msg, meta = {}) {
  console.log(JSON.stringify({ level: "info", msg, ...meta }));
}

export function logWarn(msg, meta = {}) {
  console.warn(JSON.stringify({ level: "warn", msg, ...meta }));
}

export function logError(msg, meta = {}) {
  console.error(JSON.stringify({ level: "error", msg, ...meta }));
}
