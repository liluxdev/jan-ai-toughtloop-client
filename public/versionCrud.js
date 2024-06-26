const baseUrlVersions = location.origin;

const editFriendlyName = async (newName = currentThreadTitle) => {
  newName = prompt("Edit new name:", newName);
  if (newName && newName.trim() !== currentThreadTitle) {
    try {
      await fetch(`${baseUrlVersions}/threads/current`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });
      loadThreads();
      // location.reload(true);
    } catch (error) {
      console.error("Error starting thread:", error);
    }
  }
};

const loadVersions = async () => {
  try {
    const response = await fetch(`${baseUrlVersions}/version`);
    const versions = await response.json();
    const versionList = document.querySelector("#versionList .list-group");
    versionList.innerHTML = "";
    versions.forEach((version) => {
      const listItem = document.createElement("li");
      listItem.className =
        "list-group-item d-flex justify-content-between align-items-center";
      listItem.innerHTML = `
                <span class="version-content">${version.version}</span>
                <div class="grid grid-cols-2">
                    <button class="button button-outline mr-1" onclick="editVersion('${version.key}', this)"><i class="fas fa-edit"></i></button>
                </div>
            `;
      versionList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error loading versions:", error);
  }
};

const editVersion = (key, button) => {
  const listItem = button.closest("li");
  const contentSpan = listItem.querySelector(".version-content");
  const newVersion = prompt("Edit version:", contentSpan.textContent);
  if (newVersion && newVersion.trim() !== contentSpan.textContent) {
    updateVersion(key, newVersion.trim());
  }
};

const loadThreads = async () => {
  try {
    const response = await fetch(`${baseUrlVersions}/threads`);
    const threads = await response.json();
    const threadList = document.getElementById("threadList");
    threadList.innerHTML = "";
    threads.forEach((thread) => {
      const listItem = document.createElement("li");
      listItem.className = `item-content${
        thread.current ? " font-weight-bold" : ""
      }`;
      listItem.innerHTML = `
                <div class="item-inner">
                    <div class="item-title thread-content clickable">${thread.friendlyName}</div>
                </div>
            `;
      listItem.onclick = () => updateVersion("messages", thread.key);
      threadList.appendChild(listItem);
    });
    updateCurrentThreadTitle(threads);
  } catch (error) {
    console.error("Error loading threads:", error);
  }
};

let currentThreadTitle = "Conversation";

const updateCurrentThreadTitle = (threads) => {
  const currentThread = threads.find((thread) => thread.current);
  if (currentThread) {
    document.title = currentThread.friendlyName;
    const currentThreadTitleDiv = document.getElementById("currentThreadTitle");
    currentThreadTitle = currentThread.friendlyName;
    currentThreadTitleDiv.textContent = currentThreadTitle;
    currentThreadTitleDiv.style.left = "0";
    // currentThreadTitle.style.left = '0';
  }
};

const startNewThread = async (name = "") => {
  name = prompt("Enter the name of the new thread:", new Date().toISOString());
  if (name) {
    try {
      const resp = await fetch(`${baseUrlVersions}/threads/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) {
        showToast("Error in creating thread ", "error");
        return
      }
      loadThreads();
      showToast("Thread started successfully", "success");
      location.reload(true);
    } catch (error) {
      console.error("Error starting thread:", error);
      showToast("Error in creating thread ", "error");

    }
  }
};

const updateVersion = async (key, version) => {
  try {
    const resp = await fetch(`${baseUrlVersions}/version/${key}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version }),
    });
    if (!resp.ok) {
      showToast("Error in switching thread ", "error");
      return
    }
    loadThreads();
    showToast("Thread switched successfully", "success");
    location.reload(true);
  } catch (error) {
    console.error("Error updating version:", error);
    showToast("Error in switching thread ", "error");

  }
};

const filterThreads = () => {
  const filterText = document
    .getElementById("threadFilter")
    .value.toLowerCase();
  const threadItems = document.querySelectorAll("#threadList .item-content");
  threadItems.forEach((item) => {
    const text = item
      .querySelector(".thread-content")
      .textContent.toLowerCase();
    item.style.display = text.includes(filterText) ? "" : "none";
  });
};

// Load versions when the page is loaded
document.addEventListener("DOMContentLoaded", loadVersions);
document.addEventListener("DOMContentLoaded", loadThreads);
setInterval(loadThreads, 30 * 1000);
setInterval(() => {
  const currentThreadTitle = document.getElementById("currentThreadTitle");
  currentThreadTitle.style.left = "0";
}, 1000);
