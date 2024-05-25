const baseUrlPrompts = location.origin;



const loadPrompts = async () => {
    try {
        const response = await fetch(`${baseUrlPrompts}/toughtloop`);
        const memories = await response.json();
        const memoryList = document.querySelector('#toughtloops .list-group');
        memoryList.innerHTML = '';
        memories.forEach(memory => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <span class="prompt-content">${memory.content}</span>
                <div class="grid grid-cols-2">
                    <button class="button button-outline mr-1" onclick="editPrompt(${memory.id}, this)"><i class="fas fa-edit"></i></button>
                    <button class="button button-outline" onclick="deletePrompt(${memory.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            memoryList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading memories:', error);
        showToast('Error loading prompts', 'error');
    }
};

const addPrompt = async () => {
    const input = document.getElementById('newPromptInput');
    const content = input.value.trim();
    if (!content) return;
    try {
        const response = await fetch(`${baseUrlPrompts}/toughtloop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: content }),
        });
        const newMemory = await response.json();
        showToast('Prompt added to toughloop', 'success');
        loadPrompts();
        input.value = '';
    } catch (error) {
        console.error('Error adding memory:', error);
    }
};

const editPrompt = (id, button) => {
    const listItem = button.closest('li');
    const contentSpan = listItem.querySelector('.prompt-content');
    const newContent = prompt('Edit prompt:', contentSpan.textContent);
    if (newContent && newContent.trim() !== contentSpan.textContent) {
        updatePrompt(id, newContent.trim());
    }
};

const updatePrompt = async (id, content) => {
    try {
        await fetch(`${baseUrlPrompts}/toughtloop/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: content }),
        });
        showToast('Prompt updated', 'success');
        loadMemories();
    } catch (error) {
        console.error('Error updating prompt:', error);
        showToast('Error updating prompt', 'error');
    }
};

const deletePrompt = async (id) => {
    if (confirm('Are you sure you want to delete this prompt?') === false) return;
    try {
        await fetch(`${baseUrlPrompts}/toughloop/${id}`, {
            method: 'DELETE',
        });
        showToast('Prompt deleted', 'success');
        loadMemories();
    } catch (error) {
        console.error('Error deleting prompt:', error);
        showToast('Error deleting prompt', 'error');
    }
};

// Carica le memorie quando la pagina viene caricata
document.addEventListener('DOMContentLoaded', loadPrompts);
