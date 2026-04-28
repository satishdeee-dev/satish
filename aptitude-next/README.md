# NeuroQuest — Next.js Aptitude Test

Robotics-themed aptitude challenge built with Next.js (App Router).

## Run locally

```bash
cd aptitude-next
npm install
npm run dev
```

Open http://localhost:3000

## Project structure

```
aptitude-next/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Server component, mounts <AptitudeTest />
│   ├── AptitudeTest.js    # 'use client' — quiz state, timer, shuffling, confetti
│   └── globals.css        # Robotics background + UI styles
├── public/
│   └── questions.json     # Questions, options, answer index, config
├── package.json
├── next.config.mjs
└── jsconfig.json
```

## Editing questions

Edit `public/questions.json`. The `config` block controls `passMark` and `secondsPerQuestion`.

## Build

```bash
npm run build
npm start
```
