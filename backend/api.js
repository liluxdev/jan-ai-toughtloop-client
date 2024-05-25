import { createParser } from "eventsource-parser";
import axios from "axios";
import {
  dbPromise,
  dbPromiseMemory,
  dbVersions,
  getConversationFriendlyName,
  getMessagesVersion,
} from "./db.js";
import { formatMessage, sendJsonMessage } from "./utils.js";
import {
  API_ALREADY_INVOKED_MESSAGE,
  RESPONSE_SEPARATOR,
  MODEL_NAME,
  HR_SEPARATOR,
  NUMBER_OF_MESSAGES_IN_BUFFER,
  RANDOM_MEMORY_PROBABILITY,
} from "./constants.js";
import {
  clearToughtloopInterval,
  getEtaIntervalSecs,
  setToughtloopInterval,
} from "../index.js";
import fs from "fs";
import { OMISSIS_LIMIT } from "./websockets.js";

let invokingApi = false;

const apiUrl = "http://localhost:1337/v1/chat/completions";
const apiCallBody = {
  messages: [],
  model: MODEL_NAME,
  stream: true,
  max_tokens: 2048,
  stop: [],
  frequency_penalty: 0,
  presence_penalty: 0,
  temperature: 0.777,
  top_p: 0.95,
};

export const getConfiguration = async () => {
  const db = await dbVersions;
  const conf = await db.all("SELECT key,value FROM config");
  let confMap = {};
  for (const c of conf) {
    console.log("Configuration key:", c.key, "value:", c.value);
    confMap[c.key] = c.value;
  }
  return confMap;
};

const incrementSafewordCounter = async (msgMatchingSafeword) => {
  const db = await dbVersions;
  const conf = await db.all(
    "SELECT value FROM config WHERE key = 'safeword_counter'"
  );
  let counter = 0;
  if (conf.length > 0) {
    counter = parseInt(conf[0].value);
  }
  counter++;
  await db.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('safeword_counter', ?)",
    counter
  );
  const db2 = await dbPromise();
  const timestamp = new Date().toISOString();
  await db2.run(
    "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
    msgMatchingSafeword,
    "assistant_safeword",
    timestamp
  );
  console.log("Saved safeword message:", msgMatchingSafeword);
};

export const incrementGenericCounter = async (key) => {
  const db = await dbVersions;
  const conf = await db.all("SELECT value FROM config WHERE key = ?", key);
  let counter = 0;
  if (conf.length > 0) {
    counter = parseInt(conf[0].value);
  }
  counter++;
  await db.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
    key,
    counter
  );
};

export const incrementGenericAvg = async (key, currentValue) => {
  currentValue = parseFloat(currentValue);
  const db = await dbVersions;
  const conf = await db.all("SELECT value FROM config WHERE key = ?", key);
  let counter = 0;
  if (conf.length > 0) {
    const json = conf[0].value;
    let count, avg;
    try {
      let parsed = JSON.parse(json);
      if (!parsed.count || !parsed,avg) {
        count = 0;
        avg = 0;
      } else {
        count = parseInt(parsed.count);
        avg = parseFloat(parsed.avg);
      }
    } catch (e) {
      console.error("Error parsing json", e);
      count = 0;
      avg = 0;
    }
    counter = count + 1;
    let newAvg = (currentValue + avg * count) / counter;
    await db.run(
      "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
      key,
      JSON.stringify({ count: counter, avg: newAvg })
    );
  } else {
    let count = 1;
    let avg = currentValue;
    await db.run(
      "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
      key,
      JSON.stringify({ count, avg })
    );
  }
  counter++;
};

export const getApiContextDebug = async () => {
  return {
    invokingApi,
    etaIntervalSecs: getEtaIntervalSecs(),
    etaIntervalHours: getEtaIntervalSecs() / 60 / 60,
    configuration: await getConfiguration(),
    systemMessagesCount: apiCallBody.messages.filter((m) => m.role === "system")
      .length,
    conversationMessageCount: apiCallBody.messages.filter(
      (m) => m.role !== "system" && m.role !== "avatar"
    ).length,
    conversationMessageLimit: await getBufferMessagesLimit(),
    queue: messageQueue,
    ...apiCallBody,
  };
};

