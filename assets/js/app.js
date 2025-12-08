document.addEventListener('DOMContentLoaded', () => {
    // Елементи інтерфейсу
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

    // Стан додатка
    let state = {
        data: [],
        currentIndex: 0,
        voices: []
    };

    // --- 1. ІНІЦІАЛІЗАЦІЯ ТА МЕНЮ ТЕМ ---
    
    // Завантаження списку тем
    fetch('data/topics.json')
        .then(res => {
            if(!res.ok) throw new Error('Не вдалося знайти data/topics.json');
            return res.json();
        })
        .then(topics => {
            // Очищення списку перед додаванням
            els.topicsList.innerHTML = '';

            if (!Array.isArray(topics)) {
                throw new Error('Неправильний формат topics.json (очікується масив)');
            }

            topics.forEach(topic => {
                // АДАПТАЦІЯ ПІД ВАШ JSON: використовуємо topic.title
                const topicName = topic.title || topic.name || 'Тема без назви';
                const countText = topic.count ? ` (${topic.count})` : '';
                const fileName = topic.file;

                const btn = document.createElement('button');
                btn.className = 'topic-item';
                // Формуємо текст кнопки: "Назва (Кількість)"
                btn.textContent = `${topicName}${countText}`;
                
                btn.onclick = () => {
                    loadTopic(fileName, topicName);
                    closeModal();
                };
                
                els.topicsList.appendChild(btn);
            });
        })
        .catch(err => {
            console.error(err);
            showError('Помилка завантаження тем: ' + err.message);
        });

    // Логіка модального вікна
    if(els.topicTrigger) els.topicTrigger.addEventListener('click', openModal);
    if(els.closeModal) els.closeModal.addEventListener('click', closeModal);
    
    if(els.modal) {
        els.modal.addEventListener('click', (e) => {
            if(e.target === els.modal) closeModal();
        });
    }

    function openModal() {
        els.modal.classList.remove('hidden');
    }

    function closeModal() {
        els.modal.classList.add('hidden');
    }

    // Завантаження конкретного уроку
    function loadTopic(filename, topicName) {
        if(!filename) {
            showError('Файл теми не вказано в JSON');
            return;
        }

        showLoading(true);
        els.gameArea.classList.add('hidden');
        if(els.currentTopicName) els.currentTopicName.textContent = topicName;
        
        // Перевірка шляху: якщо вже є "data/", не додаємо його знову
        const path = filename.startsWith('data/') ? filename : `data/${filename}`;

        fetch(path)
            .then(res => {
                if(!res.ok) throw new Error(`Не вдалося завантажити файл: ${filename}`);
                return res.json();
            })
            .then(data => {
                if(!Array.isArray(data) || !data.length) throw new Error('Файл слів порожній або має неправильний формат');
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

    // --- 2. ЛОГІКА КАРТОК ---

    function updateCard() {
        if (!state.data.length) return;
        const item = state.data[state.currentIndex];
        
        els.flashcard.classList.remove('flipped');
        
        // Затримка для анімації перевороту
        setTimeout(() => {
            // Перевірка наявності полів de/uk
            const textDe = item.de || item.german || item.question || '???';
            const textUk = item.uk || item.ukrainian || item.answer || '???';

            els.wordDe.textContent = textDe;
            els.wordUk.textContent = textUk;
            
            // Адаптивний розмір шрифту
            resizeText(els.wordDe, textDe);
            resizeText(els.wordUk, textUk);

            // Оновлення лічильника і прогрес-бару
            els.counter.textContent = `${state.currentIndex + 1} / ${state.data.length}`;
            const progress = ((state.currentIndex + 1) / state.data.length) * 100;
            els.progressFill.style.width = `${progress}%`;
            
            // Стан кнопок навігації
            els.prevBtn.disabled = state.currentIndex === 0;
            els.nextBtn.disabled = state.currentIndex === state.data.length - 1;
        }, 200);
    }

    // Функція зменшення шрифту для довгого тексту
    function resizeText(element, text) {
        element.className = 'word-text'; // Скидання класів
        if (!text) return;
        
        if (text.length > 80) {
             element.classList.add('very-long'); // Для речень
             element.style.fontSize = '1.1rem';
        } else if (text.length > 25) {
            element.classList.add('very-long');
             element.style.fontSize = '';
        } else if (text.length > 12) {
            element.classList.add('long');
             element.style.fontSize = '';
        } else {
             element.style.fontSize = '';
        }
    }

    // Переворот картки
    els.flashcard.addEventListener('click', (e) => {
        if (e.target.closest('.audio-btn')) return;
        els.flashcard.classList.toggle('flipped');
    });

    // Навігація
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

    // Перемішування
    els.shuffleBtn.addEventListener('click', () => {
        for (let i = state.data.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.data[i], state.data[j]] = [state.data[j], state.data[i]];
        }
        state.currentIndex = 0;
        updateCard();
    });

    // --- 3. ОЗВУЧЕННЯ (Web Speech API) ---

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
        if (!window.speechSynthesis) {
            alert("Ваш браузер не підтримує озвучення");
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85; 

        // Пріоритет: Google Deutsch -> Будь-який німецький
        const preferredVoice = state.voices.find(v => v.name.includes('Google Deutsch')) 
                            || state.voices.find(v => v.lang.includes('de'));
        
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onerror = (e) => {
            console.warn('TTS Warning:', e);
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Допоміжні функції ---

    function showLoading(show) {
        els.loading.classList.toggle('hidden', !show);
    }

    function showError(msg) {
        els.errorMsg.textContent = msg;
        els.errorMsg.classList.remove('hidden');
        setTimeout(() => els.errorMsg.classList.add('hidden'), 5000);
    }
});
