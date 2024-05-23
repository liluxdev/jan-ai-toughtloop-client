const baseUrlVersions = location.origin;

const toggleVersionList = () => {
    const versionList = document.getElementById('versionList');
    versionList.classList.toggle('collapse');
};

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
                    <button class="btn btn-sm btn-outline-secondary mr-1" onclick="editVersion('${version.key}', this)"><i class="fas fa-edit"></i></button>
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

const updateVersion = async (key, version) => {
    try {
        await fetch(`${baseUrlVersions}/version/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ version }),
        });
        loadVersions();
        location.reload(true);
    } catch (error) {
        console.error('Error updating version:', error);
    }
};

// Load versions when the page is loaded
document.addEventListener('DOMContentLoaded', loadVersions);
