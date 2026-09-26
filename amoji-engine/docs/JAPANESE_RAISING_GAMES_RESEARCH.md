# Japanese 3D Raising Games (育成ゲーム) — Research for Amoji Companion

**Build context:** `2026-09-17-v168-mini-ball-live`  
**Purpose:** Study Japanese raising / life-sim / idol-training games for **game flow**, **UI**, **marketing**, **character motion**, and **emotion control** — then map what Amoji can reuse.

---

## 1. Executive summary

Japanese **育成ゲーム** (*ikusei geemu*, “raising games”) are not one genre. They share a family of loops:

> **Pick an action → see the character react → stats / bond / story advance → short payoff → return to hub.**

The best modern titles succeed because **three layers work together**:

| Layer | What players feel |
|--------|-------------------|
| **Care loop** | “I am responsible for this person.” |
| **Presentation loop** | “She noticed me / reacted / remembered.” |
| **Progress loop** | “My choices changed her future / rank / bond.” |

Amoji already has pieces of all three (VRM companion, voice chat, pet HUD, treat/kitchen, mini emotion ball, character roster). This document records how Japanese 3D raising games do it — and which patterns are worth copying next.

---

## 2. Genre map (what “育成” includes)

| Sub-genre | Examples | Core fantasy | Typical session |
|-----------|----------|--------------|-----------------|
| **Schedule raising** | *Princess Maker*, *Tokimeki Memorial* | Parent / student planner | 10–30 min planning week/month |
| **Coach raising** | *Uma Musume*, *Power Pro* career modes | Trainer + protégé | 15–45 min run, repeat |
| **Communication raising** | *Love Plus*, *NEW Love Plus* | Girlfriend in your device | 2–10 min check-ins, all day |
| **Idol raising** | *THE iDOLM@STER Cinderella Girls*, *Uma Musume* live end | Producer + performer | Daily chores + set-piece events |
| **Life / pet sim** | *Travel Island Nyanko*, *Pou*, *Tamagotchi* | Cozy caretaker | 1–5 min touch, decay while away |
| **Gacha home-hub raising** | *Blue Archive* | Bond many characters via dailies | 10–20 min routine |

**Amoji positioning:** hybrid of **communication raising** (ChatGPT-style talk) + **pet sim** (needs/coins/treats) + **3D idol presentation** (VRM stage, outfit, camera).

---

## 3. Reference titles & what to steal

### 3.1 Princess Maker (Gainax, 1991+) — the original raising loop

**Game flow**

- Fixed calendar (often ages 10–18 or 8 in-game years).
- Each month: pick up to **3 schedules** (school, job, rest, adventure).
- Stats split into **skills**, **spirit/morals**, **stress**, **money**.
- Random events + seasonal festivals break repetition.
- Many endings from accumulated choices — not one “win state.”

**Design intent (from interviews):** reduce RPG mechanics to emotional attachment; “bonsai” growth; make the player cry at the final letter.

**UI pattern:** dense stat sheet + calendar + command menu. Player reads numbers, imagines the daughter’s week.

**Amoji takeaway:** schedule is optional for us, but **visible long-term growth** (bond rank, unlocked idle gestures, outfit unlocks) creates the same attachment without forcing spreadsheet play.

---

### 3.2 Tokimeki Memorial (Konami, 1994+) — stats + social risk

**Game flow**

- Weekly **12-icon command grid**: study, sports, club, phone, date, rest, info magazine.
- Stats (intelligence, stamina, charm…) gate events and heroine reactions.
- **“Bomb” system:** neglect a girl → gossip → all love meters drop — forces planning.
- Holiday commands unlock dates; phone is intel + scheduling.

**UI pattern:** left command rail, center character/status, calendar for tests and birthdays.

**Amoji takeaway:** we should not copy bombs in a companion app, but **“return visit reward”** and **“missed check-in soft penalty”** (lonely mood, sad orb, hungry ask) are the friendly version of the same pressure.

---

### 3.3 Love Plus (Konami, DS/3DS) — 3D communication raising

**Game flow**

- Real-time clock (RTC): girlfriend exists in parallel with your day.
- Phases: meet → date → confess → **daily couple life** (commute, school, seasonal events).
- Personality branches (Type A/B/C) from dialogue choices — replay for gallery memories.
- Hardware hooks: mic, camera, gyro, AR — “she is in the device.”

