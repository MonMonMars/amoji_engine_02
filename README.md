# Amoji Companion (`amoji_engine_02`)

**3D voice & text companion** — 23 legal VRM characters, anime scenes, Cantonese/English, cloud-hosted on Vercel.

## Live demo

| Link | Use |
|------|-----|
| **[Open /play](https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play)** | Bookmark this — fresh cache-safe URL every visit |
| [English + picker](https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=en&pick=1&automic=0) | Character select + chat |
| [粵語 + picker](https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=yue&pick=1&automic=0) | 粵語 |
| [Health / build id](https://temporary-rushing-oxygen-ok5jzhd.vercel.app/api/health) | Deploy verification JSON |
| [Vercel dashboard](https://vercel.com/mars2350-1971/temporary-rushing-oxygen-ok5jzhd) | Deploy status |

Current build id: see `amoji-engine/engine/companion/buildVersion.mjs` (`AMOJI_BUILD`).

## What’s in the app

- **Unified 3D app** (`prototypes/amoji-companion.html`) — girlfriend / boyfriend / secretary / pet via **character roster**, not separate apps
- **Start picker** — AAA-style roster, scene background on picker, **Begin chat**
- **In session** — mic + text composer, Menu (language, voice, switch companion, brain/LLM, shop)
- **Models** — `companion-<characterId>.vrm` per selection (see Menu → **About** for build & roster revision)
- **Mobile hub** — `/app` wraps companion in iframe shells

## Repo layout

| Path | Description |
|------|-------------|
| [`amoji-engine/`](./amoji-engine/) | Companion engine, unit tests, lab scripts |
| [`prototypes/`](./prototypes/) | `amoji-companion.html`, CSS, VRM/png assets |
| [`scripts/`](./scripts/) | Playwright verify, pre-delivery gate, smoke tests |
| [`AGENTS.md`](./AGENTS.md) | Agent verify rules, demo links, Cursor Cloud notes |
| [`DEPLOY.md`](./DEPLOY.md) | Vercel deploy |

## Verify before sharing links

```bash
npm install
cd amoji-engine && npm ci && npm test

# Full gate (local)
npm run verify:pre-delivery

# After deploy
npm run verify:pre-delivery:prod

# Quick debug trace
npm run verify:debug
```

## Local dev

```bash
cd amoji-engine && node scripts/lab-serve.mjs
# → http://127.0.0.1:5173/play
```

Optional: [`prototypes/realtime-voice-lab.html`](./prototypes/realtime-voice-lab.html) for Realtime / Face Live experiments — see [amoji-engine/README.md](./amoji-engine/README.md).

## Requirements

- Node.js 20+
- Legal VRM assets: `npm run postinstall` or `node amoji-engine/scripts/download-legal-vrm.mjs`
