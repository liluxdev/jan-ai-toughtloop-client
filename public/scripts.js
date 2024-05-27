function NOOP() {
  console.log("NOOP");
  document.querySelectorAll(".avatar").forEach((element) => {
    element.classList.remove("hidden");
  });
  document.querySelectorAll(".chunk_reprocessed").forEach((element) => {
    element.classList.add("hidden");
  });
  toggleToughtloops();
}
function timeagoRender() {
  setTimeout(() => {
    const nodes = document.querySelectorAll(".timeago-div-render");
    nodes.forEach((node) => {
      const isoDate = node.getAttribute("datetime");
      node.className = "timeago-div-rendered";
      //parse iso Date and format it to us locale
      const date = new Date(isoDate);
      //convert iso utc date to local date
      //calculate timezone offeset
      const offset = date.getTimezoneOffset();
      //calculate local date
      date.setMinutes(date.getMinutes() - offset);

      //const timeagoInstance = timeago();
      //format date to YYYY-MM-DD HH:MM:SS
      const formattedDate = date.toISOString().slice(0, 19).replace("T", " ");
      node.setAttribute("datetime", formattedDate);
    });
    // use render method to render nodes in real time
    timeago().render(nodes, "en_US");
  }, 222);
}
function isValidHTML(html) {
  const tempDiv = document.createElement("div");
  html = html.replace(/<br\/>/g, "<br>");
  tempDiv.innerHTML = html.trim();
  return (
    tempDiv.innerHTML.trim() === html.trim() &&
    tempDiv.innerText.trim() !== html.trim()
  );
}

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const cpuUsageBar = document.getElementById("cpuUsage");
const cpuUsageText = document.getElementById("cpuUsageText");
let wakeLock = null;
let worker;

const createCardTime = (timestamp, model) => {
  const cardTime = document.createElement("div");
  cardTime.className = "card-time";
  cardTime.innerHTML = 
    (model ? model + "@":"") +
    timestamp +
    ' <div class="timeago-div-render" datetime="' +
    timestamp +
    '"></div>';
  return cardTime;
};

const addCardHeader = (card, child) => {
  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  cardHeader.appendChild(child);
  card.prepend(cardHeader);
};

const copyToClipboard = (element) => {
  const text = element.parentElement.parentElement.querySelector(".card-content").textContent;
  navigator.clipboard.writeText(text).then(() => {
    console.log("Text copied to clipboard:", text);
    showToast("Text copied to clipboard: "+ text, "success");
  });
}

const addCardFooter = (card, timestamp) => {
  const cardFooter = document.createElement("div");
  cardFooter.className = "card-footer";
  if (card.classList.contains("avatar")) {
    cardFooter.innerHTML = `
    <i class="fa-solid fa-thumbs-up"></i> 
    <i class="fa-solid fa-thumbs-down"></i>
    `;
    card.appendChild(cardFooter);
    return;
  }
  if (card.classList.contains("system")) {
    return;
  }
  cardFooter.innerHTML = `
  <i title='copy to cliboard' onclick='copyToClipboard(this)' class="clickable fa-solid fa-copy"/>
  <i class="fa-solid fa-thumbs-up"></i> 
  <i class="fa-solid fa-thumbs-down"></i>
  `;
  card.appendChild(cardFooter);
}

