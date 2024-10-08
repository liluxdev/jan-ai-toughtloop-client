const baseUrlDebug = location.origin;

const isInvokingApi = async () => {
  const response = await fetch(`${baseUrlPrompts}/apiContextDebug`);
  const debug = await response.json();
  return debug.invokingApi;
};
let refreshingBufferSize = false;
let refreshingToughloopInterval = false;

const debounce = (func, delay) => {
  let timeoutId;
  let lastArgs;
  let lastThis;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(lastThis, lastArgs);
    }, delay);
  };

  debounced.cancel = function () {
    clearTimeout(timeoutId);
  };

  return debounced;
};

const _fetchDebug = async () => {
  console.warn("Fetching debug - debounced");
  try {
    const response = await fetch(`${baseUrlPrompts}/apiContextDebug`);
    const debug = await response.json();
    console.warn("Fetched debug");
    refreshingBufferSize = true;
    app.range.setValue(".bufferSize", debug.conversationMessageLimit);
    refreshingBufferSize = false;

    refreshingToughloopInterval = true;
    app.range.setValue(
      ".toughtloopIntervalRandomMaxSecs",
      debug?.configuration?.toughtloopIntervalRandomMaxSecs || 333
    );

    refreshingToughloopInterval = false;

    refreshingBufferSize = true;
    app.range.setValue(
      ".temperature",
      debug?.configuration?.temperature || 0.7
    );
    document.querySelector("#temperature").textContent =
      debug?.configuration?.temperature || 0.7;
    refreshingBufferSize = false;

    refreshingBufferSize = true;
    app.range.setValue(".topP", debug?.configuration?.top_p || 0.9);
    document.querySelector("#top_p").textContent =
      debug?.configuration?.top_p || 0.9;
    refreshingBufferSize = false;

    refreshingBufferSize = true;
    app.range.setValue(
      ".frequencyPenality",
      debug?.configuration?.frequency_penalty || 0.0
    );
    document.querySelector("#frequency_penalty").textContent =
      debug?.configuration?.frequency_penalty || 0.0;
    refreshingBufferSize = false;

    refreshingBufferSize = true;
    app.range.setValue(
      ".presencePenality",
      debug?.configuration?.presence_penalty || 0.0
    );
    document.querySelector("#presence_penalty").textContent =
      debug?.configuration?.presence_penalty || 0.0;
    refreshingBufferSize = false;

    refreshingBufferSize = true;
    const sendAllThreads = app.toggle.get(".sendAllThreads");
    const sendAllThreadsValue =
      debug?.configuration?.sendAllThreads === "1" || false;
    if (sendAllThreads.checked !== sendAllThreadsValue) {
      sendAllThreads.toggle();
    }
    refreshingBufferSize = false;

    const toughtloopEnabled = app.toggle.get(".toughtloopEnabled");
    const toughtloopEnabledValue =
    debug?.configuration?.toughtloopEnabled === "1"  || false;
      if (toughtloopEnabled.checked!== toughtloopEnabledValue) {
        toughtloopEnabled.toggle();
      }

      const manualChannelingMode = app.toggle.get(".manualChannelingMode");
      const manualChannelingModeVal =
      debug?.configuration?.manualChannelingMode === "1"  || false;
        if (manualChannelingMode.checked!== manualChannelingModeVal) {
          manualChannelingMode.toggle();
        }

      

    refreshingBufferSize = true;
    const onlyUser = app.toggle.get(".onlyUser");
    const onlyUserValue = debug?.configuration?.onlyUser === "1" || false;
    if (onlyUser.checked !== onlyUserValue) {
      onlyUser.toggle();
    }
    refreshingBufferSize = false;

    const model = debug?.configuration?.model || "stealth-v1.2-7b";
    const modelSelect = document.querySelector("#modelPicker");
    const modelSmartSelect = app.smartSelect.get("#modelPicker");
    if (!modelSmartSelect) {
      const resp = await fetch(`${baseUrlDebug}/models`);
      try {
        const models = await resp.json();
        const modelOptions = models.map((model) => ({
          value: model.id,
          text: model.name,
        }));
        const modelOptionsHtml = modelOptions
          .map(
            (option) =>
              `<option ${model === option.value ? "selected" : ""} value="${
                option.value
              }">${option.text}</option>`
          )
          .join("");
        modelSelect.innerHTML = modelOptionsHtml;
        console.warn("Creating smart select", modelSelect.outerHTML);
        /*app.smartSelect.create({
                el: '#modelPicker',
                onChange: async (value) => {
                    updateConfigValue('model', value);
                },
            });*/
        modelSelect.addEventListener("change", async (event) => {
          updateConfigValue("model", event.target.value);
        });
      } catch (error) {
        console.error("Error fetching models", error);
        showToast(
          "Error fetching models, is JAN.ai Server API Started?",
          "warning"
        );
      }

      const profile = debug?.configuration?.profile || "default";
      const profileSelect = document.querySelector("#profilePicker");
      const profileSelectSmartSelect = app.smartSelect.get("#profilePicker");
      if (!profileSelectSmartSelect) {
        const resp = await fetch(`${baseUrlDebug}/profiles`);
        try {
          const profiles = await resp.json();
          const profileOptions = profiles.map((profile) => ({
            value: profile,
            text: profile,
          }));
          const profileOptionsHtml = profileOptions
           .map(
              (option) =>
                `<option ${profile === option.value? "selected" : ""} value="${
                  option.value
                }">${option.text}</option>`
            )
           .join("");
          profileSelect.innerHTML = profileOptionsHtml;
          console.warn("Creating smart select", profileSelect.outerHTML);
          /*app.smartSelect.create({
                el: '#profilePicker',
                onChange: async (value) => {
                    updateConfigValue('profile', value);
                },
            });*/
          profileSelect.addEventListener("change", async (event) => {
            updateConfigValue("profile", event.target.value);
            setTimeout(() => {location.reload()}, 2000);
          });
          } catch (error) {
            console.error("Error fetching profiles", error);
            showToast(
              "Error fetching profiles, is JAN.ai Server API Started?",
              "warning"
            );
          }
        }
      }

    const memories = [];
    for (const key in debug) {
      const formattedJson = JSON.stringify(debug[key], null, 2);
      memories.push({ id: key, content: formattedJson, key: key });
    }

    const memoryList = document.querySelector(".debug-list .list-group");
    memoryList.innerHTML = "";
    memories.forEach((memory) => {
      const listItem = document.createElement("li");
      listItem.className =
        "list-group-item d-flex justify-content-between align-items-center";
      listItem.innerHTML = `
                <span class="debug-content">${memory.key}:<br/><pre>${memory.content}</pre></span>
            `;
      memoryList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error loading debug:", error);
  }
};

const addProfile = async () => {
  const name = prompt("Enter profile name:");
  if (!name) return;
  try {
    await fetch(`${baseUrlDebug}/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    showToast("Profile created", "success");
    fetchDebug();
  } catch (error) {
    console.error("Error creating profile:", error);
    showToast("Profile creation error", "error");
  }
};

const debouncedFetchDebug = debounce(_fetchDebug, 333);

const fetchDebug = async () => {
  if (refreshingBufferSize) return;
  if (refreshingToughloopInterval) return;
  console.warn("Fetching debug");
  console.trace();
  debouncedFetchDebug();
};

const _updateConfigValue = async (key, value) => {
  if (refreshingBufferSize) return;
  if (refreshingToughloopInterval) return;
  try {
    await fetch(`${baseUrlDebug}/config/${key}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    });
    showToast("Config updated", "success");
    fetchDebug();
  } catch (error) {
    console.error("Error updating config:", error);
    showToast("Config update error", "error");
  }
};
const debouncedUpdateConfigValue = debounce(_updateConfigValue, 333);
const updateConfigValue = async (key, value) => {
  if (refreshingBufferSize) return;
  if (refreshingToughloopInterval) return;
  debouncedUpdateConfigValue(key, value);
};
