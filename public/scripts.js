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



const messagesDiv = document.getElementById("messages");
let manualScroll = false;
let isRenderingRecent = false;

messagesDiv.addEventListener("scroll", () => {
  setTimeout(() => {
    manualScroll = true;
    setTimeout(() => {
      manualScroll = false;
    }, 10000);
  }, 1200);
});

const scrollToBottom = () => {
  if (!manualScroll || isRenderingRecent) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
};

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

const messageInput = document.getElementById("messageInput");
const cpuUsageBar = document.getElementById("cpuUsage");
const cpuUsageText = document.getElementById("cpuUsageText");
let wakeLock = null;
let worker;

const getEgyptianDate = (timestamp) => {
  const mesiAnticoCalendarioEgizio = [
      "Tekh (Akhet 1)",
      "Menhet (Akhet 2)",
      "Hwt-Hrw (Akhet 3)",
      "Khaiak (Akhet 4)",
      "Tybi (Peret 1)",
      "Mekhir (Peret 2)",
      "Phamenoth (Peret 3)",
      "Pharmuthi (Peret 4)",
      "Pakhons (Shemu 1)",
      "Payni (Shemu 2)",
      "Epiphi (Shemu 3)",
      "Mesore (Shemu 4)"
  ];

  const decaniEgizi = [
    {
        nome: "Sothis",
        divinitaFemminile: "Sothis (Iside)",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Anedjti",
        divinitaFemminile: "Nephthys",
        divinitaMaschile: "Anubis"
    },
    {
        nome: "Sepdet",
        divinitaFemminile: "Sothis",
        divinitaMaschile: "Horus"
    },
    {
        nome: "Mestj",
        divinitaFemminile: "Hathor",
        divinitaMaschile: "Ra"
    },
    {
        nome: "Qebehsenuf",
        divinitaFemminile: "Neith",
        divinitaMaschile: "Qebehsenuf"
    },
    {
        nome: "Hapi",
        divinitaFemminile: "Tefnut",
        divinitaMaschile: "Hapi"
    },
    {
        nome: "Duamutef",
        divinitaFemminile: "Serqet",
        divinitaMaschile: "Duamutef"
    },
    {
        nome: "Amit",
        divinitaFemminile: "Sekhmet",
        divinitaMaschile: "Ptah"
    },
    {
        nome: "Imseti",
        divinitaFemminile: "Iside",
        divinitaMaschile: "Imseti"
    },
    {
        nome: "Khenti-Amentiu",
        divinitaFemminile: "Nephthys",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Qebehu",
        divinitaFemminile: "Nut",
        divinitaMaschile: "Geb"
    },
    {
        nome: "Amsu",
        divinitaFemminile: "Amentet",
        divinitaMaschile: "Min"
    },
    {
        nome: "Neith",
        divinitaFemminile: "Neith",
        divinitaMaschile: "Ra"
    },
    {
        nome: "Re",
        divinitaFemminile: "Mut",
        divinitaMaschile: "Amun"
    },
    {
        nome: "Anubis",
        divinitaFemminile: "Anput",
        divinitaMaschile: "Anubis"
    },
    {
        nome: "Horus",
        divinitaFemminile: "Hathor",
        divinitaMaschile: "Horus"
    },
    {
        nome: "Osiris",
        divinitaFemminile: "Iside",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Sokar",
        divinitaFemminile: "Nephthys",
        divinitaMaschile: "Sokar"
    },
    {
        nome: "Ptah",
        divinitaFemminile: "Sekhmet",
        divinitaMaschile: "Ptah"
    },
    {
        nome: "Khonsu",
        divinitaFemminile: "Mut",
        divinitaMaschile: "Khonsu"
    },
    {
        nome: "Sobek",
        divinitaFemminile: "Renenutet",
        divinitaMaschile: "Sobek"
    },
    {
        nome: "Thoth",
        divinitaFemminile: "Seshat",
        divinitaMaschile: "Thoth"
    },
    {
        nome: "Maat",
        divinitaFemminile: "Maat",
        divinitaMaschile: "Thoth"
    },
    {
        nome: "Heket",
        divinitaFemminile: "Heket",
        divinitaMaschile: "Khnum"
    },
    {
        nome: "Horus il Giovane",
        divinitaFemminile: "Wadjet",
        divinitaMaschile: "Horus il Giovane"
    },
    {
        nome: "Iside",
        divinitaFemminile: "Iside",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Ra",
        divinitaFemminile: "Hathor",
        divinitaMaschile: "Ra"
    },
    {
        nome: "Atum",
        divinitaFemminile: "Iusaaset",
        divinitaMaschile: "Atum"
    },
    {
        nome: "Shu",
        divinitaFemminile: "Tefnut",
        divinitaMaschile: "Shu"
    },
    {
        nome: "Geb",
        divinitaFemminile: "Nut",
        divinitaMaschile: "Geb"
    },
    {
        nome: "Nut",
        divinitaFemminile: "Nut",
        divinitaMaschile: "Ra"
    },
    {
        nome: "Aker",
        divinitaFemminile: "Mut",
        divinitaMaschile: "Aker"
    },
    {
        nome: "Serqet",
        divinitaFemminile: "Serqet",
        divinitaMaschile: "Horus"
    },
    {
        nome: "Amun",
        divinitaFemminile: "Amunet",
        divinitaMaschile: "Amun"
    },
    {
        nome: "Bastet",
        divinitaFemminile: "Bastet",
        divinitaMaschile: "Sekhmet"
    },
    {
        nome: "Sekhmet",
        divinitaFemminile: "Sekhmet",
        divinitaMaschile: "Ptah"
    },
    {
        nome: "Wepwawet",
        divinitaFemminile: "Neith",
        divinitaMaschile: "Wepwawet"
    },
    {
        nome: "Sobdet",
        divinitaFemminile: "Sobdet (Sothis)",
        divinitaMaschile: "Osiris"
    }
];


  const mesiAnticoCalendarioEgizio2 = [
    {
        nome: "Tekh (Akhet 1)",
        divinitaFemminile: "Seshat",
        divinitaMaschile: "Thoth"
    },
    {
        nome: "Menhet (Akhet 2)",
        divinitaFemminile: "Maat",
        divinitaMaschile: "Ra"
    },
    {
        nome: "Hwt-Hrw (Akhet 3)",
        divinitaFemminile: "Hathor",
        divinitaMaschile: "Horus"
    },
    {
        nome: "Khaiak (Akhet 4)",
        divinitaFemminile: "Nephthys",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Tybi (Peret 1)",
        divinitaFemminile: "Iside",
        divinitaMaschile: "Osiris"
    },
    {
        nome: "Mekhir (Peret 2)",
        divinitaFemminile: "Neith",
        divinitaMaschile: "Anubis"
    },
    {
        nome: "Phamenoth (Peret 3)",
        divinitaFemminile: "Sekhmet",
        divinitaMaschile: "Ptah"
    },
    {
        nome: "Pharmuthi (Peret 4)",
        divinitaFemminile: "Mut",
        divinitaMaschile: "Amun"
    },
    {
        nome: "Pakhons (Shemu 1)",
        divinitaFemminile: "Tefnut",
        divinitaMaschile: "Shu"
    },
    {
        nome: "Payni (Shemu 2)",
        divinitaFemminile: "Bastet",
        divinitaMaschile: "Atum"
    },
    {
        nome: "Epiphi (Shemu 3)",
        divinitaFemminile: "Hathor",
        divinitaMaschile: "Khonsu"
    },
    {
        nome: "Mesore (Shemu 4)",
        divinitaFemminile: "Nut",
        divinitaMaschile: "Geb"
    }
];

 // const date = new Date(isoDate);
  const formattedDate = timestamp;//date.toISOString().slice(0, 19).replace("T", " ");
  const inputDate = new Date(formattedDate); // Data fornita come input
  startDateForEgyptianCalendar = new Date(inputDate.getFullYear()+"-07-26T00:00:00Z"); // Data di partenza del calendario egizio
  
  // Calcola la differenza in giorni tra le due date
  const diffTime = Math.abs(inputDate - startDateForEgyptianCalendar);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

  // Calcola il mese e il giorno egizio
  const dayOfYear = diffDays % 365;
  const monthIndex = Math.floor(dayOfYear / 30);
  const dayOfMonth = (dayOfYear % 30) + 1;
  const decanoIndex = Math.floor(dayOfYear / 10);


  return `${timestamp} - ${dayOfMonth} ${mesiAnticoCalendarioEgizio[monthIndex]} - Decano ${decaniEgizi[decanoIndex].nome} F ${decaniEgizi[decanoIndex].divinitaFemminile} M ${decaniEgizi[decanoIndex].divinitaMaschile} `;
};