**Marketing**

- “Fall in love again with your girlfriend” on sequel / import.
- Café tables for two (player + handheld), travel packages, cultural moment.
- Benchmark 3DS title — tech spectacle as marketing.

**Character model (GAME Watch / Nishikawa technical series)**

- ~**5,000 polygons**, **53 bones**, one heroine on screen.
- DS trick: render **one body as 9 mini-models** (head, face, torso, limbs…) to bypass GPU limits.
- **Multi-pass rendering** (~15 fps) tuned for slow dialogue motion, not action.

**Motion**

- ~**600 mocap clips**, ~**4,000 scripted events** manually matched in Notepad-era pipeline.
- **No runtime motion blending** across body parts (split-model constraint).
- Transitions: cut mid-clip + linear blend into next clip for emotional turns.
- Secondary motion (skirt, hair, chest, accessories): **hand-animated**, not physics — tuned length to return to idle.

**Emotion / face**

- Face = **texture-swap parts**: brows, eyes, cheeks, mouth → **44 base expressions**, chained for smooth changes.
- **Gaze:** mix of (a) scripted eye textures per motion, (b) procedural idle eye wander.
- **Lip sync:** mouth shapes follow words (unusual for anime games of the era).
- Toon shading tuned to match 2D character art, not generic cel-shade.

**Amoji takeaway:** our VRM path should mirror **layered expression** (base emotion + nuance + talk viseme + idle micro-motion), not one “happy/sad” enum. Love Plus proves **scripted gaze + idle wander** sells life.

---

### 3.4 Uma Musume Pretty Derby (Cygames) — modern mobile coach raising

**Game flow (official + Famitsu interviews)**

- Player is **trainer at Tracen Academy** — “club coach,” not corporate job.
- Loop: **training → events → skills → race → result / live → inherit** for next run.
- Man-to-man coaching; multiple umas over time (roster / “ranch”).
- Mental stats are human-like even when abilities are superhuman — drama comes from **school life**, not only stats.

**UI design (Cygames Tech Conference / GAME Watch)**

Before drawing screens, team runs **information design**:

1. Inventory all data  
2. Group / hierarchy  
3. Map relationships  
4. Define **information flow**  
5. **Display rules** (priority + consistency)

**Raising screen layout (stable chrome):**

| Zone | Content |
|------|---------|
| Header | Turn, **goal**, motivation, global raising state |
| Sub | 3D character + advice line |
| Main | Stats + **primary commands** |
| Footer | Skip, log, menu |

Header/footer stay fixed; sub/main swap per screen. **Stats always visible** during training so growth never leaves the player’s eye. Thumb-zone placement for phone.

**Marketing (2017–2024 era)**

- Transmedia: anime, manga, collabs — game is hub, not isolated SKU.
- Character-first: each uma has archetype + voice + story before mechanics.
- Live events, gacha banners, scenario launches (CM, celebrity tie-ins, free pulls).
- “Speed run” UI for repeat players — respect veteran grind.

**Amoji takeaway:** our **companion chip** (avatar + name + status + mini emotion ball) is already a tiny raising header. Extend with **one always-visible goal** (“today: cheer up”, “learn your name”, “try new snack”) and **advice line** under the name.

---

### 3.5 THE iDOLM@STER Cinderella Girls Starlight Stage — idol raising UX

**Game flow**

- **LIVE** → earn idols / trainers / materials  
- **Lesson** (level, skill level) → **affinity** → **special training (特訓)** at cap  
- Center idol matters for rewards — encourages identity pick.

**UI (CEDEC 2016 — Cygames UI team)**

- Goal: **“Producer can focus on the fun part.”**
- **Minimal parts**, strict color/size rules, few button types.
- Separate screens for **formation / lesson / training** — never one overloaded panel.

**Amoji takeaway:** keep **one primary action** on stage (talk / mic / feed). Push shop, wardrobe, character pick to sheets — already close to our treat-sheet + start picker pattern.

---

### 3.6 Blue Archive — daily home-hub raising (2021+)

**Game flow (daily ~20 min)**

