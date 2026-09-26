# Amoji Business Plan — B2C & B2B (2026)

**Author:** Mon (Product / Design)  
**Status:** Working draft — synthesized from in-repo product research and shipped codebase  
**Last updated:** 2026-09-23  
**Live product:** [Amoji /play](https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play)

---

## 1. Executive summary

Amoji is a **3D VRM companion platform** that combines anime presence (voice, chat, emotion, scenes) with light **raising-game loops** (pet care, chase, shop). The company runs **two deliberate go-to-market tracks**:

| Track | Who pays | What they get |
|-------|----------|----------------|
| **B2C** | Consumers (App Store / web) | Personal AI companion — romance, secretary, pet fantasies — with optional subscription and cosmetics |
| **B2B** | Brands, venues, integrators | White-label companion experiences, **Admin Control**, user/ops tooling, and optional **robot / kiosk / hardware** motion bridges |

**Differentiator vs. 2D chat apps (Replika, Nomi, Character.AI):** legal open VRM roster, **Cantonese-first** voice and copy, in-browser 3D without a Unity lock-in, and a **dual revenue** path (consumer IAP + enterprise deployment).

**Near-term goal:** Ship a credible **B2C mobile hub** (`/app`, Capacitor) while packaging the same engine as a **B2B “Companion Cloud”** (hosted `/play`, admin, API keys, audit).

---

## 2. Source documents (previous work — updated into this plan)

This plan **replaces scattered strategy notes** in the repo. Primary inputs:

| Document | Role in this plan |
|----------|-------------------|
| [`amoji-engine/docs/COMPANION_APPS_AND_3D_RESEARCH.md`](../amoji-engine/docs/COMPANION_APPS_AND_3D_RESEARCH.md) | Market leaders, role design (girlfriend / boyfriend / secretary / pet), VRM structure, legal asset policy |
| [`amoji-engine/docs/JAPANESE_RAISING_GAMES_RESEARCH.md`](../amoji-engine/docs/JAPANESE_RAISING_GAMES_RESEARCH.md) | Marketing patterns, cozy economy, daily loops, emotional design rules |
| [`amoji-engine/docs/MOBILE_APP_ARCHITECTURE.md`](../amoji-engine/docs/MOBILE_APP_ARCHITECTURE.md) | B2C shell: login → hub → companion / pet / chase / shop |
| [`mobile/APP_STORE_GUIDE.md`](../mobile/APP_STORE_GUIDE.md) | IAP catalog, Apple/Google release, RevenueCat |
| [`DEPLOY.md`](../DEPLOY.md) | Hosted web, LLM keys (OpenRouter free tier), Vercel |
| [`AGENTS.md`](../AGENTS.md) | Admin console, IAP security, production verify gates |
| [`amoji-engine/docs/ROBOT_MOTION_VENDORS.md`](../amoji-engine/docs/ROBOT_MOTION_VENDORS.md) | B2B hardware / robotics adapter story |

---

## 3. Vision

**“Presence you can feel”** — not a text box with a avatar PNG, but a **character on a stage** who remembers context, reacts with body and face, and fits into daily rituals (check-in, tasks, play).

- **B2C vision:** The default “anime companion in your pocket” for Cantonese and English speakers who want warmth, play, and optional productivity (secretary / today & tasks).
- **B2B vision:** The **same runtime** behind a brand’s mascot, store greeter, museum guide, or robot skin — with **ops dashboards**, roles, and compliance-friendly asset licensing.

---

## 4. Product portfolio

### 4.1 B2C — Consumer app (“Amoji Companion”)

**Entry points**

- **Web (bookmark):** `/play` — cache-safe 303, character + scene picker, unified 3D session.
- **Mobile hub:** `/app` — title → login → hub → iframe companion + pet / chase / shop (Capacitor shell).

**Core experience (shipped direction)**

| Pillar | User value | Engine / surface |
|--------|------------|-------------------|
| **3D companion** | Chat, voice, poke, scenes | `prototypes/amoji-companion.html`, VRM roster |
| **Character fantasy** | Girlfriend, boyfriend, secretary, pet via **roster pick**, not separate apps | Role presets + prompts |
| **Brain (LLM)** | Smart dialogue; free cloud via OpenRouter | Menu → Brain; `/api/chat` |
| **Raising loop** | Hunger, hearts, treats, chase coins | `companionPetCare.js`, `companionChaseGame.js` |
| **Monetization** | Coins, premium chat, character packs, remove ads | RevenueCat + `/api/iap/*` |
| **Account** | Guest / Sign in with Apple, cloud save | `/api/auth/*`, `/api/user/save` |

**B2C positioning statement**

> *Amoji is a cozy 3D anime companion — chat, voice, and light pet game — built for Cantonese and English, with a roster you choose and a world you return to.*