if (window.Worker) {
  worker = new Worker("worker.js");
  let lastMessageText = "";
  worker.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === "message") {
      const messageData = JSON.parse(data);
      const { content, role, chunk, timestamp, model} = messageData;
      console.log({ messageData });

      if (role === "user") {
        const lastUserCard = document.querySelector(".card.user.sending");
        if (lastUserCard) {
          lastUserCard.classList.remove("sending");
          lastUserCard.classList.add("sent");
        } else {
          const card = document.createElement("div");
          card.className = "card user sent";
          const cardBody = document.createElement("div");
          cardBody.className = "card-content";
          cardBody.textContent = content;
          const cardTime = createCardTime(timestamp, model);
          addCardHeader(card, cardTime);
          timeagoRender();
          card.appendChild(cardBody);
          addCardFooter(card, timestamp);
          messagesDiv.appendChild(card);
        }
        return;
      }

      if (typeof content !== "string") {
        console.trace("Invalid message content:", content);
        return;
      }

      if (chunk) {
        const lastAssistantCard = document.querySelector(
          ".card.chunked:last-child .card-content"
        );
        console.log({ lastAssistantCard });


        if (lastAssistantCard) {
          if (role !== "avatar") {
            lastMessageText += content;
            lastAssistantCard.textContent = lastMessageText;
            if (isValidHTML(lastMessageText)) {
              lastAssistantCard.innerHTML = lastMessageText;
            }
          }
        } else {
          const card = document.createElement("div");
          card.className = `card chunked assistant`;
          const cardBody = document.createElement("div");
          cardBody.className = "card-content";
          const cardTime = createCardTime(timestamp, model);

          if (role === "avatar") {
            const avatar = document.createElement("img");
            avatar.src = content;
            avatar.className = "avatar";
            card.prepend(avatar);
          } else {
            lastMessageText += content;
            cardBody.textContent = lastMessageText;
            card.appendChild(cardBody);
            addCardHeader(card, cardTime);
            addCardFooter(card, timestamp);
            timeagoRender();
          }

          messagesDiv.appendChild(card);
          console.log({ lastAssistantCard: card, created: true });
        }
      } else {
        const card = document.createElement("div");
        card.className = `card ${role}`;
        if (role === "separator") {
          lastMessageText = ""; // reset buffer
          const lastAssistantCardBody = document.querySelector(
            ".card.chunked:last-child .card-content"
          );
          if (lastAssistantCardBody) {
            // lastAssistantCardBody.className = "card assistant";
            const txt = lastAssistantCardBody.textContent;
            if (isValidHTML(txt)) {
              lastAssistantCardBody.innerHTML = txt;
            }
          }
          const lastAssistantCardTime = document.querySelector(
            ".card.chunked:last-child .card-time"
          );
          if (lastAssistantCardTime) {
            lastAssistantCardTime.innerHTML =
              (model ? model + "@":"") +
              timestamp +
              ' <div class="timeago-div-render" datetime="' +
              timestamp +
              '"></div>';
            timeagoRender();
          }
          return;
        }

        const cardBody = document.createElement("div");
        cardBody.className = "card-content";

        if (role === "avatar") {
          const avatar = document.createElement("img");
          avatar.src = content;
          avatar.className = "avatar";
          card.prepend(avatar);
        } else {
          if (isValidHTML(content)) {
            cardBody.innerHTML = content;
          } else {
            cardBody.textContent = content;
          }
        }
        const cardTime = createCardTime(timestamp, model);
        timeagoRender();
        addCardHeader(card, cardTime);
        card.appendChild(cardBody);
        addCardFooter(card, timestamp);
        messagesDiv.appendChild(card);
      }

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else if (type === "cpu") {
      const cpuUsage = parseFloat(data);
      //cpuUsageBar.style.width = cpuUsage + "%";
      //cpuUsageBar.setAttribute("aria-valuenow", cpuUsage);
      updateCpuUsage(cpuUsage);
    //  cpuUsageText.textContent = cpuUsage + "%";
    } else if (type === "notify") {
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("New message", {
            body: data,
            icon: "favicon.webp",
            data: { url: location.href },
          });
        });
      }
    }
  };
}

function handleKeyPress(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function sendMessage() {
  const message = messageInput.value;
  if (message.trim() === "") return;
  console.log("Sending message:", message);
  worker.postMessage({ type: "send", data: message });
  const card = document.createElement("div");
  card.className = "card user sending";
  const cardBody = document.createElement("div");
  cardBody.className = "card-content";
  cardBody.textContent = message;
  cardBody.className = "card-content";
  const timestamp = new Date().toISOString();
  const cardTime = createCardTime(timestamp, null);
  addCardHeader(card, cardTime);
  timeagoRender();
  card.appendChild(cardBody);
  addCardFooter(card,timestamp);
  messagesDiv.appendChild(card);
  messageInput.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      console.log("Wake Lock was released");
      document.getElementById("wakeLock").innerHTML =
        "<i class='fas fa-lock-open'></i>";
    });
    console.log("Wake Lock is active");
    document.getElementById("wakeLock").innerHTML =
      "<i class='fas fa-lock'></i>";
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
    document.getElementById("wakeLock").innerHTML =
      "<i class='fas fa-lock-open'></i>";
  }
}

function handleVisibilityChange() {
  if (wakeLock !== null && document.visibilityState === "visible") {
    requestWakeLock();
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange);
requestWakeLock();

function openFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if (document.documentElement.mozRequestFullScreen) {
    document.documentElement.mozRequestFullScreen();
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen();
  } else if (document.documentElement.msRequestFullscreen) {
    document.documentElement.msRequestFullscreen();
  }
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

function toggleFullScreen() {
  if (
    !document.fullscreenElement &&
    !document.mozFullScreenElement &&
    !document.webkitFullscreenElement &&
    !document.msFullscreenElement
  ) {
    openFullscreen();
  } else {
    closeFullscreen();
  }
}

function enableNotifications() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        alert("Notifications enabled");
      }
    });
  } else {
    alert("Notifications are already enabled");
  }
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

// Register the Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then(function (registration) {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch(function (error) {
      console.log("Service Worker registration failed:", error);
    });
}

function setCogRunning(state) {
  const cog = document.getElementById('runningCog');
  if (state) {
    cog.classList.add('running');
  } else {
    cog.classList.remove('running');
  }
}
