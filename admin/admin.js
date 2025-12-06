/**
 * Admin Dashboard - Complete Logic
 * Includes: Topic Management, Card Editor, Text Tools
 */

// ============ TEXT TOOLS ============
const Tools = {
    concatenate() {
        const input = document.getElementById('concat-input').value;
        const sep = document.getElementById('concat-sep').value;
        const lines = input.split('\n').filter(l => l.trim());
        document.getElementById('concat-output').value = lines.join(sep);
    },

    split() {
        const input = document.getElementById('split-input').value;
        const sep = document.getElementById('split-sep').value;
        const parts = input.split(sep).map(p => p.trim()).filter(p => p);
        document.getElementById('split-output').value = parts.join('\n');
    },

    toCase(type) {
        const input = document.getElementById('case-input').value;
        let result = '';
        switch (type) {
            case 'upper':
                result = input.toUpperCase();
                break;
            case 'lower':
                result = input.toLowerCase();
                break;
            case 'title':
                result = input.replace(/\w\S*/g, txt =>
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                break;
        }
        document.getElementById('case-output').value = result;
    },

    trim() {
        const input = document.getElementById('trim-input').value;
        const result = input
            .split('\n')
            .map(line => line.trim().replace(/\s+/g, ' '))
            .filter(line => line)
            .join('\n');
        document.getElementById('trim-output').value = result;
    },

    bulkFormat() {
        const input = document.getElementById('bulk-input').value;
        const lines = input.split('\n').filter(l => l.trim());
        const cards = lines.map(line => {
            const parts = line.split(/[;\t]/);
            if (parts.length >= 2) {
                return { de: parts[0].trim(), uk: parts[1].trim() };
            }
            return null;
        }).filter(c => c);
        document.getElementById('bulk-output').value = JSON.stringify(cards, null, 2);
    },

    copyResult(id) {
        const el = document.getElementById(id);
        el.select();
        document.execCommand('copy');
        alert('Copied!');
    }
};

// ============ DASHBOARD MAIN ============
const Dashboard = {
    state: {
        topics: [],
        currentTopicId: null,
        currentDeck: [],
        currentView: 'empty' // empty, editor, tools, export
    },

    elements: {},

    async init() {
        this.cacheElements();
        await this.loadTopics();
        this.setupEventListeners();
    },

    cacheElements() {
        this.elements = {
            topicList: document.getElementById('topic-list'),
            addTopicBtn: document.getElementById('add-topic-btn'),
            currentViewTitle: document.getElementById('current-view-title'),
            cardItems: document.getElementById('card-items'),
            cardCount: document.getElementById('card-count'),
            addCardBtn: document.getElementById('add-card-btn'),
            saveAllBtn: document.getElementById('save-all-btn'),
            quickImportArea: document.getElementById('quick-import-area'),
            importBtn: document.getElementById('import-btn'),
            copyJsonBtn: document.getElementById('copy-json-btn'),
            modal: document.getElementById('topic-modal'),
            topicTitleInput: document.getElementById('topic-title-input'),
            topicIdInput: document.getElementById('topic-id-input'),
            modalCancel: document.getElementById('modal-cancel'),
            modalSave: document.getElementById('modal-save'),
            // Views
            emptyState: document.getElementById('empty-state'),
            editorView: document.getElementById('editor-view'),
            toolsView: document.getElementById('tools-view'),
            exportView: document.getElementById('export-view'),
            // Export buttons
            exportTopicsBtn: document.getElementById('export-topics-btn'),
            exportCurrentBtn: document.getElementById('export-current-btn'),
            exportAllBtn: document.getElementById('export-all-btn')
        };
    },

    setupEventListeners() {
        // Topic management
        this.elements.addTopicBtn.addEventListener('click', () => this.openModal());
        this.elements.modalCancel.addEventListener('click', () => this.closeModal());
        this.elements.modalSave.addEventListener('click', () => this.saveTopic());

        // Card management
        this.elements.addCardBtn.addEventListener('click', () => this.addCard());
        this.elements.importBtn.addEventListener('click', () => this.importData());
        this.elements.copyJsonBtn.addEventListener('click', () => this.copyJson());

        // Export
        this.elements.saveAllBtn.addEventListener('click', () => this.exportAll());
        this.elements.exportTopicsBtn.addEventListener('click', () => this.downloadTopics());
        this.elements.exportCurrentBtn.addEventListener('click', () => this.downloadCurrentDeck());
        this.elements.exportAllBtn.addEventListener('click', () => this.exportAll());

        // Navigation
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // Modal close on background click
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });
    },

    // ============ DATA ============
    async loadTopics() {
        try {
            const response = await fetch('../data/topics.json');
            this.state.topics = await response.json();
        } catch (e) {
            console.error('Failed to load topics', e);
            this.state.topics = [];
        }
        this.renderTopicList();
    },

    renderTopicList() {
        this.elements.topicList.innerHTML = '';
        this.state.topics.forEach(topic => {
            const div = document.createElement('div');
            div.className = `nav-item ${this.state.currentTopicId === topic.id ? 'active' : ''}`;
            div.innerHTML = `
                <span class="icon">📖</span>
                <span>${topic.title}</span>
                <span class="badge">${topic.count}</span>
            `;
            div.addEventListener('click', () => this.selectTopic(topic));
            this.elements.topicList.appendChild(div);
        });
    },

    async selectTopic(topic) {
        this.state.currentTopicId = topic.id;
        this.elements.currentViewTitle.textContent = topic.title;
        this.renderTopicList();

        try {
            const response = await fetch(`../${topic.file}`);
            this.state.currentDeck = response.ok ? await response.json() : [];
        } catch (e) {
            this.state.currentDeck = [];
        }

        this.renderCards();
        this.switchView('editor');
    },

    // ============ VIEW SWITCHING ============
    switchView(view) {
        // Hide all views
        this.elements.emptyState.classList.add('hidden');
        this.elements.editorView.classList.add('hidden');
        this.elements.toolsView.classList.add('hidden');
        this.elements.exportView.classList.add('hidden');

        // Deactivate nav items
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected view
        switch (view) {
            case 'editor':
                this.elements.editorView.classList.remove('hidden');
                break;
            case 'tools':
                this.elements.toolsView.classList.remove('hidden');
                this.elements.currentViewTitle.textContent = 'Text Tools';
                document.querySelector('.nav-item[data-view="tools"]')?.classList.add('active');
                this.state.currentTopicId = null;
                this.renderTopicList();
                break;
            case 'export':
                this.elements.exportView.classList.remove('hidden');
                this.elements.currentViewTitle.textContent = 'Export Data';
                document.querySelector('.nav-item[data-view="export"]')?.classList.add('active');
                this.state.currentTopicId = null;
                this.renderTopicList();
                break;
            default:
                this.elements.emptyState.classList.remove('hidden');
        }

        this.state.currentView = view;
    },

    // ============ CARDS ============
    renderCards() {
        this.elements.cardItems.innerHTML = '';
        this.elements.cardCount.textContent = this.state.currentDeck.length;

        this.state.currentDeck.forEach((card, index) => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
                <input type="text" class="card-input de" value="${this.escapeHtml(card.de)}" placeholder="German">
                <input type="text" class="card-input uk" value="${this.escapeHtml(card.uk)}" placeholder="Ukrainian">
                <div class="card-actions">
                    <button class="icon-btn delete" title="Delete">✕</button>
                </div>
            `;

            const inputDe = div.querySelector('.de');
            const inputUk = div.querySelector('.uk');

            inputDe.addEventListener('change', (e) => this.updateCard(index, 'de', e.target.value));
            inputUk.addEventListener('change', (e) => this.updateCard(index, 'uk', e.target.value));
            div.querySelector('.delete').addEventListener('click', () => this.deleteCard(index));

            this.elements.cardItems.appendChild(div);
        });

        this.elements.quickImportArea.value = JSON.stringify(this.state.currentDeck, null, 2);
    },

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    addCard() {
        this.state.currentDeck.push({ de: '', uk: '' });
        this.renderCards();
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

    // ============ IMPORT/EXPORT ============
    importData() {
        const text = this.elements.quickImportArea.value.trim();
        try {
            if (text.startsWith('[')) {
                this.state.currentDeck = JSON.parse(text);
            } else {
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
        alert('Copied to clipboard!');
    },

    downloadTopics() {
        this.downloadFile('topics.json', JSON.stringify(this.state.topics, null, 2));
    },

    downloadCurrentDeck() {
        if (!this.state.currentTopicId) {
            alert('Please select a topic first');
            return;
        }
        const topic = this.state.topics.find(t => t.id === this.state.currentTopicId);
        const filename = topic.file.split('/').pop();
        this.downloadFile(filename, JSON.stringify(this.state.currentDeck, null, 2));
    },

    exportAll() {
        this.downloadTopics();
        // Download all decks
        this.state.topics.forEach(async topic => {
            try {
                const response = await fetch(`../${topic.file}`);
                if (response.ok) {
                    const data = await response.json();
                    const filename = topic.file.split('/').pop();
                    setTimeout(() => {
                        this.downloadFile(filename, JSON.stringify(data, null, 2));
                    }, 100);
                }
            } catch (e) {
                console.error(`Failed to export ${topic.id}`, e);
            }
        });
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
    },

    // ============ MODAL ============
    openModal() {
        this.elements.modal.classList.remove('hidden');
        this.elements.topicTitleInput.value = '';
        this.elements.topicIdInput.value = '';
        this.elements.topicTitleInput.focus();
    },

    closeModal() {
        this.elements.modal.classList.add('hidden');
    },

    saveTopic() {
        const title = this.elements.topicTitleInput.value.trim();
        const id = this.elements.topicIdInput.value.trim().toLowerCase().replace(/\s+/g, '-');

        if (!title || !id) {
            alert('Please fill all fields');
            return;
        }
        if (this.state.topics.find(t => t.id === id)) {
            alert('ID already exists');
            return;
        }

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
    }
};

// Expose globally
window.Tools = Tools;
window.Dashboard = Dashboard;

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
