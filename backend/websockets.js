import Router from "koa-router";
import { dbPromise, dbPromiseMemory, dbPromisePrompts } from "./db.js";
import { invokeApi, setRecentMessages } from "./api.js";
import { formatMessage, sendJsonMessage } from "./utils.js";
import { clearToughtloopInterval, setToughtloopInterval } from "../index.js";
import { NUMBER_OF_MESSAGES_IN_BUFFER } from "./constants.js";

export const OMISSIS_LIMIT = 99999;

let wsClients = [];
// Funzione per inviare un messaggio a tutti i client connessi
export const broadcast = (message, clientId = null) => {
  wsClients.forEach((client) => {
    if (
      client.ctx.websocket.readyState === 1 &&
      (clientId === null || clientId === client.id)
    ) {
      // 1 significa che la connessione è aperta
      console.log(
        "Sending message " + message + " to client",
        client.id + " connected at " + client.timestamp
      );
      client.ctx.websocket.send(message);
    }
  });
};

export const wsRouter = new Router();

export const pushRecentMessages = async (clientId, onlyRam = false) => {
  console.log("Pushing recent messages..");
  const db = await dbPromise();
  const recentMessages = await db.all(`
  SELECT content, role, timestamp FROM messages WHERE role != 'system_memory' AND role != 'toughtloop'  AND role != 'system_session_start' AND role != 'system'
  ORDER BY timestamp DESC
  LIMIT ${parseInt(NUMBER_OF_MESSAGES_IN_BUFFER * 3.27)}
`);

  console.log("Retrived recent messages: " + recentMessages.length);

  const recentMessagesToPush = [];

  for (const message of recentMessages.reverse()) {
    let content = message.content;
    if (typeof content === "string") {
      if (content.length > OMISSIS_LIMIT) {
        content =
          content.slice(0, OMISSIS_LIMIT) +
          "...omissis at (" +
          OMISSIS_LIMIT +
          ")..";
      }

      setRecentMessages(content, message.role);
      recentMessagesToPush.push({
        content,
        role: message.role,
        timestamp: message.timestamp,
      });
      console.log("Pushing recent message..");
    } else {
      console.log("Content is null");
    }
  }
  if (onlyRam) {
    return;
  }
  sendJsonMessage({ recentMessages: recentMessagesToPush }, "recent", clientId);
};

wsRouter.all("/ws", async (ctx) => {
  try {
    const clientId =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 15) +
      "-" +
      Math.random().toString(36).substring(2, 15);
    wsClients.push({
      ctx: ctx,
      timestamp: new Date().toISOString(),
      id: clientId,
    });
    console.log("WebSocket messages connection established, client id: " + clientId);

    ctx.websocket.on("message", async (message) => {
      let receivedMessage = message.toString();
      try {
        receivedMessage = JSON.parse(receivedMessage.trim());
      } catch (noJson) {
        console.log("Message is not JSON");
        console.log("Received message: ", receivedMessage);
        console.log("Sending message to all clients: ", receivedMessage, "user");
        sendJsonMessage(receivedMessage, "user", false, undefined, new Date().toISOString());
        await invokeApi(receivedMessage);
        return;
      }
      console.log("Received JSON message: ", receivedMessage);
      if (receivedMessage.requestedAction === "getRecentMessages") {
        console.log("ACTION: Requested recent messages");
        await pushRecentMessages(clientId);
        return;
      }
    });

    ctx.websocket.on("close", () => {
      const client = wsClients.find((client) => client.ctx === ctx);
      if (client) {
        wsClients = wsClients.filter((client) => client.ctx !== ctx);
        console.log("Message WebSocket connection closed");
      }
      //wsClients = wsClients.filter((client) => client.ctx !== ctx);
      console.log(
        "Message WebSocket connection closed" +
          client.id +
          " connected at " +
          client.timestamp
      );
    });
  } catch (e) {
    console.log("Error in wsRouter: " + e);
    console.trace("Stacktrace", e);
  }
});

const startSession = async () => {
  //const dbMem = await dbPromiseMemory;
  //const dbPrompt = await dbPromisePrompts;
  const db = await dbPromise();
  const timestamp = new Date().toISOString();
  await db.run(
    "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
    "Session started: " + timestamp,
    "system_session_start",
    timestamp
  );

  console.log("Session started");
  setToughtloopInterval(333);
};
startSession();
