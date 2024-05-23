import { open } from "sqlite";
import sqlite3 from "sqlite3";

let VERSION_DB_MGS = "-0.0.0.0";
const VERSION_DB_PROMPTS = "-0.0.0.0";
const VERSION_DB_MEMORY = "";

export const dbVersions = open(
  {filename: "./stealth_db/versions.db", driver: sqlite3.Database}
);

export const setMessageVersion = async (version) => {
  VERSION_DB_MGS = version;
}

const dbVersionsInit = async () => {
  const db = await dbVersions;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      version TEXT,
      key TEXT PRIMARY KEY
    )
  `);
  console.log("Database versions initialized");
  db.run("INSERT OR IGNORE INTO versions (version, key) VALUES (?, ?)", VERSION_DB_MGS, "messages");
  const versions = await db.all("SELECT * FROM versions WHERE key = 'messages'");
  if (versions.length > 0) {
    VERSION_DB_MGS = versions[0].version;
  }
}

await dbVersionsInit();

const getMessagesVersion = () => {
  console.log("Messages version is", VERSION_DB_MGS);
  return VERSION_DB_MGS;
}

export const dbPromise = async() => await open({
  filename: "./stealth_db/database" + getMessagesVersion() + ".db",
  driver: sqlite3.Database,
});

export const dbPromisePrompts = open({
  filename: "./stealth_db/prompts"+VERSION_DB_PROMPTS+".db",
  driver: sqlite3.Database,
});

export const dbPromiseMemory = open({
  filename: "./stealth_db/memory"+VERSION_DB_MEMORY+".db",
  driver: sqlite3.Database,
});

export const initDb = async () => {
  const db = await dbPromise();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content LONGTEXT,
      role TEXT,
      timestamp TEXT
    )
  `);
  const dbMem = await dbPromiseMemory;
  await dbMem.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content LONGTEXT,
      role TEXT,
      timestamp TEXT
    )
  `);
  const dbPrompt = await dbPromisePrompts;
  await dbPrompt.exec(`
        CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content LONGTEXT,
        role TEXT,
        timestamp TEXT
        )
    `);
  console.log("Database initialized");
};
