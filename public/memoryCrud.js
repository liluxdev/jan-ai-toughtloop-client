import { show } from "js-snackbar";

const baseUrl = location.origin;


const loadMemories = async () => {
    try {
        const response = await fetch(`${baseUrl}/memory`);
        const memories = await response.json();
        const memoryList = document.querySelector('#memoryList .list-group');
        memoryList.innerHTML = '';
        memories.forEach(memory => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <span class="memory-content">${memory.content}</span>
                <div class="grid grid-cols-2">
                    <button class="button button-outline mr-1" onclick="editMemory(${memory.id}, this)"><i class="fas fa-edit"></i></button>
                    <button class="button button-outline" onclick="deleteMemory(${memory.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            memoryList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading memories:', error);
        showToaster('Error loading memories', 'error');
    }
};

const addMemory = async () => {
    const input = document.getElementById('newMemoryInput');
    const content = input.value.trim();
    if (!content) return;
    try {
        const response = await fetch(`${baseUrl}/memory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: content }),
        });
        const newMemory = await response.json();
        showToaster('Memory added', 'success');
        loadMemories();
        input.value = '';
    } catch (error) {
        console.error('Error adding memory:', error);
    }
};

const editMemory = (id, button) => {
    const listItem = button.closest('li');
    const contentSpan = listItem.querySelector('.memory-content');
    const newContent = prompt('Edit memory:', contentSpan.textContent);
    if (newContent && newContent.trim() !== contentSpan.textContent) {
        updateMemory(id, newContent.trim());
    }
};

const updateMemory = async (id, content) => {
    try {
        await fetch(`${baseUrl}/memory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: content }),
        });
        showToaster('Memory updated', 'success');
        loadMemories();
    } catch (error) {
        showToaster('Error updating memory', 'error');
        console.error('Error updating memory:', error);
    }
};

const deleteMemory = async (id) => {
    if (confirm('Are you sure you want to delete this memory?') === false) return;
    try {
        await fetch(`${baseUrl}/memory/${id}`, {
            method: 'DELETE',
        });
        showToaster('Memory deleted', 'success');
        loadMemories();
    } catch (error) {
        showToaster('Error deleting memory', 'error');
        console.error('Error deleting memory:', error);
    }
};

// Carica le memorie quando la pagina viene caricata
document.addEventListener('DOMContentLoaded', loadMemories);
