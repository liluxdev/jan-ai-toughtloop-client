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

export const setMessageThread = (version) => {
  VERSION_DB_MGS = version;
};

export const getCurrentThread = () => {
  console.error("Version is", VERSION_DB_MGS);
  return VERSION_DB_MGS;
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
  await db.run(
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
    VERSION_DB_MGS = versions[0].version.replace(":", "-");
  }
};

await dbVersionsInit();

export const getMessagesVersion = () => {
  console.log("Messages version is", VERSION_DB_MGS);
  return VERSION_DB_MGS;
};

export const getConversationFriendlyName = async (threadId = undefined) => {
  const db = await dbVersions;
  const currentThreadKey = await getCurrentThread();
  const threads = await db.all(
    "SELECT friendlyName FROM threads WHERE key = ?",
    threadId ? threadId : currentThreadKey
  );
  return threads[0].friendlyName;
};

export const dbPromiseMessageGeneric = async (version) =>
  open({
    filename: "./stealth_db/database" + version + ".db",
    driver: sqlite3.Database,
  });

export const doAllThreadsDbMigrations = async () => {
  return; //DISABLED for performance reasons
  try {
    await db2.exec(`ALTER TABLE messages ADD COLUMN model TEXT`);
    console.log("Column added");
  } catch (err) {
    console.log("Column already exists");
  }
};

export const queryAllMessagesOfAllThreadsOrderByTimpestampAndJoin = async () => {
  const db = await dbPromise();
  const messages = await db.all(
    "SELECT messages.*, threads.friendlyName AS threadFriendlyName FROM messages INNER JOIN threads ON messages.threadId = threads.key ORDER BY messages.timestamp ASC"
  );
  console.error("Total Messages queried", messages.length);
  return messages;
};

export const queryAllMessagesOfAllThreads = async () => {
  const db = await dbPromise();
  const threads = await db.all(
    "SELECT key, friendlyName FROM threads ORDER BY timestampLastUpdate ASC, timestamp ASC"
  );
  const allMessages = [];
  for (const thread of threads) {
    try {
      const messages = await db.all(
        "SELECT * FROM messages WHERE threadId = ? ORDER BY timestamp ASC",
        thread.key
      );
      allMessages.push({ thread: thread, messages });
      console.error("Messages queried", messages.length);
    } catch (err) {
      console.error("Error querying messages", err);
    }
  }
  console.error("Total Messages queried", allMessages.length);
  return allMessages;
};

export const dbPromise = async () =>
  open({
    filename: "./stealth_db/db.db",
    driver: sqlite3.Database,
  });