**Primary competitors (learn, don’t copy assets):** Replika, Nomi, iBoy, Talkie, Kindroid, Ami (VRM). Amoji wins on **3D VRM + dialect + game loop + web-first**.

---

### 4.2 B2B — Companion Cloud & integrations

**Entry points**

- **Admin Control:** `/admin` — multi-role console (dashboard, users, backend, audit, admins).
- **From companion:** Menu → Advanced → Admin control panel (for authorized staff).
- **API surface:** Auth, user save, IAP (where partner resells), chat/LLM proxy, optional future **tenant API**.

**B2B offer tiers (recommended packaging)**

| Tier | Buyer | Includes |
|------|-------|----------|
| **Studio** | Indie brand, VTuber agency | Hosted `/play` with custom roster slot, scene pack, branded About link, analytics export |
| **Operations** | Retail, F&B, events | Admin **operations** role, user profiles, audit log, rate limits, allowed origins (`AMOJI_ALLOWED_ORIGINS`) |
| **Enterprise** | Robotics, museums, education | White-label domain, SSO (roadmap), **robot motion packages** (NAO, Furhat, Reachy, Unitree, ROS), SLA |

**B2B positioning statement**

> *Deploy the same Amoji 3D companion your users love — under your brand — with admin, audit, and optional physical robot gestures.*

**Hardware / integrator angle (differentiated):** `talkMotion.js` maps talk styles to vendor-specific command JSON — sales story is **“companion brain + body on your robot.”**

---

## 5. Market opportunity

### B2C

- Large and proven: AI companion apps (global, 2025–2026) with retention driven by **memory, voice, and daily habit**.
- Underserved niche: **Cantonese** quality (TTS, ASR, colloquial prompts) with **3D** presence.
- Mobile-first Asia-Pacific users familiar with raising / gacha **light mechanics** without hard paywalls.

### B2B

- **Brand mascots** moving from static social to interactive agents (kiosk, mini-program, web).
- **Venues & education:** guided character on tablet or large screen.
- **Robotics labs & integrators:** need conversational UI + gesture layer; Amoji already abstracts vendors.

---

## 6. Business model

### 6.1 B2C revenue streams

| Stream | Model | Reference |
|--------|--------|-----------|
| **Premium subscription** | Monthly unlimited smart chat / voice quota | `com.amoji.premium.monthly` |
| **Consumables** | Coin packs for shop / chase / treats | `com.amoji.coins.*` |
| **Content** | Character / scene packs | `com.amoji.characters.idol`, future roster DLC |
| **One-time** | Remove ads (if ads added on free tier) | `com.amoji.remove.ads` |
| **Web tipping / Stripe** | Optional card checkout | Menu → Shop & services, `/api/iap/checkout` |

**Free tier design (cozy, not punishing):** Basic brain or capped cloud LLM; full experience on subscribe — aligned with raising-game research (no affection paywall).

### 6.2 B2B revenue streams

| Stream | Model |
|--------|--------|
| **SaaS seat / MAU** | Per active user or per deployed kiosk |
| **Setup & branding** | Roster art, scene pack, custom prompts (design-led — Mon’s lane) |
| **Enterprise license** | Admin superadmin, multi-account JSON, dedicated Vercel/project |
| **Hardware integration** | Project fee + maintenance for robot bridge |
| **LLM pass-through** | Customer brings OpenRouter/Groq key; Amoji charges platform fee |

---

## 7. Go-to-market

### 7.1 B2C (phased)

| Phase | Focus | Tactics (from research doc §6) |
|-------|--------|--------------------------------|
| **0 — Now** | Web `/play` polish | Character-before-feature marketing; share fresh `/play` links; demo clips (VRM + TTS + orb) |
| **1** | Soft launch HK / diaspora | Cantonese creators, 粵語 tags, “she remembers you” persistence story |
| **2** | App Store | `mobile/` Capacitor, Apple Sign In, IAP sandbox → prod |
| **3** | Live ops | Seasonal scene, limited roster drops, daily coins, streak-safe chase |

**Channels:** TikTok/Reels character moments, Discord/community for roster voting, App Store ASO (companion, virtual pet, Cantonese).

### 7.2 B2B (phased)

| Phase | Focus | Tactics |
|-------|--------|---------|
| **0 — Now** | **Demo + Admin** | Live URL + admin bootstrap (`npm run admin:bootstrap`); pitch “same build as consumer” |
| **1** | Pilot partners | 1 retail or 1 education pilot — custom scene + one roster slot |
| **2** | Integrator kit | Document robot motion packages + webhook patterns |
| **3** | Scale | Tenant isolation, SSO, invoicing |

**Channels:** Direct outreach to agencies, robot distributors, HK retail tech; case study from pilot.