// Esempio di utilizzo:
console.log(getEgyptianDate(new Date())); // Output esemplificativo

const createCardTime = (timestamp, model) => {
  const cardTime = document.createElement("div");
  cardTime.className = "card-time";
  cardTime.innerHTML =
    (model ? model + "@" : "") +
    getEgyptianDate(timestamp) +
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
  const text =
    element.parentElement.parentElement.querySelector(
      ".card-content"
    ).textContent;
  navigator.clipboard.writeText(text).then(() => {
    console.log("Text copied to clipboard:", text);
    showToast("Text copied to clipboard: " + text, "success");
  });
};

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
};

if (window.Worker) {
  worker = new Worker("worker.js");
  let lastMessageText = "";
  worker.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === "message") {
      const messageData = JSON.parse(data);
      const { content, role, chunk, timestamp, model, recent } = messageData;
      console.log({ messageData });

      if (recent) {
        isRenderingRecent = true;
      } else {
        setTimeout(() => {
          isRenderingRecent = false;
        }, 3000);
      }

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
              (model ? model + "@" : "") +
              getEgyptianDate(timestamp) +
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
      scrollToBottom();
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
  addCardFooter(card, timestamp);
  messagesDiv.appendChild(card);
  messageInput.value = "";
  scrollToBottom();
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
  const cog = document.getElementById("runningCog");
  if (state) {
    cog.classList.add("running");
  } else {
    cog.classList.remove("running");
  }
}
