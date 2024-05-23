import { clearRecentMessages, getApiContextDebug } from "./api.js";
import {
  dbPromiseMemory,
  dbPromisePrompts,
  dbVersions,
  initDb,
  setMessageVersion,
} from "./db.js";

export const setupRoutes = (router) => {
  router.get("/toughtloop", async (ctx) => {
    const db = await dbPromisePrompts;
    const messages = await db.all(
      "SELECT * FROM prompts WHERE role = 'prompt' ORDER BY timestamp DESC"
    );
    ctx.body = messages;
  });
  router.post("/toughtloop", async (ctx) => {
    const { message } = ctx.request.body;
    const db = await dbPromisePrompts;
    const timestamp = new Date().toISOString();
    await db.run(
      "INSERT INTO prompts (content, role, timestamp) VALUES (?, ?, ?)",
      message,
      "prompt",
      timestamp
    );
    ctx.body = { message };
  });
  router.put("/toughtloop/:id", async (ctx) => {
    const { id } = ctx.params;
    const { message } = ctx.request.body;
    const db = await dbPromisePrompts;
    const timestamp = new Date().toISOString();
    await db.run(
      "UPDATE prompts SET content = ?, timestamp = ? WHERE id = ?",
      message,
      timestamp,
      id
    );
    ctx.body = { message };
  });
  router.delete("/toughtloop/:id", async (ctx) => {
    const { id } = ctx.params;
    const db = await dbPromiseMemory;
    await db.run("DELETE FROM prompts WHERE id = ?", id);
    ctx.body = { id };
  });
  //route GET /memory
  router.get("/memory", async (ctx) => {
    const db = await dbPromiseMemory;
    const messages = await db.all(
      "SELECT * FROM messages WHERE role = 'system_memory' ORDER BY timestamp DESC"
    );
    ctx.body = messages;
  });
  router.post("/memory", async (ctx) => {
    const { message } = ctx.request.body;
    const db = await dbPromiseMemory;
    const timestamp = new Date().toISOString();
    await db.run(
      "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
      message,
      "system_memory",
      timestamp
    );
    ctx.body = { message };
  });
  router.put("/memory/:id", async (ctx) => {
    const { id } = ctx.params;
    const { message } = ctx.request.body;
    const db = await dbPromiseMemory;
    const timestamp = new Date().toISOString();
    await db.run(
      "UPDATE messages SET content = ?, timestamp = ? WHERE id = ?",
      message,
      timestamp,
      id
    );
    ctx.body = { message };
  });
  router.delete("/memory/:id", async (ctx) => {
    const { id } = ctx.params;
    const db = await dbPromiseMemory;
    await db.run("DELETE FROM messages WHERE id = ?", id);
    ctx.body = { id };
  });
  router.get("/apiContextDebug", async (ctx) => {
    ctx.body = getApiContextDebug();
  });
  router.get("/version", async (ctx) => {
    const db = await dbVersions;
    const versions = await db.all("SELECT * FROM versions");
    ctx.body = versions;
  });
  router.put("/version/:key", async (ctx) => {
    const { version } = ctx.request.body;
    const db = await dbVersions;
    const key = ctx.params.key;
    await db.run("UPDATE versions SET version = ? WHERE key = ?", version, key);
    ctx.body = { version };
    setMessageVersion(version);
    clearRecentMessages();
    initDb();
  });
};
