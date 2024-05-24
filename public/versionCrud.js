const baseUrlVersions = location.origin;





const loadVersions = async () => {
    try {
        const response = await fetch(`${baseUrlVersions}/version`);
        const versions = await response.json();
        const versionList = document.querySelector('#versionList .list-group');
        versionList.innerHTML = '';
        versions.forEach(version => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <span class="version-content">${version.version}</span>
                <div>
                    <button class="button button-outline-secondary mr-1" onclick="editVersion('${version.key}', this)"><i class="fas fa-edit"></i></button>
                </div>
            `;
            versionList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading versions:', error);
    }
};

const editVersion = (key, button) => {
    const listItem = button.closest('li');
    const contentSpan = listItem.querySelector('.version-content');
    const newVersion = prompt('Edit version:', contentSpan.textContent);
    if (newVersion && newVersion.trim() !== contentSpan.textContent) {
        updateVersion(key, newVersion.trim());
    }
};



const loadThreads = async () => {
    try {
        const response = await fetch(`${baseUrlVersions}/threads`);
        const threads = await response.json();
        const threadList = document.getElementById('threadList');
        threadList.innerHTML = '';
        threads.forEach(thread => {
            const listItem = document.createElement('li');
            listItem.className = `item-content${thread.current ? ' font-weight-bold' : ''}`;
            listItem.innerHTML = `
                <div class="item-inner">
                    <div class="item-title thread-content">${thread.friendlyName}</div>
                </div>
            `;
            listItem.onclick = () => updateVersion('messages', thread.key);
            threadList.appendChild(listItem);
        });
        updateCurrentThreadTitle(threads);
    } catch (error) {
        console.error('Error loading threads:', error);
    }
};

const updateCurrentThreadTitle = (threads) => {
    const currentThread = threads.find(thread => thread.current);
    if (currentThread) {
        document.title = currentThread.friendlyName;
        const currentThreadTitle = document.getElementById('currentThreadTitle');
        currentThreadTitle.textContent = currentThread.friendlyName;
        currentThreadTitle.style.left = '0';
       // currentThreadTitle.style.left = '0';
    }
};

const startNewThread = async (name="") => {
    name = prompt('Enter the name of the new thread:', new Date().toISOString());
    try {
        await fetch(`${baseUrlVersions}/threads/new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        loadThreads();
        location.reload(true);
    } catch (error) {
        console.error('Error starting thread:', error);
    }
};

const updateVersion = async (key, version) => {
    try {
        await fetch(`${baseUrlVersions}/version/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ version }),
        });
        loadThreads();
        location.reload(true);
    } catch (error) {
        console.error('Error updating version:', error);
    }
};

const filterThreads = () => {
    const filterText = document.getElementById('threadFilter').value.toLowerCase();
    const threadItems = document.querySelectorAll('#threadList .item-content');
    threadItems.forEach(item => {
        const text = item.querySelector('.thread-content').textContent.toLowerCase();
        item.style.display = text.includes(filterText) ? '' : 'none';
    });
};

// Load versions when the page is loaded
document.addEventListener('DOMContentLoaded', loadVersions);
document.addEventListener('DOMContentLoaded', loadThreads);
setInterval(loadThreads, 30*1000);
/* setInterval(() => {
    const currentThreadTitle = document.getElementById('currentThreadTitle');
    currentThreadTitle.style.left = '0';
}, 1000); */

