# Mon — companion problem & request tracker

**Owner:** Mon (Designer)  
**Last updated:** 2026-09-24 09:20 UTC  
**Production build (live):** `2026-09-24-v563-mon-orbit-zoom-rotate`  
**Repo build (latest agent work):** `2026-09-24-v573-mon-roster-photoreal-front` on branch `cursor/fix-en-mode-tts-chinese-54db` — **not merged to `main` / not on Vercel**  
**App entry (bookmark):** https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play  

Agents: **read this before saying “fixed.”** Update a row when status changes (merge + prod verify, or new user report).

---

## ⚠️ Why the chart still looks “not fixed” (read first)

| What Mon uses | What agents ship |
|---------------|------------------|
| **Live Vercel** = **v563** | **v565–v572** fixes sit in **draft PRs** ([#102](https://github.com/MonMonMars/amoji_engine_02/pull/102), [#103](https://github.com/MonMonMars/amoji_engine_02/pull/103), etc.) |
| Desktop QA **2026-09-24** showed **back-facing roster PNGs** on prod | E2E passes file-size checks; **does not** eyeball every card facing |
| Rows marked ✅ below = **worked on prod at some snapshot** | Many are **still broken on v563** until merge + deploy |

**Before telling Mon “fixed”:** merge → `npm run verify:pre-delivery:prod` exit **0** → build match → desktop picker strip spot-check.

---

## Status key

| Symbol | Meaning |
|--------|---------|
| ✅ | **Solved on production** — merged to `main`, Vercel deployed, `node scripts/demo-link-verify.mjs` exit **0** (build match) |
| 🟡 | **Coded, deploy pending** — fix on branch/open PR; production build **behind** |
| 🔴 | **Not solved** — no merged fix, or Mon still sees it after prod caught up |
| ⏸️ | **Partial** — better in lab/PR but not done on prod or not all characters |
| 📋 | **Docs / planning only** |

---

## At-a-glance (2026-09-24)

| | Count | IDs (examples) |
|---|------|----------------|
| ✅ **Live on prod v563** | **14** | A2, A3, A4, A6–A8, B3–B4, C1–C4, D3–D5, D7, E1, F1–F2, F4 |
| 🟡 **Coded, not on prod yet** | **12+** | A5, B2, B1, B5–B7, D1–D2, D6, D8–D9, E2–E4, F3, G2 + PR queue |
| 🔴 **Still open on latest code too** | **3** | Full **A5/B2** roster strip (31 ids), **B1** arms in session, **D1/D2** lip/emotion feel |

---

## Production vs repo (check first)

| Check | Result (2026-09-24 08:42 UTC) |
|-------|-------------------------------|
| Live `/api/health` `build` | `2026-09-24-v563-mon-orbit-zoom-rotate` |
| Repo `AMOJI_BUILD` | `2026-09-24-v573-mon-roster-photoreal-front` |
| Match? | **No — deploy pending** |
| Full gate (prod) | Run after merge: `npm run verify:pre-delivery:prod` |

**iOS:** bookmark **`/play` only** (not `/companion-full`).

---

## Master problem list (expanded)

### A — Visuals, picker, cache, scenes

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| A1 | Picker / scene / roster **images look stale** (Safari cache) | ⏸️ | `/play` cache bust; roster `?v=` — Mon may still see old PNGs on **v563** | **prod v559**; more in open PRs |
| A2 | **Black screen** while picker or menu loads | ✅ | Boot picker paint | **prod** |
| A3 | **Wide desktop** — Menu blocks picker / layout | ✅ | Wide CSS + smoke | **prod ~v551+** |
| A4 | **HQ Japanese-style scene backgrounds** | ✅ | Scene-bg regen | **prod v551+** |
| A5 | **Roster card PNG ≠ loaded VRM** (back / wrong pose on strip) | 🔴 **prod** / ⏸️ **PR** | **Prod v563:** strip mostly backs (desktop **09:19**). **Lab v573:** **Nova #1 front** after photoreal capture fix; **~60% strip still backs** until full regen finishes | [#102](https://github.com/MonMonMars/amoji_engine_02/pull/102) **v573** |
| A6 | **Hero / picker portraits cropped** | ✅ | `object-fit: contain` | **prod** |
| A7 | **Professional / cinematic scene backgrounds** | ✅ | Pro scene pass | **prod** |
| A8 | **Picker hero** — portrait + scene preview | ✅ | Hero duo E2E | **prod v557+** |

### B — 3D body, arms, facing, springs, poke

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| B1 | **Blended / ghost arms** at idle | 🔴 / ⏸️ | Still reported desktop **v563** (T-pose/stiff). Fixes in **#97/#102** not on prod | Open PRs |
| B2 | **Faces backward** (picker strip + some starts) | 🔴 **prod** / ⏸️ **PR** | Session OK on some chars **v563**; **strip PNGs wrong** tied to **A5**. **v565** torso facing logic in **#102** not merged | [#100](https://github.com/MonMonMars/amoji_engine_02/pull/100) shipped **v562** session; strip **#102** |
| B3 | **Double-click / reset camera** → facing wrong | ✅ | Reset yaw v551 | **prod** |
| B4 | **Poke → blended head** | ✅ | Torso-only poke | **prod v551+** |
| B5 | **Hair / skirt / ribbon** springs | ⏸️ | v559 on prod; Mon may still see drift | **prod v559** |
| B6 | **Skirt weights sliding** | ⏸️ | Planted limbs + springs in **main** code path; verify after deploy | v550+ |
| B7 | **Feet planted** / ghost limbs | ⏸️ | E2E `feet-planted` passes; session QA varies | v550+ |

### C — Camera & input

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| C1 | **Two-finger pinch zoom** (iOS) | ✅ | Orbit TWO dolly | **prod v557+** |
| C2 | **Two-finger scroll / wheel** zoom | ✅ | **v563** wheel + orbit | **prod v563** |
| C3 | **One-finger orbit** mobile | ✅ | **v563** | **prod v563** |
| C4 | **Wide ghost Menu** over stage | ✅ | Inline settings CSS | **prod v558+** |

### D — Voice, TTS, lip sync, emotion

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| D1 | **No lip sync** — mouth idle while speaking | 🔴 / ⏸️ | E2E pass; Mon still reports in session on **v563** | [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79) not merged |
| D2 | **No emotion on face/voice** during TTS | 🔴 / ⏸️ | Same | [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79), [#98](https://github.com/MonMonMars/amoji_engine_02/pull/98) partial on prod |
| D3 | **TTS stops after first few words** | ✅ | Stream + barge fix | **prod v557+** |
| D4 | **Speaker volume jump** | ✅ | Gain staging | **prod v557+** |
| D5 | **Talking speed shows 1×** | ✅ | Talk speed v4 | **prod v558+** |
| D6 | **ChatGPT-style emotional voice** | ⏸️ | Cloud instruct + demo | Partial |
| D7 | **Starter “thinking” too long** | ✅ | Instant starter | **prod v557+** |
| D8 | **English mode:** reply **Chinese**, **no voice** | 🟡 | **#103 v571:** utterance-lang TTS routing + English-only prompts; **not on prod** | [#103](https://github.com/MonMonMars/amoji_engine_02/pull/103) |
| D9 | **Cantonese prefix 嘿嘿/嘻嘻** — TTS sounds like **names** | 🟡 | **#103 v572:** Yue vocabs use **哈哈** only; poke uses laugh pool; **not on prod** | [#103](https://github.com/MonMonMars/amoji_engine_02/pull/103) |

### E — Chat, LLM, UX

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| E1 | **Free / smart online LLM** | ✅ | OpenRouter chain | **prod** |
| E2 | **Fix all problems** ship together | 🔴 | Many rows still open; prod stuck **v563** | Multiple open PRs |
| E3 | **Mini emotion ball / mic UI** polish | 🟡 | | [#67](https://github.com/MonMonMars/amoji_engine_02/pull/67) |
| E4 | **iOS app never updates** (cache) | ⏸️ | Use `/play` | **prod** entry |

### F — Roster & models

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| F1 | **Kizuna** model load | ✅ | Roster verify | **prod v558+** |
| F2 | Roster slot replace (R3 CC0) | ✅ | **v561** cache bust | **prod v561+** (verify on v563) |
| F3 | Unique VRM per id | ⏸️ | Allowed dup groups in test | ongoing |
| F4 | **Elio** flat blocks | ✅ | Bounds + preview | **prod v557+** |

### G — Docs / business

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| G1 | **B2B + B2C business plan** | 📋 | | [#87](https://github.com/MonMonMars/amoji_engine_02/pull/87) |
| G2 | **This tracker** — honest solved/not | 🟡 | **This update** (v563 vs v572 gap) | [#82](https://github.com/MonMonMars/amoji_engine_02/pull/82) |

---

## What changed in this update (solved vs not)

### ✅ Solved **on production (v563)** — Mon should see these now

| ID | What |
|----|------|
| A2, A3, A4, A6, A7, A8 | Picker boot, wide layout, scenes, contain crop, hero preview |
| B3, B4 | Camera reset facing; poke body-only |
| C1–C4 | Pinch, wheel zoom, mobile orbit, wide menu |
| D3–D5, D7 | TTS cutoff, volume jump, 1× speed label, starter preload |
| E1 | Hosted LLM |
| F1, F2, F4 | Kizuna load, roster revision, Elio mesh |

### 🟡 Fixed in **repo / draft PR** — **NOT live until merge**

| ID | What | Where |
|----|------|--------|
| A5, B2 | Roster capture RAF lock, Yuki front sample, facing pick **v570** | [#102](https://github.com/MonMonMars/amoji_engine_02/pull/102) |
| B1, B5–B7 | Arms idle rest, springs, planted limbs (partial) | [#97](https://github.com/MonMonMars/amoji_engine_02/pull/97)–[#102](https://github.com/MonMonMars/amoji_engine_02/pull/102) |
| D8 | English session TTS when reply is Chinese | [#103](https://github.com/MonMonMars/amoji_engine_02/pull/103) **v571** |
| D9 | 哈哈 not 嘻嘻/嘿嘿 vocal prefix (Cantonese) | [#103](https://github.com/MonMonMars/amoji_engine_02/pull/103) **v572** |
| D1–D2 | Lip + emotion (older PRs) | [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79), [#78](https://github.com/MonMonMars/amoji_engine_02/pull/78) |

### 🔴 **Still not solved** (even after #102 + #103 merge — need more work)

| ID | What’s left |
|----|-------------|
| **A5 / B2** | **All 31** roster card + hero PNGs regen + **desktop strip** front-facing QA |
| **B1** | Ghost / stiff arms in live session (Mon desktop **v563**) |
| **D1 / D2** | Lip sync + face emotion still feel broken in session |
| **E2** | “Fix everything” — blocked on merge + QA above |

---

## Mon request log (new rows)

| When | Mon said (paraphrase) | Tracker IDs | Outcome |
|------|------------------------|-------------|---------|
| 2026-09-24 AM | Roster **back-facing** on desktop; verify before delivery | A5, B2 | **#102** v570 Yuki lab fix; **prod still v563** |
| 2026-09-24 AM | **English mode** — Chinese reply, **no voice** | D8 | **#103** v571 coded, not deployed |
| 2026-09-24 AM | **嘿嘿/嘻嘻** before speech → sounds like names; use **哈哈** | D9 | **#103** v572 coded, not deployed |
| 2026-09-24 AM | **Chart didn’t fix** — show updated chart + what’s solved | G2 | **This doc** — prod **v563** vs repo **v573** |
| 2026-09-24 AM | **Same old problems** — double-check desktop before delivery | A5, B2, G2 | **Desktop re-QA**; prod unchanged; **v573** Nova front only (regen running) |

---

## Open PR queue (merge priority for Mon-visible fixes)

1. **[#102](https://github.com/MonMonMars/amoji_engine_02/pull/102)** — A5/B2 roster facing capture + regen  
2. **[#103](https://github.com/MonMonMars/amoji_engine_02/pull/103)** — D8 English TTS + D9 哈哈 vocal  
3. **[#79](https://github.com/MonMonMars/amoji_engine_02/pull/79)** / [#78](https://github.com/MonMonMars/amoji_engine_02/pull/78) — D1/D2 lip/emotion  
4. **[#82](https://github.com/MonMonMars/amoji_engine_02/pull/82)** — merge tracker doc updates  

After merge: `npm run verify:pre-delivery:prod` → desktop picker screenshot → then ✅ rows.

---

## Desktop QA — **verified 2026-09-24 09:19 UTC** (before telling Mon “fixed”)

**Screenshots:** `desktop-prod-v563-picker-yue-retest.png`, `desktop-local-v573-picker-yue.png` (plus earlier `desktop-prod-picker-yue.png`, `desktop-prod-session-facing.png`)  
**Report:** `/opt/cursor/artifacts/DESKTOP-QA-REPORT-MON-DELIVERY.md`

| Check | **Production v563** | **Local lab v573** |
|-------|---------------------|---------------------|
| Picker roster strip | 🔴 **Mostly backs** (Nova hero OK, strip #1 back) | ⏸️ **Nova #1 + hero front**; **many strip backs remain** |
| Hero / card crop | 🔴 Mixed | ✅ Nova hero **front-facing** |
| Session 3D facing | ✅ Shino **face to camera** (prior shot) | — |
| Session arms | 🔴 **T-pose / stiff** | Nova card still **T-pose** in strip |
| E2E `demo-link-verify` | ⚠️ Passes; **misses card backs** | Run after merge |

**In progress:** full `render-roster-previews.mjs --force` on lab **v573** → `roster-regen-v573.log`

**Do not mark A5/B2/D8/D9 ✅ until prod build ≥ merged PR, **all 31** regen done, desktop picker strip mostly fronts.**

---

## One-line summary for Mon (2026-09-24)

**You’re still on production v563** — desktop **09:19** confirms **same strip backs live**. Repo **v573** fixes **Nova photoreal capture** (card + hero front in lab); **full roster regen** running. Draft **#102–#103** still **not deployed** (D8 English voice, D9 哈哈). **Truly ✅ on prod today:** orbit/zoom, poke/camera reset, TTS cutoff/volume/speed, starter preload, scenes — **not** roster strip facing, arms, lip/emotion, or EN/Yue voice fixes.

---

## Agent checklist (every fix)

1. Read this file; pick row IDs you touch.  
2. Implement + `npm run verify:pre-delivery`.  
3. Merge → wait deploy → `npm run verify:pre-delivery:prod`.  
4. Update table: 🟡 → ✅ only when prod build matches and Mon’s symptom is covered.  
5. Add a line to **Mon request log** if new wording from Mon.
