document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const els = {
        topicTrigger: document.getElementById('topic-trigger'),
        currentTopicName: document.getElementById('current-topic-name'),
        modal: document.getElementById('topics-modal'),
        closeModal: document.getElementById('close-modal'),
        topicsList: document.getElementById('topics-list'),
        
        gameArea: document.getElementById('game-area'),
        flashcard: document.getElementById('flashcard'),
        wordDe: document.getElementById('word-de'),
        wordUk: document.getElementById('word-uk'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        counter: document.getElementById('counter'),
        progressFill: document.getElementById('progress-fill'),
        playAudioBtn: document.getElementById('play-audio'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        loading: document.getElementById('loading'),
        errorMsg: document.getElementById('error-msg')
    };

    // State
    let state = {
        data: [],
        currentIndex: 0,
        voices: []
    };

    // 1. Инициализация и Меню
    fetch('data/topics.json')
        .then(res => {
            if(!res.ok) throw new Error('Failed to load topics');
            return res.json();
        })
        .then(topics => {
            // Создаем кнопки для каждой темы в модальном окне
            topics.forEach(topic => {
                const btn = document.createElement('button');
                btn.className = 'topic-item';
                btn.textContent = topic.name;
                btn.onclick = () => {
                    loadTopic(topic.file, topic.name);
                    closeModal();
                };
                els.topicsList.appendChild(btn);
            });
        })
        .catch(err => showError(err.message));

    // Управление модальным окном
    els.topicTrigger.addEventListener('click', openModal);
    els.closeModal.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => {
        if(e.target === els.modal) closeModal();
    });

    function openModal() {
        els.modal.classList.remove('hidden');
    }

    function closeModal() {
        els.modal.classList.add('hidden');
    }

    function loadTopic(filename, topicName) {
        showLoading(true);
        els.gameArea.classList.add('hidden');
        els.currentTopicName.textContent = topicName;
        
        const path = filename.startsWith('data/') ? filename : `data/${filename}`;

        fetch(path)
            .then(res => {
                if(!res.ok) throw new Error('Failed to load words');
                return res.json();
            })
            .then(data => {
                if(!data.length) throw new Error('No words found');
                state.data = data;
                state.currentIndex = 0;
                updateCard();
                showLoading(false);
                els.gameArea.classList.remove('hidden');
            })
            .catch(err => {
                showLoading(false);
                showError(err.message);
            });
    }

    // 2. Логика карточек
    function updateCard() {
        if (!state.data.length) return;
        const item = state.data[state.currentIndex];
        
        els.flashcard.classList.remove('flipped');
        
        setTimeout(() => {
            els.wordDe.textContent = item.de;
            els.wordUk.textContent = item.uk;
            
            // Адаптивный размер
            resizeText(els.wordDe, item.de);
            resizeText(els.wordUk, item.uk);

            // UI обновления
            els.counter.textContent = `${state.currentIndex + 1} / ${state.data.length}`;
            const progress = ((state.currentIndex + 1) / state.data.length) * 100;
            els.progressFill.style.width = `${progress}%`;
            
            els.prevBtn.disabled = state.currentIndex === 0;
            els.nextBtn.disabled = state.currentIndex === state.data.length - 1;
        }, 200);
    }

    function resizeText(element, text) {
        element.className = 'word-text'; 
        if (text.length > 25) {
            element.classList.add('very-long');
        } else if (text.length > 12) {
            element.classList.add('long');
        }
    }

    els.flashcard.addEventListener('click', (e) => {
        if (e.target.closest('.audio-btn')) return;
        els.flashcard.classList.toggle('flipped');
    });

    els.nextBtn.addEventListener('click', () => {
        if (state.currentIndex < state.data.length - 1) {
            state.currentIndex++;
            updateCard();
        }
    });

    els.prevBtn.addEventListener('click', () => {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            updateCard();
        }
    });

    els.shuffleBtn.addEventListener('click', () => {
        for (let i = state.data.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.data[i], state.data[j]] = [state.data[j], state.data[i]];
        }
        state.currentIndex = 0;
        updateCard();
    });

    // 3. Audio (TTS)
    function loadVoices() {
        state.voices = window.speechSynthesis.getVoices();
    }
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();

    els.playAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playText(els.wordDe.textContent);
    });

    function playText(text) {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85; 

        // Ищем голос Google или любой немецкий
        const preferredVoice = state.voices.find(v => v.name.includes('Google Deutsch')) 
                            || state.voices.find(v => v.lang.includes('de'));
        
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onerror = (e) => {
            if(e.error !== 'interrupted' && e.error !== 'canceled') {
                const fallback = new SpeechSynthesisUtterance(text);
                fallback.lang = 'de-DE';
                window.speechSynthesis.speak(fallback);
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // Helpers
    function showLoading(show) {
        els.loading.classList.toggle('hidden', !show);
    }

    function showError(msg) {
        els.errorMsg.textContent = msg;
        els.errorMsg.classList.remove('hidden');
        setTimeout(() => els.errorMsg.classList.add('hidden'), 4000);
    }
});