1. Cafe: collect AP/credits, headpat visitors, invitation ticket  
2. Lessons: spend tickets on chosen students  
3. Club free AP  
4. Sweep bounties / commissions  
5. Claim daily/weekly tasks (Pyroxene)

Parallel **bond systems:** Cafe touch, Schedule activities, **MomoTalk** chat stories, unlock special home screen at high bond.

**UI**

- Home: **Live2D/3D character center**, flat 2.0 UI with light skeuomorphism (soft transparency).
- Footer nav without hard dividers — margin-only separation.
- Task list with **Shortcut** buttons → zero navigation friction.

**Marketing**

- Strong character IP, memes, student fantasy, gacha + story chapters.
- Daily habit = **generous sweep + claim-all** — respect time.

**Amoji takeaway:** **MomoTalk** = our transcript + push notifications later; **Cafe headpat** = tap companion / pet HUD hearts; **Schedule** = optional “today’s activity” with the companion (walk, study, snack).

---

### 3.7 Travel Island Nyanko (Colopl) — UI as the game

**Insight (Colopl design blog):** director called it **“a UI game.”** Diorama world needs UI that matches tactility — they built **felt-texture UI mockups** so chrome feels physical, not pasted on.

**Amoji takeaway:** Grok Ani glass + **mini emotion ball** + kitchen/treat sheet should feel like **one tactile toy set**, not separate web widgets. We are on the right track with dock-on-stage and chip orb.

---

### 3.8 inZOI / modern life sim (2024+) — emotion as human-like behavior

**Design quotes (G-STAR / Game*Spark interviews):**

- Goal: **human-like emotion and movement**, not puppet theater.
- Full-day schedule editing (work, social, sabotage).
- Cat mascot test: cuteness spikes when animals act **human-like** (stand to reach, sulk and skip meals).
- User creativity: photo → 3D item, custom motion import.

**Amoji takeaway:** companion should **refuse food when full**, **sulk when lonely**, **perk up when named** — small anthropomorphic choices beat raw stat bars.

---

## 4. Universal game-flow template

Most 3D raising games follow this skeleton:

```
[Entry / Home hub]
    ↓
[Check needs & goals]  ← hunger, stamina, event timer, daily mission
    ↓
[Choose action]        ← command grid, training card, talk, feed, date
    ↓
[Performance]          ← 3D reaction, voice line, stat delta, cutscene
    ↓
[Result / reward]      ← coins, bond, unlock, story beat
    ↓
[Return hub]           ← character remembers, UI reflects new state
```

**Session types**

| Session | Length | Emotion |
|---------|--------|---------|
| Touch | 30 s – 2 min | “She’s still here.” |
| Care | 3–8 min | “I helped her.” |
| Deep | 15+ min | “We advanced a chapter / run.” |

Amoji today is strongest at **Touch + Talk**; **Care** (treats/HUD) is mid; **Deep** (multi-week arc) is light.

---

## 5. UI architecture patterns

### 5.1 Layout zones (copy from Uma Musume)

| Zone | Amoji mapping (current / proposed) |
|------|-------------------------------------|
| **Header** | Companion chip: avatar, name, status line, **mini emotion ball** |
| **Sub** | 3D stage + orbit; optional advice bubble |
| **Main** | Transcript / mic / composer |
| **Footer** | Treat dock, mic, send, scene buttons |
| **Overlay sheets** | Treat shop, character picker, settings |

**Rule:** never hide **bond/needs** during care actions — keep pet HUD on stage (already docked on `.stage`).

### 5.2 Information priority (raising games)

Always visible:

1. **Who** (character)  
2. **Goal or mood** (thinking / hungry / speaking)  
3. **Primary action** (talk, feed, listen)  
4. **Scarce resource** (coins, AP, time) — optional  

Hide until needed: build id, LLM mode, debug pills.

### 5.3 Motion-friendly UI (Aiming / 3D UI blog)

- IN / LOOP / OUT animations for panels — not only opacity.  
- 3D character stays **unblocked** — UI is glass, not walls.  
- **Select then confirm** for destructive actions (feed spend, character switch).  
- Respect **prefers-reduced-motion** (Amoji mini ball already does).

### 5.4 Command feedback (indie raising dev note)

