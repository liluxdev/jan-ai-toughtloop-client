import { clearToughtloopInterval, setToughtloopInterval } from "../index.js";
import {
  clearRecentMessages,
  getApiContextDebug,
  setBufferMessagesLimit,
  getModels,
  ensureModelDownloaded,
  getConfiguration,
} from "./api.js";
import {
  dbPromise,
  dbPromiseMemory,
  dbPromisePrompts,
  dbVersions,
  getMessagesVersion,
  initDb,
  setMessageThread,
} from "./db.js";

export const setupRoutes = (router) => {
  router.get("/models", async (ctx) => {
    const models = await getModels();
    ctx.body = models.data;
  });

  router.get("/profiles", async (ctx) => {
    const dbMem = await dbPromiseMemory;
    const profiles = (await dbMem.all("SELECT distinct(profile) FROM messages")).map(profile =>profile.profile);
    ctx.body = profiles;
  });

  router.post("/profiles", async (ctx) => {
    const { name } = ctx.request.body;
    const db = await dbPromiseMemory;
    const timestamp = new Date().toISOString();
    await db.run(
      "INSERT INTO messages (content, role, timestamp, profile) VALUES (?, ?, ?, ?)",
      "Profile "+name+" created at "+timestamp,
      'system_memory',
      timestamp,
      name
    );
    ctx.body = { name };
  });

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
    const db = await dbPromisePrompts;
    await db.run("DELETE FROM prompts WHERE id = ?", id);
    ctx.body = { id };
  });
  //route GET /memory
  router.get("/memory", async (ctx) => {
    const db = await dbPromiseMemory;
    const messages = await db.all(
      "SELECT * FROM messages WHERE role = 'system_memory' AND profile = ? ORDER BY timestamp DESC",
      (await getConfiguration()).profile || "default"
    );
    ctx.body = messages;
  });
  router.post("/memory", async (ctx) => {
    const { message } = ctx.request.body;
    const db = await dbPromiseMemory;
    const timestamp = new Date().toISOString();
    await db.run(
      "INSERT INTO messages (content, role, timestamp, profile) VALUES (?, ?, ?, ?)",
      message,
      "system_memory",
      timestamp,
      (await getConfiguration()).profile || "default"

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
    ctx.body = await getApiContextDebug();
  });
  router.get("/version", async (ctx) => {
    const db = await dbVersions;
    const versions = await db.all("SELECT * FROM versions");
    ctx.body = versions;
  });
  router.get("/threads", async (ctx) => {
    const db = await dbPromise();
    const threads = await db.all(
      "SELECT key, friendlyName, timestamp, timestampLastUpdate FROM threads ORDER BY timestampLastUpdate DESC,timestamp DESC"
    );
    const currentThreadKey = await getMessagesVersion();
    for (const thread of threads) {
      if (thread.key === currentThreadKey) {
        thread.current = true;
      }
    }
    ctx.body = threads;
  });

  router.post("/threads/new", async (ctx) => {
    const db = await dbVersions;
    const name = ctx.request.body.name;
    const timestamp = new Date().toISOString();
    const version = timestamp.replace(/:/g, "-");
    if ((await getApiContextDebug()).invokingApi) {
      ctx.status = 403;
      ctx.body = { error: "Cannot switch Thread while invoking API" };
      return;
    }
    await db.run(
      `INSERT INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)`,
      version,
      name,
      timestamp,
      timestamp
    );

    const dbMsg = await dbPromise();
    await dbMsg.run(
      `INSERT INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)`,
      version,
      name,
      timestamp,
      timestamp
    );

    const key = "messages";
    await db.run("UPDATE versions SET version = ? WHERE key = ?", version, key);
    ctx.body = { version };
    setMessageThread(version);
    clearRecentMessages();
    initDb();
  });

  router.put("/threads/current", async (ctx) => {
    const currentThreadKey = await getMessagesVersion();
    const { name } = ctx.request.body;
    const db = await dbVersions;
    const timestamp = new Date().toISOString();
    await db.run(
      "UPDATE threads SET friendlyName = ?, timestampLastUpdate = ? WHERE key = ?",
      name,
      timestamp,
      currentThreadKey
    );
    const dbMsg = await dbPromise();
    await dbMsg.run(
      "UPDATE threads SET friendlyName = ?, timestampLastUpdate = ? WHERE key = ?",
      name,
      timestamp,
      currentThreadKey
    );
    ctx.body = { name };
  });

  router.put("/version/:key", async (ctx) => {
    const { version } = ctx.request.body;
    const db = await dbVersions;
    const key = ctx.params.key;
    if ((await getApiContextDebug()).invokingApi) {
      ctx.status = 403;
      ctx.body = { error: "Cannot switch Thread while invoking API" };
      return;
    }
    await db.run("UPDATE versions SET version = ? WHERE key = ?", version, key);
    ctx.body = { version };
    setMessageThread(version);
    clearRecentMessages();
    initDb();
  });

  router.put("/config/:key", async (ctx) => {
    const { value } = ctx.request.body;
    const db = await dbVersions;
    const key = ctx.params.key;
    await db.run(
      "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      key,
      value,
      value
    );
    if (key === "model") {
      setTimeout(()=>{
        console.error("Model changed, ensuring download of model...");
        ensureModelDownloaded(value);
      }, 1000);
    }
    if (key === "buffer") {
      setBufferMessagesLimit(value);
    }
    if (key === "toughtloopIntervalRandomMaxSecs") {
      clearToughtloopInterval();
      setToughtloopInterval();
    }
    ctx.body = { key: value };
  });
};
