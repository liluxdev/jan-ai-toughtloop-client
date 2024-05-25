const baseUrlDebug = location.origin;

const isInvokingApi = async () => {
    const response = await fetch(`${baseUrlPrompts}/apiContextDebug`);
    const debug = await response.json();
    return debug.invokingApi;
};
let refreshingBufferSize = false;
let refreshingToughloopInterval = false;
const fetchDebug = async () => {
    try {
        const response = await fetch(`${baseUrlPrompts}/apiContextDebug`);
        const debug = await response.json();

        refreshingBufferSize = true;
        app.range.setValue('.bufferSize', debug.conversationMessageLimit);
        refreshingBufferSize = false;

        refreshingToughloopInterval = true;
        app.range.setValue('.toughtloopIntervalRandomMaxSecs', debug?.configuration?.toughtloopIntervalRandomMaxSecs || 333);
        refreshingToughloopInterval = false;

        refreshingBufferSize = true;
        app.range.setValue('.temperature', debug?.configuration?.temperature || 0.7);
        refreshingBufferSize = false;

        refreshingBufferSize = true;
        app.range.setValue('.topP', debug?.configuration?.top_p || 0.9);
        refreshingBufferSize = false;

        refreshingBufferSize = true;
        app.range.setValue('.frequencyPenality', debug?.configuration?.frequency_penalty || 0.0);
        refreshingBufferSize = false;

        refreshingBufferSize = true;
        app.range.setValue('.presencePenality', debug?.configuration?.presence_penalty || 0.0);
        refreshingBufferSize = false;



        const memories = [];
        for (const key in debug) {
            const formattedJson = JSON.stringify(debug[key], null, 2);
            memories.push({ id: key, content: formattedJson, key: key });
        }

        const memoryList = document.querySelector('#debugView .list-group');
        memoryList.innerHTML = '';
        memories.forEach(memory => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <span class="debug-content">${memory.key}:<br/><pre>${memory.content}</pre></span>
            `;
            memoryList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading debug:', error);
    }
};

const updateConfigValue = async (key, value) => {
    if (refreshingBufferSize) return;
    if (refreshingToughloopInterval) return;
    try {
        await fetch(`${baseUrlDebug}/config/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value }),
        });
        loadThreads();
    } catch (error) {
        console.error('Error updating config:', error);
    }
};
