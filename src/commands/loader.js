import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerCommands(bot) {
  const files = fs.readdirSync(__dirname)
    .filter((file) => file.endsWith(".js") && file !== "loader.js" && !file.startsWith("_"))
    .sort();

  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(__dirname, file)).href);
    const handler = mod.default || mod.register;
    if (typeof handler === "function") {
      await handler(bot);
    } else {
      console.warn("[commands] skipped file without register export", { file });
    }
  }
}