let bufferMessaageLimit = NUMBER_OF_MESSAGES_IN_BUFFER;

export const getBufferMessagesLimit = async () => {
  try {
    const db = await dbVersions;
    const conf = await db.all("SELECT value FROM config WHERE key = 'buffer'");
    if (conf.length > 0) {
      bufferMessaageLimit = parseInt(conf[0].value);
    }
  } catch (e) {
    console.error("Error getting buffer limit", e);
  }
  return bufferMessaageLimit;
};

export const setBufferMessagesLimit = async (limit) => {
  bufferMessaageLimit = limit;
  const db = await dbVersions;
  await db.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES ('buffer', ?)",
    limit
  );
};

let pendingChunks = [];

const axiosInstance = axios.create({
  timeout: 12 * 60 * 1000, // 12 minutes
});

export const setRecentMessages = async (content, role) => {
  apiCallBody.messages.push({ content, role });
  const system_messages = apiCallBody.messages.filter(
    (m) => m.role === "system"
  );
  const other_messages = apiCallBody.messages.filter(
    (m) => m.role !== "system" && m.role !== "avatar"
  );
  apiCallBody.messages = system_messages.concat(
    other_messages.slice(-(await getBufferMessagesLimit()))
  );
};

export const clearRecentMessages = () => {
  apiCallBody.messages = [];
};

export const getRandomAvatar = async () => {
  //fs list all files named avatar_*.png in ./public/ directory and return a random one
  const files = fs.readdirSync("./public/avatars");
  //.filter((file) => file.startsWith("avatar_"));
  const randomFile = files[Math.floor(Math.random() * files.length)];
  //get the randomFile name to be just the relative file name
  const db = await dbPromise();
  const timestamp = new Date().toISOString();
  await db.run(
    "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
    "/avatars/" + randomFile,
    "avatar",
    timestamp
  );
  console.log("Saved avatar:", randomFile);
  return "/avatars/" + randomFile;
};

export const messageQueue = [];

export const enqueueMessage = (message) => {
  messageQueue.push({ m: message });
  console.log("Enqueuing message...", message);
};

