/**
 * Admin Dashboard - Complete Logic
 * Includes: Topic Management, Card Editor, Text Tools, Persistence, Import/Export, GitHub API
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

// ============ GITHUB API ============
const GitHubAPI = {
    token: null,
    owner: null,
    repo: null,
    branch: 'main',

    init() {
        const stored = localStorage.getItem('github_config');
        if (stored) {
            const config = JSON.parse(stored);
            this.token = config.token;
            this.owner = config.owner;
            this.repo = config.repo;
            return true;
        }
        return false;
    },

    saveConfig(token, owner, repo) {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        localStorage.setItem('github_config', JSON.stringify({ token, owner, repo }));
    },

    async getFile(path) {
        if (!this.token) throw new Error('No GitHub token');
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }
        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content))); // Decode Base64
        return { content: JSON.parse(content), sha: data.sha };
    },

    async saveFile(path, content, message, sha = null) {
        if (!this.token) throw new Error('No GitHub token');
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;

        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))), // Encode Base64
            branch: this.branch
        };
        if (sha) body.sha = sha;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
        return await response.json();
    }
};

// ============ DASHBOARD MAIN ============
const Dashboard = {
    state: {
        topics: [],
        currentTopicId: null,
        currentDeck: [],
        currentView: 'empty',
        decks: {},
        shas: {}, // Store Git SHAs for updates
        isGitHubConnected: false
    },

    elements: {},

    async init() {
        this.cacheElements();

        // Check GitHub connection
        if (GitHubAPI.init()) {
            this.state.isGitHubConnected = true;
            this.updateGitHubStatus(true);
            await this.loadDataFromGitHub();
        } else {
            await this.loadData(); // Fallback to local/file
        }

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
            modalTitle: document.getElementById('modal-title'),
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
            exportAllBtn: document.getElementById('export-all-btn'),
            // Import
            fileImportInput: document.getElementById('file-import-input'),
            importFileBtn: document.getElementById('import-file-btn'),
            // GitHub
            githubBtn: document.getElementById('github-btn'),
            githubModal: document.getElementById('github-modal'),
            githubToken: document.getElementById('github-token'),
            githubOwner: document.getElementById('github-owner'),
            githubRepo: document.getElementById('github-repo'),
            githubSave: document.getElementById('github-save'),
            githubCancel: document.getElementById('github-cancel'),
            syncBtn: document.getElementById('sync-btn')
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

        // Import File
        this.elements.importFileBtn?.addEventListener('click', () => this.elements.fileImportInput.click());
        this.elements.fileImportInput?.addEventListener('change', (e) => this.handleFileImport(e));

        // GitHub
        this.elements.githubBtn?.addEventListener('click', () => this.openGitHubModal());
        this.elements.githubCancel?.addEventListener('click', () => this.closeGitHubModal());
        this.elements.githubSave?.addEventListener('click', () => this.connectGitHub());
        this.elements.syncBtn?.addEventListener('click', () => this.syncToGitHub());

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

    // ============ DATA & PERSISTENCE ============
    async loadData() {
        // Try LocalStorage first
        const savedTopics = localStorage.getItem('german_app_topics');
        const savedDecks = localStorage.getItem('german_app_decks');

        if (savedTopics && savedDecks) {
            console.log('Loaded from LocalStorage');
            this.state.topics = JSON.parse(savedTopics);
            this.state.decks = JSON.parse(savedDecks);
        } else {
            console.log('Loading from JSON files');
            await this.loadTopicsFromFiles();
        }
        this.renderTopicList();
    },

    async loadTopicsFromFiles() {
        try {
            const response = await fetch('../data/topics.json');
            this.state.topics = await response.json();

            // Load all decks
            for (const topic of this.state.topics) {
                try {
                    const deckRes = await fetch(`../${topic.file}`);
                    if (deckRes.ok) {
                        this.state.decks[topic.id] = await deckRes.json();
                    } else {
                        this.state.decks[topic.id] = [];
                    }
                } catch (e) {
                    this.state.decks[topic.id] = [];
                }
            }
            this.saveToLocalStorage();
        } catch (e) {
            console.error('Failed to load topics', e);
            this.state.topics = [];
        }
    },

    async loadDataFromGitHub() {
        try {
            this.elements.syncBtn.textContent = '⏳ Loading...';

            // Load topics.json
            const topicsData = await GitHubAPI.getFile('data/topics.json');
            if (topicsData) {
                this.state.topics = topicsData.content;
                this.state.shas['topics.json'] = topicsData.sha;
            }

            // Load all decks
            for (const topic of this.state.topics) {
                const deckData = await GitHubAPI.getFile(topic.file);
                if (deckData) {
                    this.state.decks[topic.id] = deckData.content;
                    this.state.shas[topic.file] = deckData.sha;
                } else {
                    this.state.decks[topic.id] = [];
                }
            }

            this.saveToLocalStorage();
            this.renderTopicList();
            this.elements.syncBtn.textContent = '☁️ Sync to GitHub';
            alert('Loaded data from GitHub!');
        } catch (e) {
            console.error(e);
            alert('Failed to load from GitHub: ' + e.message);
            this.elements.syncBtn.textContent = '❌ Sync Failed';
        }
    },

    async syncToGitHub() {
        if (!this.state.isGitHubConnected) {
            alert('Please connect to GitHub first');
            return;
        }

        if (!confirm('This will commit changes to the GitHub repository. Continue?')) return;

        try {
            this.elements.syncBtn.textContent = '⏳ Syncing...';

            // 1. Save topics.json
            const topicsSha = this.state.shas['topics.json'];
            const topicsRes = await GitHubAPI.saveFile(
                'data/topics.json',
                this.state.topics,
                'update: topics.json via Admin',
                topicsSha
            );
            this.state.shas['topics.json'] = topicsRes.content.sha;

            // 2. Save all decks
            for (const topic of this.state.topics) {
                const deck = this.state.decks[topic.id] || [];
                const fileSha = this.state.shas[topic.file];

                const deckRes = await GitHubAPI.saveFile(
                    topic.file,
                    deck,
                    `update: ${topic.title} via Admin`,
                    fileSha
                );
                this.state.shas[topic.file] = deckRes.content.sha;
            }

            this.elements.syncBtn.textContent = '✅ Synced!';
            setTimeout(() => this.elements.syncBtn.textContent = '☁️ Sync to GitHub', 2000);
            alert('Successfully synced to GitHub! Changes will be live in a few minutes.');
        } catch (e) {
            console.error(e);
            alert('Sync failed: ' + e.message);
            this.elements.syncBtn.textContent = '❌ Sync Failed';
        }
    },

    saveToLocalStorage() {
        localStorage.setItem('german_app_topics', JSON.stringify(this.state.topics));
        localStorage.setItem('german_app_decks', JSON.stringify(this.state.decks));
    },

    renderTopicList() {
        this.elements.topicList.innerHTML = '';
        this.state.topics.forEach(topic => {
            const div = document.createElement('div');
            div.className = `nav-item ${this.state.currentTopicId === topic.id ? 'active' : ''}`;
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
                    <span class="icon">📖</span>
                    <span class="topic-name">${topic.title}</span>
                </div>
                <div class="topic-actions">
                    <button class="icon-btn edit-topic" title="Edit" style="width:24px;height:24px;">✏️</button>
                    <button class="icon-btn delete-topic" title="Delete" style="width:24px;height:24px;">🗑️</button>
                </div>
                <span class="badge">${topic.count}</span>
            `;

            // Click on item selects topic
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.topic-actions')) {
                    this.selectTopic(topic);
                }
            });

            // Edit button
            div.querySelector('.edit-topic').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openModal(topic);
            });

            // Delete button
            div.querySelector('.delete-topic').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete topic "${topic.title}"?`)) {
                    this.deleteTopic(topic.id);
                }
            });

            this.elements.topicList.appendChild(div);
        });
    },

    selectTopic(topic) {
        this.state.currentTopicId = topic.id;
        this.elements.currentViewTitle.textContent = topic.title;
        this.renderTopicList();

        // Load from memory state
        this.state.currentDeck = this.state.decks[topic.id] || [];

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
        this.saveToLocalStorage();
    },

    updateCard(index, field, value) {
        this.state.currentDeck[index][field] = value;
        this.elements.quickImportArea.value = JSON.stringify(this.state.currentDeck, null, 2);
        this.saveToLocalStorage();
    },

    deleteCard(index) {
        this.state.currentDeck.splice(index, 1);
        this.renderCards();
        this.updateTopicCount();
        this.saveToLocalStorage();
    },

    updateTopicCount() {
        const topic = this.state.topics.find(t => t.id === this.state.currentTopicId);
        if (topic) {
            topic.count = this.state.currentDeck.length;
            this.renderTopicList();
            this.saveToLocalStorage();
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
            this.saveToLocalStorage();
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
        // 1. Download topics.json
        this.downloadTopics();

        // 2. Download all decks
        let delay = 500;
        this.state.topics.forEach(topic => {
            const deck = this.state.decks[topic.id] || [];
            const filename = topic.file.split('/').pop();
            setTimeout(() => {
                this.downloadFile(filename, JSON.stringify(deck, null, 2));
            }, delay);
            delay += 500;
        });

        alert('Downloading files... Please allow multiple downloads if prompted.');
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

    // ============ FILE IMPORT ============
    handleFileImport(event) {
        const files = event.target.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const json = JSON.parse(content);

                    // Check if it's a topics file or a deck file
                    if (Array.isArray(json) && json.length > 0 && json[0].id && json[0].title) {
                        // It's topics.json
                        if (confirm('Import topics.json? This will merge with existing topics.')) {
                            this.mergeTopics(json);
                        }
                    } else if (Array.isArray(json)) {
                        // It's a deck
                        const filename = file.name.replace('.json', '');
                        // Try to find matching topic by ID (filename)
                        const topic = this.state.topics.find(t => t.id === filename);
                        if (topic) {
                            this.state.decks[topic.id] = json;
                            topic.count = json.length;
                            alert(`Updated deck for topic: ${topic.title}`);
                        } else {
                            // Create new topic
                            const newId = filename.toLowerCase().replace(/\s+/g, '-');
                            const newTopic = {
                                id: newId,
                                title: filename, // Use filename as title initially
                                file: `data/${newId}.json`,
                                count: json.length
                            };
                            this.state.topics.push(newTopic);
                            this.state.decks[newId] = json;
                            alert(`Created new topic: ${filename}`);
                        }
                    }
                    this.saveToLocalStorage();
                    this.renderTopicList();
                } catch (err) {
                    console.error('Error parsing file', err);
                    alert(`Error importing ${file.name}: Invalid JSON`);
                }
            };
            reader.readAsText(file);
        });
        // Reset input
        event.target.value = '';
    },

    mergeTopics(newTopics) {
        newTopics.forEach(nt => {
            const existing = this.state.topics.find(t => t.id === nt.id);
            if (!existing) {
                this.state.topics.push(nt);
            } else {
                existing.title = nt.title;
                existing.count = nt.count;
            }
        });
    },

    // ============ GITHUB UI ============
    openGitHubModal() {
        this.elements.githubModal.classList.remove('hidden');
        const stored = localStorage.getItem('github_config');
        if (stored) {
            const config = JSON.parse(stored);
            this.elements.githubToken.value = config.token;
            this.elements.githubOwner.value = config.owner;
            this.elements.githubRepo.value = config.repo;
        }
    },

    closeGitHubModal() {
        this.elements.githubModal.classList.add('hidden');
    },

    connectGitHub() {
        const token = this.elements.githubToken.value.trim();
        const owner = this.elements.githubOwner.value.trim();
        const repo = this.elements.githubRepo.value.trim();

        if (!token || !owner || !repo) {
            alert('Please fill all fields');
            return;
        }

        GitHubAPI.saveConfig(token, owner, repo);
        this.state.isGitHubConnected = true;
        this.updateGitHubStatus(true);
        this.closeGitHubModal();

        // Initial load
        this.loadDataFromGitHub();
    },

    updateGitHubStatus(connected) {
        if (connected) {
            this.elements.githubBtn.textContent = '✅ GitHub Connected';
            this.elements.githubBtn.classList.add('connected');
            this.elements.syncBtn.classList.remove('hidden');
        } else {
            this.elements.githubBtn.textContent = '☁️ Connect GitHub';
            this.elements.githubBtn.classList.remove('connected');
            this.elements.syncBtn.classList.add('hidden');
        }
    },

    // ============ MODAL ============
    openModal(topicToEdit = null) {
        this.elements.modal.classList.remove('hidden');
        if (topicToEdit) {
            this.elements.modalTitle.textContent = 'Edit Topic';
            this.elements.topicTitleInput.value = topicToEdit.title;
            this.elements.topicIdInput.value = topicToEdit.id;
            this.elements.topicIdInput.disabled = true; // Cannot change ID
            this.state.editingTopicId = topicToEdit.id;
        } else {
            this.elements.modalTitle.textContent = 'New Topic';
            this.elements.topicTitleInput.value = '';
            this.elements.topicIdInput.value = '';
            this.elements.topicIdInput.disabled = false;
            this.state.editingTopicId = null;
        }
        this.elements.topicTitleInput.focus();
    },

    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.state.editingTopicId = null;
    },

    saveTopic() {
        const title = this.elements.topicTitleInput.value.trim();

        if (this.state.editingTopicId) {
            // Edit existing
            const topic = this.state.topics.find(t => t.id === this.state.editingTopicId);
            if (topic) {
                topic.title = title;
                this.renderTopicList();
                if (this.state.currentTopicId === topic.id) {
                    this.elements.currentViewTitle.textContent = title;
                }
            }
        } else {
            // Create new
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
            this.state.decks[id] = []; // Initialize empty deck
            this.selectTopic(newTopic);
        }

        this.saveToLocalStorage();
        this.closeModal();
        this.renderTopicList();
    },

    deleteTopic(id) {
        this.state.topics = this.state.topics.filter(t => t.id !== id);
        delete this.state.decks[id];

        if (this.state.currentTopicId === id) {
            this.state.currentTopicId = null;
            this.switchView('empty');
        }
        this.saveToLocalStorage();
        this.renderTopicList();
    }
};

// Expose globally
window.Tools = Tools;
window.Dashboard = Dashboard;
window.GitHubAPI = GitHubAPI;

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
