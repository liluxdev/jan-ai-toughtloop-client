import { dbVersions, getMessagesVersion } from "./db.js";
import { broadcast } from "./websockets.js";

export const formatMessage = (content, role, chunk = false, timestamp = new Date().toISOString) => {
    if (chunk) {
      return JSON.stringify({ content, role, chunk, timestamp });
    } else {
      return JSON.stringify({ content, role, chunk: undefined, timestamp});
    }
  };
  
  export const sendJsonMessage = async (content, role, chunk = false, clientId=undefined, timestamp=new Date().toISOString()) => {
    console.log("Sending message to all clients: ", content, role, chunk);
    const jsonString = formatMessage(content, role, chunk, timestamp);
    //ws.send(jsonString);
    broadcast(jsonString, clientId);
    updateThread(content);
    //autocreateThread(content);
  };

  export const updateThread = async (content) => {
    try{
    const dbVer = await dbVersions;
    const timestampLastUpdate = new Date().toISOString();
    const version = getMessagesVersion();
    if (content.recentMessages){
      return;
    }
    // SQLite insert or update
    await dbVer.run(
      `UPDATE threads SET timestampLastUpdate = ? WHERE key = ?`,
      timestampLastUpdate,
      version
    );
    }catch(e){
      console.error("Error updating thread", e);
    }
  }

  export const autocreateThread = async (content) => {
    const dbVer = await dbVersions;
    const timestampLastUpdate = new Date().toISOString();
    const version = getMessagesVersion();
    if (content.recentMessages){
      try{
      content = content.recentMessages[0].content;
      }catch(e){
        console.error("Error parsing recentMessages", e);
        content = "thread-"+ version;
      }
    }
    const friendlyName = content.length > 55 ? content.substring(0, 55) + '...' : content;
    // SQLite insert or update
    await dbVer.run(
      `INSERT INTO threads (key, friendlyName, timestamp, timestampLastUpdate) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET timestampLastUpdate = excluded.timestampLastUpdate`,
      version,
      friendlyName,
      timestampLastUpdate,
      timestampLastUpdate
    );
  }
  