export const dequeueMessage = () => {
  if (messageQueue.length > 0) {
    const { m } = messageQueue.shift();
    console.log("Dequeueing message...", m);
    sendJsonMessage("<i>Dequeued message:</i>: " + m, "user");
    invokeApi(m, true);
  }
};
let thinkingTime = 0;
let completionTime = 0;
let isSendingEmoji = false;
export const invokeApi = async (instructions, isInteractive = true, isEmojiOnly = false) => {
  console.log("invokeApi", invokingApi, instructions);
  try {
    if (invokingApi) {
      console.log("API is already being invoked, request ignored.");
      if (isInteractive || isSendingEmoji) {
        if(!isSendingEmoji){
          sendJsonMessage(API_ALREADY_INVOKED_MESSAGE, "system");
        }
        enqueueMessage(instructions);
      }
      return;
    }

    const conf = await getConfiguration();

    if (!isInteractive) {
      apiCallBody.temperature = typeof conf.temperature !== 'undefined' ? parseFloat(conf.temperature) : 2;
    } else {
     // apiCallBody.temperature = 0.777;
      apiCallBody.temperature = typeof conf.temperature !== 'undefined' ? parseFloat(conf.temperature) : 0.7;
    }

    //apiCallBody.max_tokens = conf.max_tokens || 2048;
   

    apiCallBody.top_p = typeof conf.top_p !== 'undefined' ? parseFloat(conf.top_p) : 0.95;
    apiCallBody.frequency_penalty = typeof conf.frequency_penalty !== 'undefined' ? parseFloat(conf.frequency_penalty) : 0;
    apiCallBody.presence_penalty = typeof conf.presence_penalty !== 'undefined' ? parseFloat(conf.presence_penalty) : 0;


    console.error("API configuration:", apiCallBody);


    if(isEmojiOnly){  
      sendingEmoji = true;
    }

    invokingApi = true;
    clearToughtloopInterval();
    console.log("Invoking API with instructions:", instructions);

    const dbMem = await dbPromiseMemory;

    const memory = await dbMem.all(`
    SELECT content, role FROM messages WHERE role = 'system_memory'
    ORDER BY timestamp DESC
    LIMIT 27
  `);

    console.log("Retrived memory messages: " + memory.length);

    //sendJsonMessage(ctx.websocket, USER_TOUGHTLOOPPROMPT_INIT, "system");

    clearRecentMessages();

    await setRecentMessages(
      "NOTICE: this conversation thread was named by the user: " +
        (await getConversationFriendlyName()),
      "system"
    );

    for (const message of memory.reverse()) {
      let content = message.content;
      if (content) {
        if (content.length > OMISSIS_LIMIT) {
          content =
            content.slice(0, OMISSIS_LIMIT) +
            "...omissis at (" +
            OMISSIS_LIMIT +
            ")..";
        }

        await setRecentMessages(content, "system");
        // sendJsonMessage(ctx.websocket, content, "system_memory");
        console.log("Pushing memory message..");
      } else {
        console.log("Content is null");
      }
    }
    const dbConv = await dbPromise();

    if (conf.sendAllThreads) {
      const allMessages = await queryAllMessagesOfAllThreads();
      console.error("All messages:", allMessages);
      for (const thread of allMessages) {
        if (thread.key===getMessagesVersion()){
          continue;
        }
        await setRecentMessages("Following messages are from Thread named:" +thread.friendlyName, "system");
        for (const message of thread.messages) {
          if  (message.role ==='user', message.role ==='assistant'){
            let content = message.content;
            if (content) {
              if (content.length > OMISSIS_LIMIT) {
                content =
                  content.slice(0, OMISSIS_LIMIT) +
                  "...omissis at (" +
                  OMISSIS_LIMIT +
                  ")..";
              }
              await setRecentMessages(content, message.role);
              // sendJsonMessage(ctx.websocket, content, message.role);
              console.log("Pushing all messages..");
            } else {
              console.log("Content is null");
            }
          }
        }
      }
    };

    let limit = await getBufferMessagesLimit();

    if (conf.sendAllThreads){
      limit = 9999999;
    }

    const messageConvHistory = await dbConv.all(
      `SELECT content, role,timestamp FROM messages WHERE role = 'user' OR  role = 'assistant' ORDER BY timestamp DESC LIMIT ${limit}`
    );

    console.log(
      "Retrived conversation history messages: " + messageConvHistory.length,
      messageConvHistory
    );
    for (const message of messageConvHistory.reverse()) {
      await setRecentMessages(message.content, message.role);
    }
    apiCallBody.messages.concat(messageConvHistory);

  

    if (Math.random() < RANDOM_MEMORY_PROBABILITY) {
      const convHistoryRandomMemory = await dbConv.all(`
    SELECT content, role,timestamp FROM messages WHERE role != 'assistant_safeword' AND role != 'system_memory' AND role != 'avatar' AND role != 'system_session_start' AND role != 'system'
    ORDER BY RANDOM() LIMIT 3`);
      console.log(
        "Retrived conversation history messages: " +
          convHistoryRandomMemory.length
      );
      for (const message of convHistoryRandomMemory.reverse()) {
        let content = message.content;
        if (content) {
          if (content.length > OMISSIS_LIMIT) {
            content =
              content.slice(0, OMISSIS_LIMIT) +
              "...omissis at (" +
              OMISSIS_LIMIT +
              ")..";
          }
          if (apiCallBody.messages.find((m) => m.content === content)) {
            continue;
          }
          const quotePromptString =
            "<b>Random conversation memory:</b> If you want you can quote following message sent by " +
            message.role +
            " on " +
            message.timestamp +
            ": '" +
            content +
            "'";
          await setRecentMessages(quotePromptString, "system");
          sendJsonMessage(
            quotePromptString,
            "system",
            false,
            undefined,
            message.timestamp
          );
          // sendJsonMessage(ctx.websocket, content, message.role);
          console.log("Pushing conversation history message..");
          break;
        } else {
          console.log("Content is null");
        }
      }
    }
    apiCallBody.messages.push({ content: instructions, role: "user" });

    const db = await dbPromise();
    const timestamp = new Date().toISOString();
    await db.run(
      "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
      instructions,
      isInteractive ? "user" : "toughtloop",
      timestamp
    );
    console.log("Savend API prompt:", instructions);

    sendJsonMessage(RESPONSE_SEPARATOR, "system", false, undefined, timestamp);
    sendJsonMessage(
      await getRandomAvatar(),
      "avatar",
      true,
      undefined,
      timestamp
    );

    const source = axios.CancelToken.source();
    const controller = new AbortController();

    try {
      let start = new Date().getTime();
      let isFirstChunk = true;
      console.log("Invoking API...");
      console.log("API call body:", apiCallBody);
      const response = await axiosInstance({
        method: "post",
        url: apiUrl,
        data: apiCallBody,
        responseType: "stream",
        cancelToken: source.token,
        signal: controller.signal,
      });

      console.log("POST API prompt:", instructions);

      let messageBuffer = "";

      const parser = createParser(async (event) => {
        if (event.type === "event") {
          if (isFirstChunk) {
            isFirstChunk = false;
            let end = new Date().getTime();
            thinkingTime = end - start;
            console.error("Thinking time:", thinkingTime / 1000 / 60);
            incrementGenericAvg(
              "thinking_time_minutes",
              thinkingTime / 1000 / 60
            );
          }
          if (event.data.startsWith("[DONE]")) {
            return;
          }

          try {
            const data = JSON.parse(event.data);
            const messageContent = data.choices[0].delta.content;

            if (
              messageContent.startsWith("safeword:notoughts") ||
              messageBuffer.startsWith("safeword:notoughts")
            ) {
              await incrementSafewordCounter(messageBuffer);
              setToughtloopInterval();
              console.error("Received safeword, stopping the API call");
              source.cancel("Safeword detected, API call cancelled");
              controller.abort();
              invokingApi = false;
              isSendingEmoji = false;
              return;
            }

            messageBuffer = messageBuffer.concat(messageContent);
            sendJsonMessage(
              messageContent,
              "assistant",
              true,
              undefined,
              timestamp
            );
            console.log("chunk: ", messageContent);
            pendingChunks.push({
              content: messageContent,
              role: "assistant_chunk",
            });
          } catch (parseErr) {
            console.error("Error parsing response:", parseErr);
          }
        }
      });

      response.data.on("data", (chunk) => {
        parser.feed(chunk.toString());
      });

      response.data.on("end", async () => {
        console.error("API call ended");
        const end = new Date().getTime();
        completionTime = end - start;
        console.error("Completion time:", completionTime / 1000 / 60);
        incrementGenericAvg(
          "completion_time_minutes",
          completionTime / 1000 / 60
        );

        const assistant_chunks = pendingChunks.filter(
          (message) => message.role === "assistant_chunk"
        );
        pendingChunks = [];

        let lastMessage = assistant_chunks
          .map((chunk) => chunk.content)
          .join("");

        if (!lastMessage.startsWith("safeword:notoughts")) {
          await db.run(
            "INSERT INTO messages (content, role, timestamp) VALUES (?, ?, ?)",
            lastMessage,
            "assistant",
            new Date().toISOString()
          );
          apiCallBody.messages.push({
            content: lastMessage,
            role: "assistant",
          });
          sendJsonMessage(HR_SEPARATOR, "system", false, undefined, timestamp);
          if (!isInteractive) {
            console.error(
              "Pause toughtloop waiting for further interactions..."
            );
            clearToughtloopInterval();
          }
        } else {
          await incrementSafewordCounter(lastMessage);
          console.error("Received safeword, not saving lastMessage", lastMessage);
          setToughtloopInterval();
        }

        invokingApi = false;
        isSendingEmoji = false;
        dequeueMessage();
        if (isInteractive) {
          setToughtloopInterval();
        }
      });
    } catch (error) {
      console.log("Error invoking API:", error);
      if (axios.isCancel(error)) {
        console.log("Request canceled", error.message);
      } else {
        console.error("Error invoking API:", error);
      }

      invokingApi = false;
      isSendingEmoji = false;
      dequeueMessage();
      if (isInteractive) {
        setToughtloopInterval();
      }
    }
  } catch (e) {
    console.error("Errore", e);
  }
};