When player picks “Study” or “Run,” show **SD/3D performing the action** — parameter pop is not enough. The **action scene** creates “raising feel.”

**Amoji:** on treat feed, play **eat animation** + thanks line (partially implemented); extend to **refuse**, **full belly**, **favorite food** reactions.

---

> Consolidated GTM and dual-track (B2C + B2B) plan: [`docs/AMOJI_BUSINESS_PLAN.md`](../../docs/AMOJI_BUSINESS_PLAN.md).

## 6. Marketing strategy patterns

| Pattern | Example | Amoji application |
|---------|---------|-------------------|
| **Character before feature** | Uma Musume, Blue Archive | Numbered roster, preview portraits, voice per character |
| **Transmedia world** | Anime + manga + game | Short character bios, “day in the life” clips |
| **Real-world ritual** | Love Plus cafés, trips | Share `/play` bookmark, daily check-in line |
| **Tech spectacle** | Love Plus 3D, inZOI AI | VRM + expressive TTS + live orb as demo hook |
| **Comeback narrative** | “Fall in love again” | “She remembers you” — chat persistence, care decay |
| **Daily habit hooks** | Blue Archive tasks | Daily coins, hungry ask, streak-safe rewards |
| **Social proof / UGC** | Uma Musume fan art, memes | Export screenshot / short clip of companion moment |
| **Low-friction re-entry** | `/play` fresh URL (Amoji v159+) | Already aligned — keep cache-bust story in marketing |

**What not to copy:** aggressive FOMO bombs (Tokimeki), hard fail death (classic Tamagotchi), paywall-gated affection.

---

## 7. Game design strategy patterns

### 7.1 Core loops

| Loop | Mechanism | Amoji status |
|------|-----------|--------------|
| **Needs decay** | Hunger/hearts drop over real hours | ✅ `companionPetCare.js` |
| **Check-in ask** | Character prompts when low | ✅ hungry ask cooldown |
| **Earn → spend** | Chat/pet → coins → shop | ✅ |
| **Performative care** | Drag treat → eat anim | ✅ treat interact |
| **Bond / memory** | Chat history, thought bubbles | ✅ partial |
| **Schedule / goal** | Weekly training target | ❌ propose |
| **Event calendar** | Seasonal dates | ❌ propose light |
| **Personality drift** | Love Plus types | ❌ propose via LLM nuance |
| **Inheritance / NG+** | Uma Musume inherit | ❌ optional meta |

### 7.2 Emotional design rules (cross-title)

1. **React before explain** — motion + face + voice, then text.  
2. **Small failures are cute** — refuse snack, yawn when tired, not game over.  
3. **Player agency is scheduling** — even chat apps feel like raising when you **choose** when to visit.  
4. **Repetition needs variation** — idle library clips, mood lines, nuance tags.  
5. **Peak moments are authored** — confession, live, festival — LLM should not improvise these every day; script templates + LLM fill.

### 7.3 Economy tone (Pou / cozy raising)

- Currency is **gift-giving**, not power.  
- Soft cap: can’t overfeed; same-snack cooldown.  
- Daily allowance — login reward without punishing absence harshly.

Amoji `companionPetCare.js` already follows **cozy** rules (meters can hit 0; nobody dies).

---

## 8. Character model strategies

| Approach | Used by | Pros | Cons |
|----------|---------|------|------|
| **High-poly 3D + toon shade** | Love Plus, inZOI | Film-like, merchandise match | Heavy pipeline |
| **VRM + runtime spring bone** | Amoji, VTuber stack | Swap models, web-ready | Consistency across rigs |
| **2D/Live2D hub** | Blue Archive home | Cheap emotion | Less “3D raising” |
| **SD chibi reaction** | Uma Musume training | Clear feedback | Secondary to main 3D |

**Amoji choice:** VRM full-body stage + **chip portrait** + optional SD sticker reactions in HUD.

**High-poly flagship (v169):** Kizuna AI KAMATTE — ~73k tris, VRM 1.0, 18 expression presets, 5 visemes (`aa/ih/ou/ee/oh`), 210 morph targets. Verified lip sync via `vrmAvatar.getFaceReport()` + companion `onMouth`. See `HIGHPOLY_VRM_FACE.md`.

