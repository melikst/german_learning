# 🇩🇪 German Learning App

A fully autonomous, offline-capable flashcard application for learning German with Ukrainian translations. **Made specially for my brother Arthur.**

## Features

- **Flashcards**: Flip cards to reveal translations
- **Text-to-Speech**: Native German pronunciation using Web Speech API
- **Offline Support**: Works without internet after first load
- **Dark Mode**: Automatic theme based on system preference
- **Admin Dashboard**: Hidden admin interface for content management

## Quick Start

1. Clone the repository
2. Open `index.html` in a browser (or use a local server)
3. Select a topic and start learning!

## Admin Dashboard

Access the admin interface at `/admin/builder.html`.

### Features:
- **Topic Management**: Create, edit, delete topics
- **Card Editor**: Add/edit German-Ukrainian pairs
- **Text Tools**: Concatenator, splitter, case converter, trimmer
- **Export**: Download data as JSON files

## Deployment

This project is designed for GitHub Pages:

1. Push to `main` branch
2. GitHub Actions will automatically deploy
3. Access at `https://<username>.github.io/<repo-name>/`

## Data Structure

```
data/
├── topics.json    # Topic registry
├── basics.json    # Flashcard data
└── food.json      # Flashcard data
```

### Card Format
```json
[
  { "de": "Hallo", "uk": "Привіт" },
  { "de": "Danke", "uk": "Дякую" }
]
```

## Tech Stack

- Vanilla JavaScript (no frameworks)
- CSS Custom Properties (dark mode)
- Web Speech API (TTS)
- Service Worker (offline)

## License

MIT
