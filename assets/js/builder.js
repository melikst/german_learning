/**
 * Admin Dashboard Logic
 */

const Dashboard = {
    state: {
        topics: [],
        currentTopicId: null,
        currentDeck: [],
        isEditingTopic: false
    },

    elements: {
        topicList: document.getElementById('topic-list'),
        addTopicBtn: document.getElementById('add-topic-btn'),
        editorArea: document.getElementById('editor-area'),
        currentTopicTitle: document.getElementById('current-topic-title'),
        cardItems: document.getElementById('card-items'),
        cardCount: document.getElementById('card-count'),
        addCardBtn: document.getElementById('add-card-btn'),
        saveAllBtn: document.getElementById('save-all-btn'),

        // Quick Import
        quickImportArea: document.getElementById('quick-import-area'),
        importBtn: document.getElementById('import-btn'),
        copyJsonBtn: document.getElementById('copy-json-btn'),

        // Modal
        modal: document.getElementById('topic-modal'),
        modalTitle: document.getElementById('modal-title'),
        topicTitleInput: document.getElementById('topic-title-input'),
        topicIdInput: document.getElementById('topic-id-input'),
        modalCancel: document.getElementById('modal-cancel'),
        modalSave: document.getElementById('modal-save')
    },

    async init() {
        await this.loadTopics();
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.elements.addTopicBtn.addEventListener('click', () => this.openTopicModal());
        this.elements.modalCancel.addEventListener('click', () => this.closeModal());
        this.elements.modalSave.addEventListener('click', () => this.saveTopic());

        this.elements.addCardBtn.addEventListener('click', () => this.addCard());
        this.elements.saveAllBtn.addEventListener('click', () => this.exportAllData());

        this.elements.importBtn.addEventListener('click', () => this.importData());
        this.elements.copyJsonBtn.addEventListener('click', () => this.copyJson());
    },

    async loadTopics() {
        try {
            const response = await fetch('../data/topics.json');
            this.state.topics = await response.json();
            this.renderTopicList();
        } catch (e) {
            console.error('Failed to load topics', e);
            // If fetch fails (e.g. local file system), start empty or ask for file
            this.state.topics = [];
            this.renderTopicList();
        }
    },

    renderTopicList() {
        this.elements.topicList.innerHTML = '';
        this.state.topics.forEach(topic => {
            const div = document.createElement('div');
            div.className = `topic-item ${this.state.currentTopicId === topic.id ? 'active' : ''}`;
            div.innerHTML = `
        <span>${topic.title}</span>
        <div class="actions">
            <button class="topic-actions-btn delete-topic" title="Delete">🗑️</button>
        </div>
      `;

            div.addEventListener('click', (e) => {
                if (!e.target.closest('.topic-actions-btn')) {
                    this.selectTopic(topic);
                }
            });

            div.querySelector('.delete-topic').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete topic "${topic.title}"?`)) {
                    this.deleteTopic(topic.id);
                }
            });

            this.elements.topicList.appendChild(div);
        });
    },

    async selectTopic(topic) {
        this.state.currentTopicId = topic.id;
        this.elements.currentTopicTitle.textContent = topic.title;
        this.renderTopicList(); // Update active state
        this.elements.editorArea.classList.remove('hidden');

        // Load deck data
        try {
            // In a real backend we would fetch. Here we might need to simulate or use what we have.
            // Since we can't write to files, we rely on the user "Loading" data or we fetch existing.
            const response = await fetch(`../${topic.file}`);
            if (response.ok) {
                this.state.currentDeck = await response.json();
            } else {
                this.state.currentDeck = [];
            }
        } catch (e) {
            this.state.currentDeck = [];
        }

        this.renderCards();
    },

    renderCards() {
        this.elements.cardItems.innerHTML = '';
        this.elements.cardCount.textContent = this.state.currentDeck.length;

        this.state.currentDeck.forEach((card, index) => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
        <input type="text" class="card-input de" value="${card.de}" placeholder="German">
        <input type="text" class="card-input uk" value="${card.uk}" placeholder="Ukrainian">
        <div class="card-actions">
            <button class="action-btn delete" title="Delete">✕</button>
        </div>
      `;

            // Bind events
            const inputDe = div.querySelector('.de');
            const inputUk = div.querySelector('.uk');

            inputDe.addEventListener('change', (e) => this.updateCard(index, 'de', e.target.value));
            inputUk.addEventListener('change', (e) => this.updateCard(index, 'uk', e.target.value));

            div.querySelector('.delete').addEventListener('click', () => this.deleteCard(index));

            this.elements.cardItems.appendChild(div);
        });

        // Update export area
        this.elements.quickImportArea.value = JSON.stringify(this.state.currentDeck, null, 2);
    },

    // --- Topic Management ---
    openTopicModal() {
        this.elements.modal.classList.remove('hidden');
        this.elements.topicTitleInput.value = '';
        this.elements.topicIdInput.value = '';
    },

    closeModal() {
        this.elements.modal.classList.add('hidden');
    },

    saveTopic() {
        const title = this.elements.topicTitleInput.value.trim();
        const id = this.elements.topicIdInput.value.trim().toLowerCase();

        if (!title || !id) return alert('Please fill all fields');
        if (this.state.topics.find(t => t.id === id)) return alert('ID already exists');

        const newTopic = {
            id,
            title,
            file: `data/${id}.json`,
            count: 0
        };

        this.state.topics.push(newTopic);
        this.closeModal();
        this.renderTopicList();
        this.selectTopic(newTopic);
    },

    deleteTopic(id) {
        this.state.topics = this.state.topics.filter(t => t.id !== id);
        if (this.state.currentTopicId === id) {
            this.state.currentTopicId = null;
            this.elements.editorArea.classList.add('hidden');
            this.elements.currentTopicTitle.textContent = 'Select a Topic';
        }
        this.renderTopicList();
    },

    // --- Card Management ---
    addCard() {
        this.state.currentDeck.push({ de: '', uk: '' });
        this.renderCards();
        // Focus new card
        const inputs = this.elements.cardItems.querySelectorAll('input');
        if (inputs.length > 0) inputs[inputs.length - 2].focus();
        this.updateTopicCount();
    },

    updateCard(index, field, value) {
        this.state.currentDeck[index][field] = value;
        this.elements.quickImportArea.value = JSON.stringify(this.state.currentDeck, null, 2);
    },

    deleteCard(index) {
        this.state.currentDeck.splice(index, 1);
        this.renderCards();
        this.updateTopicCount();
    },

    updateTopicCount() {
        const topic = this.state.topics.find(t => t.id === this.state.currentTopicId);
        if (topic) {
            topic.count = this.state.currentDeck.length;
            this.renderTopicList();
        }
    },

    // --- Import/Export ---
    importData() {
        const text = this.elements.quickImportArea.value.trim();
        try {
            if (text.startsWith('[')) {
                this.state.currentDeck = JSON.parse(text);
            } else {
                // CSV
                const lines = text.split('\n');
                this.state.currentDeck = lines.map(line => {
                    const parts = line.split(/[;\t]/);
                    if (parts.length >= 2) return { de: parts[0].trim(), uk: parts[1].trim() };
                    return null;
                }).filter(x => x);
            }
            this.renderCards();
            this.updateTopicCount();
        } catch (e) {
            alert('Invalid format');
        }
    },

    copyJson() {
        this.elements.quickImportArea.select();
        document.execCommand('copy');
        alert('Copied to clipboard');
    },

    exportAllData() {
        // Create a zip-like structure or just download multiple files?
        // For simplicity, we'll download topics.json and the current deck.
        // Ideally, we'd zip it, but JSZip is external.
        // We will prompt to download topics.json first.

        this.downloadFile('topics.json', JSON.stringify(this.state.topics, null, 2));

        // And the current deck if selected
        if (this.state.currentTopicId) {
            const topic = this.state.topics.find(t => t.id === this.state.currentTopicId);
            const filename = topic.file.split('/').pop();
            this.downloadFile(filename, JSON.stringify(this.state.currentDeck, null, 2));
        }

        alert('Downloaded topics.json and current deck. Please place them in the /data folder.');
    },

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Expose globally
window.Dashboard = Dashboard;

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
