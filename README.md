# Skyward Scrap Runner

An original retro-inspired 2D platformer built with **Next.js App Router + TypeScript + Tailwind + Canvas 2D**.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm run start
```

## Controls

### Keyboard
- Move: `A/D` or `ArrowLeft/ArrowRight`
- Jump: `W` or `ArrowUp` or `Space`
- Sprint: `Shift`
- Pause: `P`

### Mobile touch
- Bottom-left: Left/Right buttons
- Bottom-right: Sprint + Jump buttons

## Features
- 3 unique levels with progression and victory screen
- Local progression save + level select + continue
- Score breakdown (collect, enemy, time, completion)
- 3 hearts, hazards (spikes/pits), moving platform
- 2 enemy AI types (patrol + hopper/charger)
- Local top-10 leaderboard
- Procedural Web Audio chip-beeps (no copyrighted music)

## Deploy on Vercel
No special Vercel settings needed.
- Framework preset: Next.js (auto-detected)
- Root Directory: repository root
- Output directory: default

## localStorage keys
- `skyward.scrap.progress.v1`
- `skyward.scrap.leaderboard.v1`
