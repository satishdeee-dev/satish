# NeuroQuest — Themed Aptitude Test

A Next.js 14 (App Router) interview-flow app:

1. 🎥 **Video Round** — YouTube-embedded MCQs from a built-in API
2. 🤝 **HR Round** — behavioural MCQs from the `/api/hr` route
3. 🏆 **Company Match** — random tech-org pulled from the GitHub Orgs API, with apply links

Plus a live home-screen widget showing your **city, country flag, current weather, and time** (via Open-Meteo + BigDataCloud + FlagCDN), and a drifting background of real **IT company logos** from GitHub's API.

Live: **https://satish-qwcv.vercel.app/**

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

## Project structure

```
.
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Server component, mounts <AptitudeTest />
│   ├── AptitudeTest.js        # 'use client' — quiz logic, timer, music, weather, etc.
│   ├── globals.css            # Theme + responsive layout
│   └── api/
│       ├── hr/route.js                # HR Round questions
│       └── video-questions/route.js   # Video Round questions
├── public/
│   ├── questions.json         # Local fallback pool + config
│   └── music/                 # Drop your own theme.mp3 here
├── package.json
├── next.config.mjs
└── legacy/                    # Standalone single-file HTML version
    ├── aptitude-test.html
    └── questions.json
```

## Configuration

`public/questions.json`:

```json
{
  "config": {
    "passMark": 4,
    "secondsPerQuestion": 60,
    "questionsPerTest": 5,
    "apiSource": "video",     // "video" | "opentdb" | "local"
    "apiCategory": 9          // OpenTDB category id (only used when apiSource is "opentdb")
  }
}
```

## External APIs used (all free, no keys required)

| API | Purpose |
|---|---|
| `opentdb.com` | General-knowledge trivia (with session-token de-duping) |
| `youtube.com/embed` | Video question playback |
| `api.github.com/orgs/{org}` | Company match + IT logo background |
| `api.open-meteo.com` | Live current weather |
| `api.bigdatacloud.net` | Reverse-geocoding (lat/lon → city/country) |
| `flagcdn.com` | Country flag images |
| `ipapi.co` | IP-based geolocation fallback |

## Build for production

```bash
npm run build
npm start
```

## Deploying

This repo is structured for one-click Vercel deploys. Push to `main` → auto-redeploys.