**Technical checklist from Love Plus applicable to VRM:**

- Single visible actor focus (one companion active).  
- Secondary motion: prefer **authored idle** over unstable physics (foot lock, spring down).  
- Outfit as state (勝負服 / casual) — we have scene outfit presets.  
- Lip + emotion driven by **voice**, not only text sentiment.

---

## 9. Motion control systems

### 9.1 Library scale

| Title | Scale | Notes |
|-------|-------|-------|
| Love Plus | ~600 body clips | Hand-matched to 4k events |
| Amoji | VRMA idle + talk + treat + action resolve | Growing motion library |

### 9.2 Transition model (recommended)

```
Idle LOOP
  → on event: pick clip from {emotion × action × intensity}
  → optional: trim + ease blend (0.2–0.4 s)
  → return to planted idle (feet locked)
```

Avoid continuous physics chaos; Love Plus chose **hand-tuned follow-through** over sim.

### 9.3 State-driven motion (Uma / idol)

- **Training type** picks clip set (speed / stamina / skill).  
- **Mood** modifies success VO and facial overlay.  
- **Failure** still shows attempt — never silent reject.

**Amoji mapping**

| State | Body | Face | Voice |
|-------|------|------|-------|
| idle | planted idle + breath | neutral + blink | — |
| listening | lean-in optional | attentive | mic orb teal |
| thinking | look aside / finger | thinking | hum → words |
| speaking | talk gestures + viseme | emotion from reply | TTS |
| eating | treat VRMA | happy/sad | thanks line |
| hungry ask | tummy / pleading | sad | check-in line |

---

## 10. Emotion control systems

### 10.1 Layer stack (Love Plus → Amoji)

| Layer | Love Plus | Amoji today | Target |
|-------|-----------|-------------|--------|
| Base emotion | 44 texture combos | `EMOTION_MIC_THEME` + aliases | keep |
| Nuance | personality type | `NUANCE_MIC_DELTA` | expand |
| Talk viseme | lip shapes | VRM mouth + `onMouth` | keep tuning |
| Volume | — | mini ball size | ✅ |
| Color | — | mini ball hue | ✅ |
| Motion | clip + gaze | idle/talk/treat | keep |
| UI mirror | — | chip status + orb | ✅ v168 live state |
| LLM mood | — | reply analysis | keep |

### 10.2 Mini emotion ball as “raising UI”

Japanese mobile raising games often use **small status orbs, mood icons, SD reactions** for fast read without reading text. Our chip orb is the ChatGPT-style equivalent:

- **Volume** = mic / mouth  
- **Color** = emotion theme  
- **Motion** = idle breath / think swirl / speak morph  
- **Label** = `Speaking · Happy` / `講緊 · 開心`

This matches the **header/sub-info** role in Uma Musume UI.

### 10.3 Personality drift (optional)

Love Plus **Type A/B/C** from dialogue preference — replay value.

**Amoji low-cost version:** track `nuance` tags (`shy`, `excited`, `love`) from LLM over sessions; shift default greeting and idle clip weights, not hard personality swap.

---

## 11. Recommended elements for Amoji (prioritized)

### Phase A — already shipped / recent

- [x] 3D character on stage with orbit camera  
- [x] Voice talk + expressive TTS  
- [x] Pet needs HUD (hunger / hearts, pips, Pou colors)  
- [x] Treat shop + drag-feed + eat animation  
- [x] Mini emotion ball in companion chip (v164–v168)  
- [x] Character roster + numbered picker  
- [x] Cache-safe `/play` entry  

### Phase B — high impact, small scope

| Feature | Inspired by | Implementation hint |
|---------|-------------|---------------------|
| **Daily goal line** in chip | Uma Musume header goal | “Today: practice Cantonese”, “Cheer her up” |
| **Advice bubble** after actions | Uma sub-panel | One line after feed / chat / treat refuse |
| **Activity picker** (3 icons) | Tokimeki commands | Walk / snack / study → buff hearts or mood |
| **Bond rank** (5 pips → named ranks) | Idol affinity | Show under pet HUD |
| **MomoTalk-style** pinned memories | Blue Archive | Pin 3 facts companion remembers |
| **Reaction sheet** on stat change | Training result | +6 hearts floating text, orb pulse |

