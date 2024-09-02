import { createParser } from "eventsource-parser";
import axios from "axios";
import {
  dbPromise,
  dbPromiseMemory,
  dbVersions,
  getConversationFriendlyName,
  getCurrentThread,
  getMessagesVersion,
  queryAllMessagesOfAllThreads,
  queryAllMessagesOfAllThreadsOrderByTimpestampAndJoin,
} from "./db.js";
import { formatMessage, sendJsonMessage } from "./utils.js";
import {
  API_ALREADY_INVOKED_MESSAGE,
  RESPONSE_SEPARATOR,
  MODEL_NAME,
  HR_SEPARATOR,
  NUMBER_OF_MESSAGES_IN_BUFFER,
  RANDOM_MEMORY_PROBABILITY,
  REMBEMBER_ALL_THREADS_IN_MESSAGES_ORDER,
  API_BASE_URI,
  SAFEWORD_STOPWORD,
} from "./constants.js";
import {
  clearToughtloopInterval,
  getEtaIntervalSecs,
  setToughtloopInterval,
} from "../index.js";
import fs from "fs";
import { OMISSIS_LIMIT } from "./websockets.js";

let invokingApi = false;

const apiUrl = API_BASE_URI + "/v1/";
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
  const confMap = await getConfiguration();
  await db2.run(
    "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
    msgMatchingSafeword,
    "assistant_safeword",
    timestamp,
    confMap.model || MODEL_NAME,
    getCurrentThread()
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

export const settGenericStatValue = async (key, value) => {
  const db = await dbVersions;
  await db.run(
    "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
    key,
    value
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
      if ((!parsed.count || !parsed, avg)) {
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
    messages: ["messages hidden"],
    system: apiCallBody.messages.filter((m) => m.role === "system"),
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
  timeout: 666 * 60 * 1000, // 666 minutes
});

export const cleanRecentMessages = async () => {
  console.error("Messages cleaned (BEFORE)", apiCallBody.messages.length);
  const limit = await getBufferMessagesLimit();
  const conf = await getConfiguration();

  const LIMIT = await getBufferMessagesLimit();
  if (LIMIT === 0) {
  } else {
    let i = 0;
    const systemMessages = apiCallBody.messages.filter(
      (m) => m.role === "system"
    );
    while (
      apiCallBody.messages.length > LIMIT + systemMessages.length &&
      i < apiCallBody.messages.length
    ) {
      console.log(
        "Messages limit reached, cleaning oldest messages",
        apiCallBody.messages.length,
        LIMIT
      );
      const msg = apiCallBody.messages[i];
      if (msg?.role === "system") {
        i++;
        console.error("Skipping system message");
        continue;
      } else {
        apiCallBody.messages.splice(i, 1);
      }
    }
  }

  if (conf?.onlyUser === "1") {
    console.error("Only user messages enabled");
    console.error("Messages before filter", apiCallBody.messages.length);
    apiCallBody.messages.push({
      content:
        "NOTICE: Only user messages are sent in this conversation history, please focus on my all previous requests and respond adeguately",
      role: "system",
    });
    apiCallBody.messages = apiCallBody.messages.filter(
      (m) => m.role === "user" || m.role === "system"
    );
    console.error("Messages after filter", apiCallBody.messages.length);
  }
  console.error("Messages cleaned", apiCallBody.messages.length);
};

export const pushRecentMessageInAPIBody = async (content, role) => {
  apiCallBody.messages.push({ content, role });
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
  const confMap = await getConfiguration();
  await db.run(
    "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
    "/avatars/" + randomFile,
    "avatar",
    timestamp,
    confMap.model || MODEL_NAME,
    getCurrentThread()
  );
  console.log("Saved avatar:", randomFile);
  return "/avatars/" + randomFile;
};

export const messageQueue = [];

export const enqueueMessage = (message) => {
  messageQueue.push({ m: message });
  console.log("Enqueuing message...", message);
};

export const getModel = async () => {
  const conf = await getConfiguration();
  return conf.model || MODEL_NAME;
};

export const dequeueMessage = async () => {
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
let assistantManualTurn = false;
export const invokeApi = async (
  instructions,
  isInteractive = true,
  isEmojiOnly = false
) => {
  console.log("invokeApi", invokingApi, instructions);
  const db = await dbPromise();

  try {
    const conf = await getConfiguration();
    if (conf.manualChannelingMode == "1") {
      const timestampManual = new Date().toISOString();
      await db.run(
        "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
        isInteractive
          ? instructions
          : "<i>toughtloop prompt:</i> " + instructions,
        assistantManualTurn ? "assistant" : "user", //"toughtloop",
        timestampManual,
        "manual-channelling-chat",
        getCurrentThread()
      );

      sendJsonMessage(
        instructions,
        assistantManualTurn ? "assistant" : "user",
        false,
        undefined,
        timestampManual
      );

      if (!assistantManualTurn) {
        sendJsonMessage(
          "Turn to channeling response...",
          "system",
          false,
          undefined,
          timestampManual
        );

        sendJsonMessage(
          await getRandomAvatar(),
          "avatar",
          true,
          undefined,
          timestampManual,
          "math.random"
        );
      }
      assistantManualTurn = !assistantManualTurn;
      return;
    }
    if (invokingApi) {
      console.log("API is already being invoked, request ignored.");
      if (isInteractive || isSendingEmoji) {
        if (!isSendingEmoji) {
          sendJsonMessage(API_ALREADY_INVOKED_MESSAGE, "system");
        }
        enqueueMessage(instructions);
      }
      return;
    }


    const model = conf.model || MODEL_NAME;
    apiCallBody.model = model;

    if (!isInteractive) {
      apiCallBody.temperature =
        typeof conf.temperature !== "undefined"
          ? parseFloat(conf.temperature)
          : 2;
    } else {
      // apiCallBody.temperature = 0.777;
      apiCallBody.temperature =
        typeof conf.temperature !== "undefined"
          ? parseFloat(conf.temperature)
          : 0.7;
    }

    //apiCallBody.max_tokens = conf.max_tokens || 2048;

    apiCallBody.top_p =
      typeof conf.top_p !== "undefined" ? parseFloat(conf.top_p) : 0.95;
    apiCallBody.frequency_penalty =
      typeof conf.frequency_penalty !== "undefined"
        ? parseFloat(conf.frequency_penalty)
        : 0;
    apiCallBody.presence_penalty =
      typeof conf.presence_penalty !== "undefined"
        ? parseFloat(conf.presence_penalty)
        : 0;

    console.log("API configuration:", apiCallBody);

    if (isEmojiOnly) {
      sendingEmoji = true;
    }

    invokingApi = true;
    clearToughtloopInterval();
    console.log("Invoking API with instructions:", instructions);

    const dbMem = await dbPromiseMemory;

    const memory = await dbMem.all(`
    SELECT content, role FROM messages WHERE role = 'system_memory' AND profile = ?
    ORDER BY timestamp DESC
  `, conf.profile || "default");

    console.log("Retrived memory messages: " + memory.length);

    //sendJsonMessage(ctx.websocket, USER_TOUGHTLOOPPROMPT_INIT, "system");

    clearRecentMessages();

    await pushRecentMessageInAPIBody(
      'NOTICE: this conversation thread was named by the user: "' +
        (await getConversationFriendlyName()) +
        '"',
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

        await pushRecentMessageInAPIBody(content, "system");
        // sendJsonMessage(ctx.websocket, content, "system_memory");
        console.log("Pushing memory message..");
      } else {
        console.log("Content is null");
      }
    }
    const dbConv = await dbPromise();

    if (conf?.sendAllThreads === "1") {
      console.error("Sending all threads messages");
      let currentThreadName = "";

      if (REMBEMBER_ALL_THREADS_IN_MESSAGES_ORDER) {
        const allMsgs =
          await queryAllMessagesOfAllThreadsOrderByTimpestampAndJoin();
        console.log("All messages:", allMsgs);
        for (const m of allMsgs) {
          if (m.threadId === getCurrentThread()) {
            currentThreadName = m.threadFriendlyName;
            continue;
          }

          if (m.threadFriendlyName !== currentThreadName) {
            await pushRecentMessageInAPIBody(
              'NOTICE: Following messages are loaded from a previous Thread we saved for your usage in this conversation, the previous thread in question is named: "' +
                m.threadFriendlyName +
                '"',
              "system"
            );
          }
          currentThreadName = m.threadFriendlyName;

          if (m.role === "user" || m.role === "assistant") {
            let content = m.content;
            if (content) {
              if (content.length > OMISSIS_LIMIT) {
                content =
                  content.slice(0, OMISSIS_LIMIT) +
                  "...omissis at (" +
                  OMISSIS_LIMIT +
                  ")..";
              }
              await pushRecentMessageInAPIBody(content, m.role);
              // sendJsonMessage(ctx.websocket, content, message.role);
            } else {
              console.log("Content is null");
            }
          }
        }
      } else {
        const allMessages = await queryAllMessagesOfAllThreads();
        console.log("All messages:", allMessages);
        for (const t of allMessages) {
          console.log("Thread:", t);
          if (t.thread.key === getCurrentThread()) {
            currentThreadName = t.thread.friendlyName;
            continue;
          }
          await pushRecentMessageInAPIBody(
            'NOTICE: Following messages are loaded from a previous Thread we saved for your usage in this conversation, the previous thread in question is named: "' +
              t.thread.friendlyName +
              '"',
            "system"
          );
          for (const message of t.messages) {
            if (message.role === "user" || message.role === "assistant") {
              let content = message.content;
              if (content) {
                if (content.length > OMISSIS_LIMIT) {
                  content =
                    content.slice(0, OMISSIS_LIMIT) +
                    "...omissis at (" +
                    OMISSIS_LIMIT +
                    ")..";
                }
                await pushRecentMessageInAPIBody(content, message.role);
                // sendJsonMessage(ctx.websocket, content, message.role);
              } else {
                console.log("Content is null");
              }
            }
          }
        }
      }
      console.error(
        "All threads messages prepared for API",
        apiCallBody.messages.length
      );
      pushRecentMessageInAPIBody(
        'NOTICE: Following messages are from the current Thread named: "' +
          currentThreadName +
          '"',
        "system"
      );
    }

    let limit = await getBufferMessagesLimit();

    if (limit === 0) {
      limit = 9999999;
    }

    if (conf?.sendAllThreads === "1") {
      limit = 9999999;
    }

    const messageConvHistory = await dbConv.all(
      `SELECT content, role,timestamp FROM messages WHERE (role = 'user' OR  role = 'assistant') AND threadId = '${getCurrentThread()}' ORDER BY timestamp DESC LIMIT ${limit}`
    );

    console.error(
      "Retrived conversation history messages: " + messageConvHistory.length
      //messageConvHistory
    );
    for (const message of messageConvHistory.reverse()) {
      await pushRecentMessageInAPIBody(message.content, message.role);
    }
    apiCallBody.messages.concat(messageConvHistory);

    if (Math.random() < RANDOM_MEMORY_PROBABILITY) {
      const convHistoryRandomMemory = await dbConv.all(`
    SELECT content, role,timestamp FROM messages WHERE role != 'assistant_safeword' AND threadId = '${getCurrentThread()}' AND role != 'system_memory' AND role != 'avatar' AND role != 'system_session_start' AND role != 'system'
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
          await pushRecentMessageInAPIBody(quotePromptString, "system");
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
    await cleanRecentMessages();

    const timestamp = new Date().toISOString();
    const confMap = await getConfiguration();
    await db.run(
      "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
      isInteractive
        ? instructions
        : "<i>toughtloop prompt:</i> " + instructions,
      isInteractive ? "user" : "user", //"toughtloop",
      timestamp,
      conf.model || MODEL_NAME,
      getCurrentThread()
    );
    console.log("Savend API prompt:", instructions);

    sendJsonMessage(RESPONSE_SEPARATOR, "system", false, undefined, timestamp);
    sendJsonMessage(
      await getRandomAvatar(),
      "avatar",
      true,
      undefined,
      timestamp,
      "math.random"
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
        url: apiUrl + "chat/completions",
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
            settGenericStatValue(
              "thinking_time_last_mins",
              thinkingTime / 1000 / 60
            );
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
              messageContent.startsWith(SAFEWORD_STOPWORD) ||
              messageBuffer.startsWith(SAFEWORD_STOPWORD)
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
              timestamp,
              await getModel()
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
        assistantManualTurn = false;
        const end = new Date().getTime();
        completionTime = end - start;
        console.error("Completion time:", completionTime / 1000 / 60);
        settGenericStatValue(
          "completion_time_last_mins",
          completionTime / 1000 / 60
        );
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

        if (!lastMessage.startsWith(SAFEWORD_STOPWORD)) {
          const confMap = await getConfiguration();
          await db.run(
            "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
            lastMessage,
            "assistant",
            new Date().toISOString(),
            confMap.model || MODEL_NAME,
            getCurrentThread()
          );
          apiCallBody.messages.push({
            content: lastMessage,
            role: "assistant",
          });
          // doSpeak(lastMessage);
          sendJsonMessage(HR_SEPARATOR, "system", false, undefined, timestamp);
          if (!isInteractive) {
            console.error(
              "Pause toughtloop waiting for further interactions..."
            );
            clearToughtloopInterval();
          }
        } else {
          await incrementSafewordCounter(lastMessage);
          console.error(
            "Received safeword, not saving lastMessage",
            lastMessage
          );
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
        console.error("Error invoking API:", error.message);
        console.log("Error invoking API:", error);
        sendJsonMessage(
          "Error invoking API: " + error.message,
          "system",
          false,
          undefined,
          timestamp
        );
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

export const doSpeak = async (textToSpeach) => {
  const conf = await getConfiguration();
  const db = await dbPromise();
  const timestamp = new Date().toISOString();
  let message = textToSpeach;
  say.speak(textToSpeach, "it", 1.0, (err) => {
    if (err) {
      console.error("Error:", err);
      ctx.status = 500;
      ctx.body = "Error in text-to-speech conversion";
    } else {
      const responseAudioPath = path.join(
        __dirname,
        "public/responses",
        "response.ogg"
      );
      // Aggiungi il codice per salvare l'audio generato se necessario
      //ctx.body = { transcript: result, responseAudio: responseAudioPath };
    }
  });
  db.run(
    "INSERT INTO messages (content, role, timestamp, model, threadId) VALUES (?, ?, ?, ?, ?)",
    message,
    "assistant_speak",
    timestamp,
    conf.model || MODEL_NAME,
    getCurrentThread()
  );
  //if (conf.speak === "1") {
  sendJsonMessage(message, "assistant_speak");
};

export const getModels = async () => {
  console.error("Fetching" + apiUrl+"models");
  const response = await axiosInstance.get(apiUrl + "models");
  return response.data;
};

export const ensureModelDownloaded = async (modelId) => {
  console.error("Downloading model:", modelId);
  const response = await axiosInstance.get(
    apiUrl + "models/download/" + modelId
  );
  console.error("Model download:", response.data.message);
  return response.data.message;
};
