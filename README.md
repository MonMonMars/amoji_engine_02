# amoji_engine_02

A small **emoji engine**: search a curated emoji catalog, compose a creation, and copy it anywhere. Built with Vite + React + TypeScript.

## Features

- Fuzzy-ish text search over emoji names and keywords with relevance ranking
- Category filtering (Smileys, People, Animals, Nature, Food, Travel, Activities, Objects, Symbols)
- A composition stage to build an emoji string (up to 12 slots) and copy it to the clipboard
- A pure, unit-tested engine core (`src/engine/`) decoupled from the UI

## Getting started

```bash
npm ci        # install dependencies (uses the committed lockfile)
npm run dev   # start the dev server on http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (host `0.0.0.0`, port `5173`) |
| `npm run build` | Type-check then produce a production build in `dist/` |
| `npm run preview` | Serve the production build on port `4173` |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Run the unit tests once with Vitest |

## Project layout

```
src/
  engine/
    emojiData.ts    # curated, hand-tagged emoji catalog
    engine.ts       # search/scoring + composition model (pure functions)
    engine.test.ts  # Vitest unit tests for the engine
  App.tsx           # UI: search, category tabs, grid, composer
  main.tsx          # React entry point
  index.css         # styles
```

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: it
runs `npm ci` to install dependencies and starts `npm run dev` in a persistent
`dev` terminal, exposing port `5173`.
