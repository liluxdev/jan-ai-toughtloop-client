import { open } from "sqlite";
import sqlite3 from "sqlite3";
import fs from "fs";

let VERSION_DB_MGS = "0.0.0.0";
const VERSION_DB_PROMPTS = "-0.0.0.0";
const VERSION_DB_MEMORY = "";

export const dbVersions = open({
  filename: "./stealth_db/versions.db",
  driver: sqlite3.Database,
});

export const setMessageVersion = async (version) => {
  VERSION_DB_MGS = version.replace(":","-");
};

const dbVersionsInit = async () => {
  const db = await dbVersions;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      version TEXT,
      key TEXT PRIMARY KEY
    )
  `);
  console.log("Database versions initialized");
  db.run(
    "INSERT OR IGNORE INTO versions (version, key) VALUES (?, ?)",
    VERSION_DB_MGS,
    "messages"
  );
  console.log("Current version is", VERSION_DB_MGS);

  const versions = await db.all(
    "SELECT * FROM versions WHERE key = 'messages'"
  );
  console.log("Current version are", versions);

  if (versions.length > 0) {
    VERSION_DB_MGS = versions[0].version.replace(":","-");

  }
};

await dbVersionsInit();

export const getMessagesVersion = () => {
  console.log("Messages version is", VERSION_DB_MGS);
  return VERSION_DB_MGS;
};


export const getConversationFriendlyName = async () => {
  const db = await dbVersions;
  const currentThreadKey = await getMessagesVersion();
  const threads = await db.all("SELECT friendlyName FROM threads WHERE key = ?", currentThreadKey);
  return threads[0].friendlyName;
};

export const dbPromise = async () =>
  await open({
    filename: "./stealth_db/database" + getMessagesVersion() + ".db",
    driver: sqlite3.Database,
  });

export const dbPromisePrompts = open({
  filename: "./stealth_db/prompts" + VERSION_DB_PROMPTS + ".db",
  driver: sqlite3.Database,
});

export const dbPromiseMemory = open({
  filename: "./stealth_db/memory" + VERSION_DB_MEMORY + ".db",
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
  const dbVer = await dbVersions;
  await dbVer.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      friendlyName TEXT,
      key TEXT PRIMARY KEY,
      timestamp TEXT,
      timestampLastUpdate TEXT
    )
  `);

  await dbVer.exec(`
  CREATE TABLE IF NOT EXISTS config (
    value TEXT,
    key TEXT PRIMARY KEY
  )
`);
  console.log("Database initialized");
  doDbMigrations();
};

const doDbMigrations = async () => {
  const db = await dbVersions;
  console.log("Checking for database migrations");
  console.log("Migrating db files to threads...");
  const files = fs.readdirSync("./stealth_db/")
   .filter((file) => file.startsWith("database-") && file.endsWith(".db"));
  console.log("Files found", files);
  for (const file of files) {
    const version = file.replace("database-", "").replace(".db", "");
    
    console.log("Migrating", version);
    if (fs.existsSync("./stealth_db/database"+version+".db")) {
      console.log("File aready migrated", version);
      setTimeout(() => {
        try{
        fs.unlinkSync("./stealth_db/" + file);
        } catch (err) {
          console.log("\n\n\nLEGACY FILE FOUND!\n\nPLEASE DELETE MANUALLY THE ./stealth_db/"+file+"\n\nError deleting file");
        }
      }, 1000);
      continue;

    }
    const fileStats = fs.statSync("./stealth_db/" + file);
    const creationDate = fileStats.birthtime.toISOString();
    await db.run(
      "INSERT OR IGNORE INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)",
      version,
      "Migrated legacy thread v." + version,
      creationDate,
      creationDate
    );
    //copy the file to the new location
 
    fs.copyFileSync
    ("./stealth_db/" + file, "./stealth_db/database"+version+".db");
    setTimeout(() => {
      try{
      fs.unlinkSync("./stealth_db/" + file);
      } catch (err) {
        console.log("Error deleting file", err);
      }
    }, 3000);
    console.log("Migrated", version, creationDate);
  }
  //Add fiendlyName column to versions table only if it doesn't exist
  try {
    await db.exec(`ALTER TABLE versions ADD COLUMN fiendlyName TEXT`);
    console.log("Column added");
  } catch (err) {
    console.log("Column already exists");
  }
};
