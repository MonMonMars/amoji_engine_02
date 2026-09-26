# Amoji companion — handoff package for Kimi

**Forward this entire file to Kimi.**  
**Repo:** https://github.com/MonMonMars/amoji_engine_02  
**Copy on GitHub:** open this file → **Raw** → select all (or use the file view copy control).

---

## Snapshot (2026-09-26)

| Field | Value |
|-------|--------|
| **Branch** | `cursor/mon-juno-bg-picker-54db` |
| **Commit** | `1a3ac49` (see also latest on branch) |
| **Repo build** | `2026-09-25-v595-mon-kizuna-begin-cap` |
| **Production build** | `2026-09-25-v589-mon-kizuna-start-load-fix` (**behind repo — deploy pending**) |
| **Ship PR** | [#112](https://github.com/MonMonMars/amoji_engine_02/pull/112) — OPEN, ready for review, CI green, mergeable |
| **Owner** | Mon (Designer / Product) |
| **Live app** | https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play (bookmark **`/play` only** on iOS) |

**Optional full repo zip (~1.5 GB, no `node_modules`):**  
https://github.com/MonMonMars/amoji_engine_02/releases/download/handoff-2026-09-26-v595/amoji_engine_02-handoff-full.zip  

Prefer **git clone** over zip when possible.

---

## 1. Business / product / monetization / roadmap

### Canonical business plan (on branch `cursor/business-plan-b2b-b2c-54db`, PR #87 — not merged to `main`)

| Resource | URL |
|----------|-----|
| **Business plan (rendered)** | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/business-plan-b2b-b2c-54db/docs/AMOJI_BUSINESS_PLAN.md |
| **Raw (paste-friendly)** | https://raw.githubusercontent.com/MonMonMars/amoji_engine_02/cursor/business-plan-b2b-b2c-54db/docs/AMOJI_BUSINESS_PLAN.md |
| **PR** | https://github.com/MonMonMars/amoji_engine_02/pull/87 |

**Summary:**

- **Product:** 3D VRM companion — voice, chat, emotion, anime scenes + light raising loops (pet, chase, shop).
- **GTM:** **B2C** (web + App Store, IAP/subscription) and **B2B** (white-label `/play`, Admin Control, optional robot bridges).
- **Edge:** Legal open VRM roster, **Cantonese-first**, in-browser 3D, dual revenue.
- **B2C revenue:** Premium sub, coin packs, character/scene DLC, remove-ads, optional Stripe (`/api/iap/checkout`).
- **B2B tiers:** Studio / Operations / Enterprise (see business plan §4.2).
- **Roadmap:** Q3–Q4 2026 stable `/play` + admin; 2027 App Store, memory UI, B2B white-label (plan §8).

### Supporting docs (on `main`)

| Topic | URL |
|-------|-----|
| Market & 3D / roles | https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/COMPANION_APPS_AND_3D_RESEARCH.md |
| Raising-game UX | https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/JAPANESE_RAISING_GAMES_RESEARCH.md |
| Mobile hub | https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/MOBILE_APP_ARCHITECTURE.md |
| App Store / IAP | https://github.com/MonMonMars/amoji_engine_02/blob/main/mobile/APP_STORE_GUIDE.md |
| Robot / B2B motion | https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/ROBOT_MOTION_VENDORS.md |
| Deploy & LLM setup | https://github.com/MonMonMars/amoji_engine_02/blob/main/DEPLOY.md |

---

## 2. Architecture & repo layout

### Top-level

| Path | Role |
|------|------|
| `prototypes/amoji-companion.html` | Unified 3D companion app |
| `prototypes/assets/` | VRM (`companion-<id>.vrm`), roster PNGs, scene backgrounds |
| `amoji-engine/engine/companion/` | Runtime (avatar, picker, voice, chat, preload) |
| `amoji-engine/tests/` | Vitest |
| `api/` | Vercel serverless |
| `app/` | Mobile hub SPA |
| `mobile/` | Capacitor |
| `scripts/` | E2E + verify gates |
| `vercel.json` | Routes, cache, install |

**Engine architecture:** https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/architecture.md  

### Runtime flow (short)

1. User opens **`/play`** → 303 → `/n/<timestamp>/full` (cache-safe).
2. **`amoji-companion.html`** boots modules; optional **start picker** (`pick=1`).
3. User picks **character + scene** → **Begin chat**.
4. `beginStartWithCharacter` → capped **`ensureModelReady`** (v595) → **`createCompanionAvatar`** → VRM in `vrmAvatar.js`.
5. Chat/voice via `/api/chat`, `/api/tts`; Menu → Brain, Today/tasks, switch companion.

**Character #2 = `kizuna`** — ~19 MB VRM; high-poly timeouts + prefetch cap in `companionStartPickerPreload.js`.

### Roster & assets

- **34 characters** — `ROSTER_CHARACTER_IDS` in `companionCharacterRoster.js` (nova=1, kizuna=2, … cyrus=34).
- **3D inventory:** https://github.com/MonMonMars/amoji_engine_02/blob/main/amoji-engine/docs/3D_MODEL_INVENTORY.md  
- **Asset manifest:** https://github.com/MonMonMars/amoji_engine_02/blob/main/prototypes/assets/ASSET_MANIFEST.md  
- **Fetch VRMs:** `npm run postinstall`

### Scenes

- CSS: `prototypes/companion-scene-backgrounds.css`  
- Regenerate: `npm run scene-bg` then `node scripts/sync-build-version.mjs`

### Picker UI

- Logic: `companionCharacterPicker.js`  
- CSS: `companion-picker-v4.css`, `companion-picker-stacked-layout.css`, `companion-picker-aaa-theme.css`, `companion-picker-pro-ui.css`

### API routes

| Route | Purpose |
|-------|---------|
| `/api/health` | Build id |
| `/api/play` | Entry redirect |
| `/api/chat`, `/api/tts`, `/api/stt` | Chat & voice |
| `/api/llm/*` | LLM status |
| `/api/auth/*`, `/api/user/*` | Auth & cloud save |
| `/api/iap/*` | IAP + Stripe |
| `/api/admin/*` | Admin API |
| `/admin` | Admin Control UI |

### Env vars (names only — set in Vercel, never commit values)

`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_MODEL`, `AMOJI_AUTH_SECRET`, `AMOJI_PUBLIC_URL`, `APPLE_CLIENT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_PUBLIC_API_KEY`, `STRIPE_SECRET_KEY`, `AMOJI_IAP_DEV` (0 in prod), `AMOJI_ALLOWED_ORIGINS`, `AMOJI_SECURITY_AUDIT`, `AMOJI_ADMIN_EMAIL`, `AMOJI_ADMIN_PASSWORD`, `AMOJI_ADMIN_ROLE`, `AMOJI_ADMIN_ACCOUNTS`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

See `DEPLOY.md`, `mobile/APP_STORE_GUIDE.md`, `AGENTS.md` (admin bootstrap).

---

## 3. Agent / handoff docs (branch `cursor/mon-juno-bg-picker-54db`)

| Doc | URL |
|-----|-----|
| **This file** | `docs/KIMI_HANDOFF_PACKAGE.md` |
| HANDOFF.md | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/HANDOFF.md |
| AGENTS.md | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/AGENTS.md |
| Mon issue tracker | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/docs/MON_COMPANION_ISSUE_TRACKER.md |
| README | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/README.md |
| buildVersion.mjs | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/amoji-engine/engine/companion/buildVersion.mjs |
| package.json scripts | https://github.com/MonMonMars/amoji_engine_02/blob/cursor/mon-juno-bg-picker-54db/package.json |

---

## 4. Verification & E2E

```bash
git clone https://github.com/MonMonMars/amoji_engine_02.git
cd amoji_engine_02
git checkout cursor/mon-juno-bg-picker-54db
npm install && cd amoji-engine && npm install && cd ..
npm run postinstall

npm run verify:pre-delivery          # must be 5/5 locally
LOCAL=1 node scripts/demo-link-verify.mjs
# After merge + deploy:
npm run verify:production-build
npm run verify:pre-delivery:prod
```

| Script | What |
|--------|------|
| `verify:pre-delivery` | Unit + demo + picker E2E + issues E2E (~59 checks) |
| `verify:picker` | Includes **Kizuna #2** begin + VRM load |
| `verify:production-build` | `/api/health` vs `AMOJI_BUILD` |
| `verify:roster-models` | Core VRM HTTP on prod |

Key E2E files: `scripts/companion-issues-verify.mjs`, `scripts/companion-picker-verify.mjs`, `scripts/pre-delivery-verify.mjs`

---

## 5. PR #112 scope (merge this first)

https://github.com/MonMonMars/amoji_engine_02/pull/112

- Juno #26 male voice / boyfriend  
- v594 anime scene backgrounds  
- Pro picker UI + layout E2E  
- v593 idle forearm + spring damp  
- Switch E2E locale (yue)  
- **F1:** Kizuna prefetch cap + picker E2E begins with kizuna  

**CI:** unit-and-smoke + companion-e2e — SUCCESS on branch head.

**Likely superseded after merge:** PR #111 (idle), PR #110 (switch).  
**Separate:** PR #109 (Sendagaya lighting), PR #87 (business plan docs).

---

## 6. Open issues (Mon)

| ID | Issue | Notes |
|----|-------|-------|
| **F1** | Character **#2 Kizuna** won’t load on device | Fix in **v595** on #112; **prod still v589** until merge |
| B1/B5/B6 | T-pose, spring wind, hair/skirt | In #112; prod pending |
| G1/G2 | Switch name/voice, reloads | In #112 history |
| H1 | Business plan | PR #87 |

Full table: `docs/MON_COMPANION_ISSUE_TRACKER.md`

---

## 7. Kimi checklist

1. Checkout `cursor/mon-juno-bg-picker-54db`.  
2. Read `AGENTS.md` + `MON_COMPANION_ISSUE_TRACKER.md`.  
3. Confirm `npm run verify:pre-delivery` → **5/5**.  
4. **Merge PR #112** to `main`; wait for Vercel.  
5. `npm run verify:pre-delivery:prod` → exit **0**.  
6. Mon retests: `/play` → picker → **#2 Kizuna** → Begin → 3D loads.  
7. Optional: merge PR #87 (business plan); close duplicate PRs.  

---

## 8. Demo links (after prod matches v595)

- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play  
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=en&pick=1&automic=0&build=2026-09-25-v595-mon-kizuna-begin-cap  
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=yue&pick=1&automic=0&build=2026-09-25-v595-mon-kizuna-begin-cap  

Until `/api/health` shows `2026-09-25-v595-mon-kizuna-begin-cap`, tell Mon **deploy pending** and use PR **Vercel preview** for v595 behavior.

---

*Generated for handoff to Kimi. Update this file when branch, PR, or build id changes.*
