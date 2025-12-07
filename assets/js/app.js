/**
 * German Learning App
 * Core Logic
 */

// --- TTS Module ---
const TTS = {
  voice: null,
  init() {
    // Attempt to load voices immediately and on change
    this.loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  },
  loadVoices() {
    const voices = speechSynthesis.getVoices();
    // Priority: Google Deutsch -> Any 'de-DE' -> Any 'de'
    this.voice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('de')) ||
      voices.find(v => v.lang === 'de-DE') ||
      voices.find(v => v.lang.startsWith('de'));

    if (!this.voice) {
      console.warn('No German voice found. TTS may not work as expected.');
    } else {
      console.log('Selected voice:', this.voice.name);
    }
  },
  speak(text) {
    if (!text) return;
    // Cancel any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'de-DE';
    utterance.rate = 0.9; // Slightly slower for learning
    speechSynthesis.speak(utterance);
  }
};

// --- Deck Manager ---
const DeckManager = {
  topics: [],
  currentDeck: [],
  currentIndex: 0,

  async loadTopics() {
    try {
      const response = await fetch('data/topics.json');
      this.topics = await response.json();
      return this.topics;
    } catch (e) {
      console.error('Failed to load topics', e);
      return [];
    }
  },

  async loadDeck(file) {
    try {
      const response = await fetch(file);
      const data = await response.json();
      // Shuffle deck for variety
      this.currentDeck = this.shuffle(data);
      this.currentIndex = 0;
      return this.currentDeck;
    } catch (e) {
      console.error('Failed to load deck', e);
      return [];
    }
  },

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  getCurrentCard() {
    return this.currentDeck[this.currentIndex];
  },

  nextCard() {
    if (this.currentIndex < this.currentDeck.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false; // End of deck
  },

  restart() {
    this.currentIndex = 0;
    this.currentDeck = this.shuffle(this.currentDeck);
  }
};

// --- UI Controller ---
const UI = {
  elements: {
    homeView: document.getElementById('home-view'),
    studyView: document.getElementById('study-view'),
    topicList: document.getElementById('topic-list'),
    flashcard: document.getElementById('flashcard'),
    cardFront: document.querySelector('.card-front'),
    cardBack: document.querySelector('.card-back'),
    topicTitle: document.getElementById('study-topic-title'),
    nextBtn: document.getElementById('next-btn'),
    restartBtn: document.getElementById('restart-btn'),
    progressFill: document.getElementById('progress-fill')
  },

  init() {
    // Event Listeners
    this.elements.flashcard.addEventListener('click', () => this.flipCard());
    this.elements.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.nextCard();
    });
    this.elements.restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restartDeck();
    });

    // Handle browser back button
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view === 'study') {
        this.showStudyMode(e.state.topicId, false);
      } else {
        this.showHome(false);
      }
    });
  },

  renderTopics(topics) {
    this.elements.topicList.innerHTML = '';
    topics.forEach(topic => {
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.innerHTML = `
        <span class="topic-title">${topic.title}</span>
        <span class="topic-count">${topic.count} карток</span>
      `;
      card.addEventListener('click', () => {
        App.startTopic(topic);
      });
      this.elements.topicList.appendChild(card);
    });
  },

  showHome(pushState = true) {
    this.elements.homeView.classList.remove('hidden');
    this.elements.studyView.classList.add('hidden');
    if (pushState) history.pushState({ view: 'home' }, '', '#');
  },

  showStudyMode(topic, pushState = true) {
    this.elements.homeView.classList.add('hidden');
    this.elements.studyView.classList.remove('hidden');
    this.elements.topicTitle.textContent = topic.title;
    if (pushState) history.pushState({ view: 'study', topicId: topic.id }, '', `#${topic.id}`);

    this.showCard(DeckManager.getCurrentCard());
  },

  showCard(card) {
    if (!card) return;

    // Reset state
    this.elements.flashcard.classList.remove('flipped');

    // Update content
    setTimeout(() => {
      // Determine text size class based on length
      const isLongDE = card.de.length > 40;
      const isLongUK = card.uk.length > 40;

      // Front content with adaptive class
      this.elements.cardFront.innerHTML = '';
      const frontContent = document.createElement('div');
      frontContent.className = 'card-front-content';
      if (isLongDE) {
        frontContent.classList.add('long');
      } else if (card.de.length <= 15) {
        frontContent.classList.add('short');
      }
      frontContent.textContent = card.de;
      this.elements.cardFront.appendChild(frontContent);

      // Back content
      const translation = document.createElement('div');
      translation.className = 'translation';
      if (isLongUK) {
        translation.classList.add('long');
      }
      translation.textContent = card.uk;

      const audioBtn = document.createElement('button');
      audioBtn.className = 'audio-btn';
      audioBtn.innerHTML = `
        <svg class="audio-icon" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      `;
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        TTS.speak(card.de);
      });

      this.elements.cardBack.innerHTML = '';
      this.elements.cardBack.appendChild(translation);
      this.elements.cardBack.appendChild(audioBtn);

      // Update progress bar
      const progress = ((DeckManager.currentIndex + 1) / DeckManager.currentDeck.length) * 100;
      this.elements.progressFill.style.width = `${progress}%`;

      // Controls
      this.elements.nextBtn.classList.add('hidden');
      this.elements.restartBtn.classList.add('hidden');
    }, 200);
  },

  flipCard() {
    const card = this.elements.flashcard;
    const isFlipped = card.classList.contains('flipped');

    if (!isFlipped) {
      card.classList.add('flipped');
      // Auto play audio on flip
      const currentCard = DeckManager.getCurrentCard();
      TTS.speak(currentCard.de);

      // Show Next button
      if (DeckManager.currentIndex < DeckManager.currentDeck.length - 1) {
        this.elements.nextBtn.classList.remove('hidden');
      } else {
        this.elements.restartBtn.classList.remove('hidden');
      }
    } else {
      // Optional: Allow flipping back? Anki usually doesn't, but for UI exploration it's fine.
      // We will allow flipping back to see the German word again.
      card.classList.remove('flipped');
    }
  },

  nextCard() {
    if (DeckManager.nextCard()) {
      this.showCard(DeckManager.getCurrentCard());
    }
  },

  restartDeck() {
    DeckManager.restart();
    this.showCard(DeckManager.getCurrentCard());
  }
};

// --- Main App ---
const App = {
  async init() {
    TTS.init();
    UI.init();

    const topics = await DeckManager.loadTopics();
    UI.renderTopics(topics);

    // Check URL for direct link
    const hash = window.location.hash.slice(1);
    if (hash) {
      const topic = topics.find(t => t.id === hash);
      if (topic) {
        this.startTopic(topic);
      }
    }
  },

  async startTopic(topic) {
    await DeckManager.loadDeck(topic.file);
    UI.showStudyMode(topic);
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