export const dbPromiseNww = async (name) =>
  open({
    filename: "./stealth_db/" + name + ".db",
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
    CREATE TABLE IF NOT EXISTS threads (
      friendlyName TEXT,
      key TEXT PRIMARY KEY,
      timestamp TEXT,
      timestampLastUpdate TEXT
    )
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content LONGTEXT,
    role TEXT,
    timestamp TEXT,
    threadId TEXT,
    FOREIGN KEY (threadId) REFERENCES threads(key)
    )
  `);

  await db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_threadId ON messages (threadId);
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
  await doDbMigrations();
};

const updateThreadMessageCount = async () => {
  let dbMsg = await dbPromise();
  const selectAllThreads = await dbMsg.all("SELECT * FROM threads");
  //console.log("SELECT threads", selectAllThreads);
  for (const thread of selectAllThreads) {
    const countMessages = await dbMsg.all('SELECT COUNT(*) AS count FROM messages WHERE threadId =?', thread.key);
    console.log("Count messages", countMessages);
    await dbMsg.run('UPDATE threads SET messageCount =? WHERE key =?', countMessages[0].count, thread.key);
    console.log("Updated thread", thread.key);
  }
};

//setInterval(updateThreadMessageCount, 1000 * 60);
setTimeout(updateThreadMessageCount, 300);

const doDbMigrations = async () => {
  let dbMsg = await dbPromise();

  try {
    await dbMsg.exec(`ALTER TABLE messages ADD COLUMN model TEXT`);
    console.log("Column added");
  } catch (err) {
    console.log("Column already exists");
  }

  try {
    await dbMsg.exec(`ALTER TABLE threads ADD COLUMN messageCount INTEGER`);
    console.log("Column added");
  } catch (err) {
    console.log("Column already exists");
  }
  /*
  try {
    await dbMsg.exec(
      'INSERT OR IGNORE INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES ("legacy", "Legacy thread", "2021-01-01T00:00:00.000Z", "2021-01-01T00:00:00.000Z")'
    );
    await dbMsg.exec(
      `UPDATE messages SET threadId = 'legacy' WHERE threadId IS NULL`
    );
    const selectLegacyMessages = await dbMsg.all(
      "SELECT * FROM messages WHERE threadId = 'legacy'"
    );
    console.log("SELECT legacy messages", selectLegacyMessages);
    if (selectLegacyMessages.length === 0) {
      await dbMsg.exec("DELETE FROM threads WHERE key = 'legacy'");
    } else {
      const selectAllThreads = await dbMsg.all("SELECT * FROM threads");
      console.log("SELECT threads", selectAllThreads);
      for (const thread of selectAllThreads) {
        const selectMessages = await dbMsg.all(
          "SELECT * FROM messages WHERE threadId = ?",
          thread.key
        );
        console.log("SELECT messages", selectMessages);
        if (selectMessages.length === 0) {
          console.error("Deleting thread", thread.key);
          try{
          await dbMsg.run("DELETE FROM threads WHERE key = ?", thread.key);
          }catch(err){
            console.error("Error deleting thread", thread.key, err);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error migrating legacy messages", err);
  }*/
  /*
  const dbVer = await dbVersions;
  console.log("Checking for database migrations");
  console.log("Migrating db files to threads...");
  const files = fs
    .readdirSync("./stealth_db/")
    .filter((file) => file.startsWith("database") && file.endsWith(".db"));
  console.log("Files found", files);
  let idFix = 0;
  for (const file of files) {
    const version = file
      .replace("database-", "")
      .replace("database", "")
      .replace(".db", "");

    console.log("Migrating", version);
    await setMessageVersion(version);
    dbMsg = await dbPromise();

    const dbMsgNew = await dbPromiseNww("db");

    await dbMsgNew.exec(`CREATE TABLE IF NOT EXISTS threads (
      friendlyName TEXT,
      key TEXT PRIMARY KEY,
      timestamp TEXT,
      timestampLastUpdate TEXT
    )`);

    await dbMsgNew.exec(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content LONGTEXT,
      role TEXT,
      timestamp TEXT,
      threadId TEXT,
      FOREIGN KEY (threadId) REFERENCES threads(key)
    )`);



    try {
      const threads = await dbVer.all("SELECT * FROM threads");
      for (const thread of threads) {
        const threadKey = thread.key;
        console.log(
          "Updating threadId column in messages for thread",
          threadKey
        );
        await dbMsg.run(`UPDATE messages SET threadId = ?`, threadKey);
        console.log(
          "Updating threadId column in messages for thread",
          threadKey
        );
      }
      console.log("threadId column updated in messages");
    } catch (err) {
      console.error("Error updating threadId column in messages", err);
    }



 

      console.log("messages table migrated to include threadId as FK");

      
    try {
      const threads = await dbVer.all("SELECT * FROM threads");
      for (const thread of threads) {
        try {
          await dbMsgNew.run(
            `INSERT INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)`,
            thread.key,
            thread.friendlyName,
            thread.timestamp,
            thread.timestampLastUpdate
          );

          console.log("INSERT INTO threads", thread.key, thread.friendlyName, thread.timestamp, thread.timestampLastUpdate);

          const selectThreads = await dbMsgNew.all("SELECT * FROM threads");
          console.log("SELECT threads", selectThreads);
        } catch (err) {
          console.error("Error inserting thread", err);
        }
      }
    } catch (err) {
      console.error("Error fetching threads", err);
    }


    const messages = await dbMsg.all("SELECT * FROM messages");
    for (const message of messages) {
      idFix++;
      await dbMsgNew.run(
        `INSERT INTO messages (id, content, role, timestamp, threadId) VALUES (?, ?, ?, ?, ?)`,
        idFix,
        message.content,
        message.role,
        message.timestamp,
        message.threadId
      );
    }

    const fileStats = fs.statSync("./stealth_db/" + file);
    const creationDate = fileStats.birthtime.toISOString();
    await dbVer.run(
      "INSERT OR IGNORE INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)",
      version,
      "Migrated legacy thread v." + version,
      creationDate,
      creationDate
    );
    //copy the file to the new location
    console.log("Copying file", file);
    setTimeout(() => {
      try {
        fs.unlinkSync("./stealth_db/" + file);
      } catch (err) {
        console.log("Error deleting file", err);
      }
    }, 3000);
    console.log("Migrated", version, creationDate);
  }
  //Add fiendlyName column to versions table only if it doesn't exist
  try {
    await dbVer.exec(`ALTER TABLE versions ADD COLUMN friendlyName TEXT`);
    console.log("Column added");
  } catch (err) {
    console.log("Column already exists");
  }
  */
};

await initDb();