### Phase C — medium scope

| Feature | Inspired by |
|---------|-------------|
| Weekly schedule (light) | Princess Maker / Tokimeki |
| Seasonal greeting events | Love Plus RTC |
| “Center companion” bonus | Deresute |
| SD sticker on command result | Uma Musume |
| Scripted festival days | Tokimeki calendar |

### Phase D — research only (don’t rush)

- Full raising run (Uma-style 30 min loop)  
- Personality type branching gallery  
- gacha / inherit meta  

---

## 12. UI wire reference (target Amoji hub)

```
┌─────────────────────────────────────────────────────────┐
│ [Chip: avatar | Nova | status | ◉ orb ]    [chat][⚙]  │  ← Header (raising state)
├─────────────────────────────────────────────────────────┤
│  ┌ pet HUD: Food ▮▮▯▯▯  Fun ▮▮▮▯▯ ┐                      │  ← Needs (always on stage)
│  │                                 │                      │
│  │         3D VRM companion        │                      │  ← Sub (character)
│  │                                 │                      │
│  └─────────────────────────────────┘                      │
│  [floating advice: "That snack was sweet~"]               │  ← Sub text
├─────────────────────────────────────────────────────────┤
│  transcript / captions (top layer)                      │  ← Main
├─────────────────────────────────────────────────────────┤
│  [🍰 Treat] [mic / composer] [send]                       │  ← Footer commands
└─────────────────────────────────────────────────────────┘
```

---

## 13. Key metrics to track (raising-game style)

| Metric | Why |
|--------|-----|
| D1 / D7 return | habit loop |
| Check-ins per day | communication raising |
| Treats fed / refused | care loop comprehension |
| Hungry ask → feed conversion | needs UI clarity |
| Avg talk session length | companion stickiness |
| Character switch rate | roster marketing |
| Orb state distribution | emotion system health |

---

## 14. Sources & further reading

| Source | Topic |
|--------|--------|
| [GAME Watch — Love Plus graphics (Nishikawa)](https://game.watch.impress.co.jp/docs/series/3dcg/365048.html) | 9-part model, 600 motions, 44 faces, gaze |
| [Famitsu — Uma Musume producer interview (2017)](https://www.famitsu.com/news/201703/30130054.html) | Coach fantasy, school tone |
| [GAME Watch — Uma Musume UI design](https://game.watch.impress.co.jp/docs/kikaku/1366165.html) | Information design, header/footer |
| [Cygames Tech Conference notes (UI)](https://yutateno.hatenablog.jp/entry/2021/11/13/151754) | Raising UI information flow |
| [note — indie raising UI/system](https://note.com/absence0433/n/ne7197374376b) | Command → SD reaction |
| [Colopl — Travel Island Nyanko UI](https://pinmark.colopl.co.jp/entries/77529595) | Tactile UI in diorama games |
| [Game*Spark — inZOI interview](https://www.gamespark.jp/article/2024/11/22/147163.html) | Human-like emotion, schedule |
| [StrategyWiki — Tokimeki Memorial gameplay](https://strategywiki.org/wiki/Tokimeki_Memorial/Gameplay) | Command grid |
| [Wikipedia — Princess Maker](https://en.wikipedia.org/wiki/Princess_Maker) | Schedule raising origins |
| [Blue Archive UI notes (GameUI Lab)](https://uidesign.chodoiilife.com/blue-arc-things/) | Home hub flat UI |
| [CEDEC — Deresute UI (gamebiz)](https://gamebiz.jp/news/168065) | Minimal parts, producer focus |

**In-repo references**

- `engine/companion/companionPetCare.js` — Pou-style needs  
- `engine/companion/companionTreatInteract.js` — kitchen / drag-feed  
- `engine/companion/companionEmotionBall.js` — mini emotion ball controller  
- `prototypes/companion-grok-ani.css` — Grok Ani stage UI  

---

## 15. One-line design north star

> **Amoji should feel like a Love Plus conversation inside a Pou care loop, presented with Uma Musume clarity — one character, one goal, one reaction at a time.**

---

*Document version: 2026-09-17 — for companion / pet-game / emotion-ball workstreams.*
