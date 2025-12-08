document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const topicSelect = document.getElementById('topic-select');
    const gameArea = document.getElementById('game-area');
    const flashcard = document.getElementById('flashcard');
    const wordDe = document.getElementById('word-de');
    const wordUk = document.getElementById('word-uk');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('counter');
    const playAudioBtn = document.getElementById('play-audio');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-msg');

    // Стан додатка
    let currentData = [];
    let currentIndex = 0;
    let voices = [];

    // --- 1. Ініціалізація та Завантаження даних ---

    // Завантаження списку тем
    fetch('data/topics.json')
        .then(response => {
            if (!response.ok) throw new Error('Не вдалося завантажити topics.json');
            return response.json();
        })
        .then(topics => {
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.file; // Передбачається, що в topics.json є поле "file": "basics.json"
                option.textContent = topic.name;
                topicSelect.appendChild(option);
            });
        })
        .catch(err => showError(err.message));

    // Обробка вибору теми
    topicSelect.addEventListener('change', (e) => {
        const file = e.target.value;
        if (!file) return;
        loadTopicData(file);
    });

    function loadTopicData(filename) {
        showLoading(true);
        gameArea.classList.add('hidden');
        
        // Перевірка шляху: якщо файл просто "basics.json", додаємо "data/"
        const path = filename.startsWith('data/') ? filename : `data/${filename}`;

        fetch(path)
            .then(response => {
                if (!response.ok) throw new Error(`Не вдалося завантажити ${filename}`);
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Файл даних порожній або має неправильний формат');
                }
                currentData = data;
                currentIndex = 0;
                updateCard();
                showLoading(false);
                gameArea.classList.remove('hidden');
            })
            .catch(err => {
                showLoading(false);
                showError(`Помилка: ${err.message}`);
            });
    }

    // --- 2. Логіка карток ---

    function updateCard() {
        if (currentData.length === 0) return;
        
        const item = currentData[currentIndex];
        
        // Скидаємо перевертання
        flashcard.classList.remove('flipped');
        
        // Оновлюємо текст (з невеликою затримкою для анімації, якщо картка була перевернута)
        setTimeout(() => {
            wordDe.textContent = item.de;
            wordUk.textContent = item.uk;
            counter.textContent = `${currentIndex + 1} / ${currentData.length}`;
            
            // Стан кнопок
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === currentData.length - 1;
        }, 150);
    }

    flashcard.addEventListener('click', (e) => {
        // Не перевертати, якщо натиснули на кнопку звуку
        if (e.target.closest('.audio-btn')) return;
        flashcard.classList.toggle('flipped');
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentData.length - 1) {
            currentIndex++;
            updateCard();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCard();
        }
    });

    shuffleBtn.addEventListener('click', () => {
        // Алгоритм Тасувальника Фішера-Єтса
        for (let i = currentData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentData[i], currentData[j]] = [currentData[j], currentData[i]];
        }
        currentIndex = 0;
        updateCard();
    });

    // --- 3. ОЗВУЧКА (ВИПРАВЛЕНО) ---
    
    // Завантаження голосів
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
    }
    
    // Деякі браузери завантажують голоси асинхронно
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();

    playAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Запобігає перевертанню картки
        const text = wordDe.textContent;
        speakText(text);
    });

    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            alert('Ваш браузер не підтримує озвучення.');
            return;
        }

        // Скасувати попереднє озвучення, якщо воно йде
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE'; // Встановлюємо німецьку мову
        utterance.rate = 0.9; // Трохи повільніше для навчання

        // Спроба знайти найкращий голос (Google або німецький)
        // Ми шукаємо голоси, що містять "Google" і "de", або просто "de"
        const germanVoice = voices.find(v => v.lang.includes('de') && v.name.includes('Google')) 
                         || voices.find(v => v.lang.includes('de'));

        if (germanVoice) {
            utterance.voice = germanVoice;
        }

        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            // Іноді помилка виникає, якщо занадто швидко клацати. Ігноруємо "interrupted"
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                showError('Помилка відтворення звуку. Спробуйте ще раз.');
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Допоміжні функції ---

    function showLoading(isLoading) {
        loading.classList.toggle('hidden', !isLoading);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        setTimeout(() => {
            errorMsg.classList.add('hidden');
        }, 5000);
    }
});
