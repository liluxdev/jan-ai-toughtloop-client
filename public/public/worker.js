const wsMap = new Map();
function createWebSocket(url) {
  let ws;
  let forceClose = false;
  let onmessage;
  let reconnectInterval = 10; // Interval di riconnessione iniziale in millisecondi
  let maxReconnectInterval = 120 * 1000; // Intervallo massimo di riconnessione in millisecondi
  let reconnectAttempts = 0;
  let reconnnectIntervalId;

  function connect(resolve = null) {
    if (wsMap.has(url)) {
      ws = wsMap.get(url);
      if (ws.readyState === 1) {
        console.log("ws already connected");
        try{
          clearInterval(reconnnectIntervalId);
          reconnnectIntervalId = null;
        } catch (err) {
          console.error("Failed to clear interval: ",reconnnectIntervalId, err);
        }
         if (resolve) {
          resolve();
        }
        return;
      } else {
        console.log("Closing unready ws");
        forceClose = true;
        try{ 
          ws.close();
        } catch (err) {
          console.error("Failed to close ws: ", err);
        }
        ws = null;
        wsMap.delete(url);
      }
    }
    ws = new WebSocket(url);
    wsMap.set(url, ws);
    if (onmessage) {
      ws.onmessage = onmessage;
      console.log("ws onmessage (first): ", onmessage);
    }
    ws.onopen = () => {
      forceClose = false;
      try{
        clearInterval(reconnnectIntervalId);
      } catch (err) {
        console.error("Failed to clear interval: ", err);
      }
      console.log("Connected ws");
      if (onmessage) {
        ws.onmessage = onmessage;
        console.log("ws onmessage (re-setting): ", onmessage);
      }
      if (resolve) {
        resolve();
      }
      reconnectInterval = 10; // Resetta l'intervallo di riconnessione
      reconnectAttempts = 0; // Resetta il contatore di tentativi
    };

    ws.onmessage = (event) => {
      console.log(`ws Received message: ${event.data}`);
      // Gestisci i messaggi ricevuti qui
    };

    ws.onclose = async () => {
      console.log("ws Connection closed", {forceClose});
      if (!forceClose){
        console.log("ws Connection closed, reconnecting...");
        await reconnect();
      }else{
        console.log("ws Connection closed by force");
        reconnnectIntervalId = setInterval(async () => {
          if(reconnnectIntervalId){
            console.log("ws Reconnecting try...");
            await connect();
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error(`ws WebSocket error: ${error.message}`, error);
    };
  }

  async function reconnect() {
    return new Promise((resolve) => {
      reconnectAttempts++;
      if (reconnectInterval < maxReconnectInterval) {
        reconnectInterval *= 2; // Incrementa l'intervallo di riconnessione
      }

      console.log(
        `${reconnectAttempts}) ws Reconnecting in ${
          reconnectInterval / 1000
        } seconds...`
      );

      setTimeout(() => {
        console.log("ws Reconnecting...");
        connect(resolve);
      }, reconnectInterval);
    });
  }

  connect();

  return {
    reconnect,
    ws: () => ws,
    setOnMessage: (callback) => {
      onmessage = callback;
    },
    sendWithRetry: async (data, delay = 100, initialDelay = 50) => {
      const sendWithRetryBody = async (data, delay) => {
        try {
          //sendJsonMessage(data, "user", false, undefined, new Date().toISOString());
          ws.send(data);
          //sendJsonMessage("OK"+data, "user", false, undefined, new Date().toISOString());

        } catch (err) {
          console.error("Failed to send message, retrying: ", err);
          //sendJsonMessage(err.message, "user", false, undefined, new Date().toISOString());

          console.log("ws Reconnecting try...");
          await connect();
          setTimeout(async () => await sendWithRetryBody(data, delay), delay);
        }
      };
      setTimeout(
        async () => await sendWithRetryBody(data, delay),
        initialDelay
      );
    },
  };
}

let needsRecentNewMessage = true;
// Utilizza la funzione createWebSocket per creare una connessione WebSocket con riconnessione automatica

const ws = createWebSocket(
  "ws" +
    (location.protocol === "https:" ? "s" : "") +
    "://" +
    location.host +
    "/ws"
);
const cpuWs = createWebSocket(
  "ws" +
    (location.protocol === "https:" ? "s" : "") +
    "://" +
    location.host +
    "/cpu"
);

// Funzione per inviare messaggi JSON con informazioni su role e chunk
const sendJsonMessage = (
  content,
  role,
  chunk = false,
  timestamp = new Date().toISOString()
) => {
  console.trace("Sending message: ", content, role, chunk);
  const message = JSON.stringify({ content, role, chunk, timestamp });
  postMessage({ type: "message", data: message });
};

// Gestione messaggi WebSocket principale
ws.setOnMessage((event) => {
  console.log("Event data: ", event.data);
  if (event.data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      console.log("Event data is Blob: ", data);
      sendJsonMessage(data, "unknown");
    };
    reader.readAsText(event.data);
  } else if (event.data === "<hr/>" || event.data === "<br/>") {
    console.log("Event data is hr or br: ", event);
    postMessage({
      type: "notify",
      data: "Toughloop AI - wrote a new message...",
    });
    sendJsonMessage(event.data, "separator");
  } else {
    try {
      const parsedData = JSON.parse(event.data);
      if (parsedData?.content?.recentMessages) {
        if (needsRecentNewMessage) {
          parsedData.content.recentMessages.forEach((message) => {
            console.log("Rendering recent messages: ", message);
            sendJsonMessage(
              message.content,
              message.role,
              false,
              message.timestamp
            );
            needsRecentNewMessage = false;
            return;
          });
        } else {
          console.log("Recent messages already rendered");
          return;
        }
      }
      if (parsedData.content === "<hr/>") {
        postMessage({
          type: "notify",
          data: "Toughloop AI - wrote a new message...",
        });
        sendJsonMessage(event.data, "separator");
      } else {
        sendJsonMessage(
          parsedData.content,
          parsedData.role,
          parsedData.chunk === true,
          parsedData.timestamp
        );
      }
    } catch (error) {
      console.error("Failed to parse JSON: ", error);
      sendJsonMessage(event.data, "unknown");
    }
  }
});

// Gestione messaggi WebSocket CPU
cpuWs.setOnMessage((event) => {
  postMessage({ type: "cpu", data: event.data });
});

// Gestione messaggi dal main thread
onmessage = async (event) => {
  const { type, data } = event.data;
  if (type === "send") {
    if (ws.ws().readyState === 1) {
      try {
        ws.ws().send(data);
      } catch (error) {
        console.error("Failed to send message: ", error);
        await ws.reconnect();
        ws.ws().send(data);
      }
    } else {
      console.log("ws not ready");
      await ws().reconnect();
      ws.ws().send(data);
    }
  }
};

setTimeout(() => {
  console.log("Worker is running...");
  ws.sendWithRetry(
    JSON.stringify({ requestedAction: "getRecentMessages" }),
    100,
    333
  );
}, 0);
