# NeuroQuest — Aptitude Test (Batman / Gotham Edition)

A themed aptitude test web app with animated background, 30-second per-question timer, score-based pass notification, and no-repeat-across-sessions question logic.

This repository contains two versions:

| Folder / file | What it is |
|---|---|
| `aptitude-next/` | **Next.js 14 (App Router)** version — primary, recommended |
| `aptitude-test.html` | Standalone single-file HTML version (open directly in a browser) |
| `questions.json` | Older standalone question pool used by the HTML version |

## Quick start (Next.js version)

```bash
cd aptitude-next
npm install
npm run dev
```

Then open **http://localhost:3000**.

## Features

- 🦇 **Batman / Gotham theme** — Bat-Signal beam, rotating Bat symbol watermarks, Gotham skyline silhouette, yellow city lights
- 🧠 **General-knowledge question pool** (30 questions) loaded from `aptitude-next/public/questions.json`
- 🔁 **No-repeat-across-sessions** — `localStorage` tracks seen questions, cycles cleanly when the pool is exhausted
- ⏱️ **30-second countdown ring** per question (cyan → gold → red → "STOPPED" when answered)
- 🎯 **Pass mark 7/10** — when reached, fires:
  - In-page slide-in toast
  - Browser / Windows toast notification
  - Mini confetti burst
  - Big confetti shower at end of test
- 🎵 **Cinematic theme music** — procedural Web Audio synth (D-minor cinematic loop with arpeggio); drop your own MP3 at `aptitude-next/public/music/theme.mp3` to override
- ⌨️ **Mute toggle** in the HUD

## Editing content

Change questions, pass mark, timer length, or questions-per-test by editing `aptitude-next/public/questions.json`:

```json
{
  "config": {
    "passMark": 7,
    "secondsPerQuestion": 30,
    "questionsPerTest": 10
  },
  "questions": [...]
}
```

## Build for production

```bash
cd aptitude-next
npm run build
npm start
```
