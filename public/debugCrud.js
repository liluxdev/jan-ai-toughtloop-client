const baseUrlDebug = location.origin;

const toggleDebug = () => {
    loadDebug();
    const memoryList = document.getElementById('debugView');
    memoryList.classList.toggle('collapse');
};

const loadDebug = async () => {
    try {
        const response = await fetch(`${baseUrlPrompts}/apiContextDebug`);
        const debug = await response.json();

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
                <div>
                    <button class="btn btn-sm btn-outline-secondary mr-1" onclick="editPrompt(${memory.id}, this)"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="deletePrompt(${memory.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            memoryList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading debug:', error);
    }
};