---

## 8. Product roadmap (12–18 months)

### Shared platform (both tracks)

| Quarter | Milestone |
|---------|-----------|
| **Q3 2026** | Stable hosted `/play`, smart LLM (`openrouter/free`), roster + scenes v2, admin roles |
| **Q4 2026** | App Store submission; memory UI (pinned facts); proactive check-in lines |
| **Q1 2027** | B2B white-label config (env-driven branding); export audit |
| **Q2 2027** | Optional user VRM import (Ami-style); lite 2D pet mode for low-end devices |

### B2C-only highlights

- Relationship level surfaced in mobile hub (from raising UI).
- Personality quiz onboarding → prompt fragment.
- Push notifications (pet decay) — `APP_STORE_GUIDE.md` checklist.

### B2B-only highlights

- Tenant-scoped admin (separate `AMOJI_ADMIN_ACCOUNTS` per customer).
- SLA dashboard in Admin Control.
- Robot bridge reference implementation (1 vendor per pilot).

---

## 9. Operations & technology

| Layer | Choice |
|-------|--------|
| **Hosting** | Vercel (web + serverless API) |
| **Auth** | JWT (`AMOJI_AUTH_SECRET`); admin schema `amoji.adminSession.v1` |
| **Persistence** | Upstash Redis (user saves) |
| **Payments** | RevenueCat + App Store / Play; Stripe optional on web |
| **LLM** | Server OpenRouter/Groq keys; client key paste; offline Basic fallback |
| **3D** | three.js + `@pixiv/three-vrm`; legal VRM only |
| **Quality** | `npm run verify:pre-delivery` / prod gate before marketing links |

**Design system:** Japanese AAA UI reference (Persona / NieR cues) — picker as “main event,” gold menu sheet — supports **premium B2C** and **credible B2B demos**.

---

## 10. Metrics

### B2C

| Metric | Target (illustrative) |
|--------|------------------------|
| D1 / D7 retention | Beat “novelty chat” baseline with pet + chase loop |
| Session length | ↑ via voice + scene variety |
| Conversion to premium | 3–5% of MAU (genre benchmark) |
| ARPPU | Driven by subscription + character packs |

### B2B

| Metric | Target |
|--------|--------|
| Pilot → paid conversion | 2+ pilots → 1 annual contract |
| Admin MAU / kiosk uptime | 99% on hosted demo |
| Time-to-brand | < 4 weeks for Studio tier (roster + scene + copy) |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| LLM cost / dumb fallback | Free OpenRouter router + user keys; never silent Basic on hosted when cloud ready |
| App Store rejection (AI companion) | Clear privacy, Sign in with Apple, no explicit policy violations; age rating honest |
| Asset licensing | VRoid / CC0 only; manifest in `ASSET_MANIFEST.md` |
| Commodity 2D chat apps | Double down on **3D + Cantonese + game loop** |
| B2B sales cycle long | Start with **live demo URL** + admin, not custom builds |
| Robot scope creep | Sell **motion packages** only; partner does hardware |

---

## 12. Team & roles (initial)

| Role | Focus |
|------|--------|
| **Mon — Design / Product** | Roster, scenes, AAA UI, B2B pitch decks, brand pilots |
| **Engineering** | Engine, verify gates, API, mobile shell |
| **Ops (part-time)** | Vercel, RevenueCat, admin accounts |

---

## 13. Immediate next actions (30 days)

**B2C**

1. Merge LLM + companion UX fixes; confirm production chat `mode: online`.
2. Complete App Store IAP sandbox checklist (`mobile/APP_STORE_GUIDE.md`).
3. Ship memory UI mock in Figma → Menu “About me” strip.

**B2B**

1. One-page **PDF/deck** export from this doc + live demo link for outreach.
2. Define **Studio tier** SKU (price, deliverables: N roster slots, 3 scenes, admin viewer seat).
3. Identify one pilot (retail, school, or robot lab).

**Shared**

1. Keep `AMOJI_BUILD` and verify green before any external demo.
2. Maintain roster legal audit when adding characters (e.g. VRoid CC0 Shino pattern).

---

## 14. Appendix — product URLs

| Surface | URL |
|---------|-----|
| Consumer play | https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play |
| Mobile hub | https://temporary-rushing-oxygen-ok5jzhd.vercel.app/app |
| Admin | https://temporary-rushing-oxygen-ok5jzhd.vercel.app/admin |
| Setup / keys | https://temporary-rushing-oxygen-ok5jzhd.vercel.app/setup |
| Privacy | `/privacy` on same host |

---

*This document is the canonical business plan for Amoji B2C and B2B. Update it when pricing, tiers, or roadmap phases change; keep deep research in the linked engine docs.*
