# Virtual AI Companion Apps — Research & 3D Model Structure

**Build:** `2026-09-18-v214-companion-roles`  
**Target:** AI girlfriend · boyfriend · secretary · pet — learn from market leaders, ship with **legal VRM test assets only**.

> **Business plan (B2C + B2B):** Strategy, pricing lanes, GTM, and roadmap live in [`docs/AMOJI_BUSINESS_PLAN.md`](../../docs/AMOJI_BUSINESS_PLAN.md). This file stays the **market & 3D research** reference; the business plan **updates and consolidates** the product direction from here, `JAPANESE_RAISING_GAMES_RESEARCH.md`, and `MOBILE_APP_ARCHITECTURE.md`.

> **Important:** We do **not** extract or redistribute 3D models from commercial apps (Replika, Nomi, iBoy, etc.). That violates their ToS and copyright. Instead we study their **product design** and use **open-licensed VRM** (VRoid samples, CC0 100Avatars) for testing.

---

## 1. Market leaders (what to learn)

### Boyfriend / girlfriend apps users praise

| App | Why users love it | 3D? | Amoji takeaway |
|-----|-------------------|-----|----------------|
| **Replika** | Memory, proactive check-ins, relationship levels, voice + AR | Unity 3D (closed) | Copy **retention loops**, not closed assets — use open VRM |
| **Nomi AI** | Best long-term memory, voice calls, identity consistency | 2D selfies | Surface “remembered facts” UI; our 3D is the differentiator |
| **iBoy / Anima Boyfriend** | Male-first polish, XP leveling, gifts, soft romance | 2D | **Boyfriend onboarding** + affection progression without gem grind |
| **Kindroid** | Deep persona authoring, journals, voice tiers | 2D/video | Persona sliders that change system prompt, not just label |
| **Talkie** | Voice-first, Mini-Theater scenarios, 95+ langs | 2D | Short Cantonese **scenario scripts** (date, chase win, briefing) |
| **Ami** (withami.ai) | VRM Hub import, mood body language, relationship dims | **VRM** | Closest competitor — we win on **Cantonese + pet/chase game** |
| **Character.AI** | Infinite personas, free chat | 2D portrait | Don’t compete on free scale; compete on **presence + game** |

### Secretary / productivity companions

| Pattern | Example | Amoji mapping |
|---------|---------|---------------|
| Work / life / chill modes | Amoji `secretary/modePresets.js` | Already in engine — expose in mobile Settings |
| Proactive briefing | Replika coaching | `/play?tab=today` secretary lite |
| Desktop always-visible | Moemate, Utsuwa, DesktopFriends | Future floating VRM mini-mode |

### Pet companions

| App | Loop | Amoji mapping |
|-----|------|---------------|
| Pou / Tamagotchi | Decay + feed + no death | `companionPetCare.js` |
| PetPal | Growth + gacha cosmetics | Chase unlocks + outfit IAP |
| Mochi Crew | On-device vision pet | Optional camera pet phase 2 |

---

## 2. How top apps structure “3D” (vs Amoji VRM)

### Replika (Unity, proprietary)

```
Custom mesh + blend shapes + outfit catalog (not VRM)
├── Real-time lighting / AR face track
├── Emotion → animation state machine
└── Cloud avatar config (locked to Replika)
```

**Lesson:** Polish comes from **emotion → body** mapping and **outfit economy**, not raw poly count.

### Ami / VRM-native apps

```
VRM 0.x/1.0 glTF binary
├── Humanoid bone map (Unity Humanoid compatible)
├── BlendShapeProxy (expressions: happy, angry, blink, aa, ih, ou…)
├── SpringBone (hair/cloth)
├── LookAt (eye tracking)
└── Optional VRMA animation clips
```

**Lesson:** Same stack as Amoji (`@pixiv/three-vrm`). Users can **bring their own Hub avatar**.

### Live2D boyfriend apps (2D leaders)

```
Separate Cubism pipeline — lower GPU, not interchangeable with VRM
```

**Lesson:** Optional future “lite pet mode” for low-end phones; full companion stays VRM.

---

## 3. VRM model structure (technical reference)

A `.vrm` file is **glTF 2.0 + VRM extensions**. Key pieces Amoji uses:

| Component | Purpose in companion apps |
|-----------|---------------------------|
| **Humanoid bones** | Idle motion, VRMA clips, foot lock, head look-at |
| **Blend shapes (Viseme)** | Lip-sync from TTS (`aa`, `ih`, `ou`, `ee`, `oh`) |
| **Expression presets** | happy, sad, angry, relaxed — emotion orb / chat tone |
| **Spring bones** | Hair/skirt physics (`vrmSpringStability.js`) |
| **First person / look-at** | Camera-aware gaze |
| **Meta (title, author, license)** | App Store compliance — read before ship |

### Bone hierarchy (simplified)

```
hips
├── spine → chest → neck → head → eyes
├── leftUpperLeg → leftLowerLeg → leftFoot
├── rightUpperLeg → rightLowerLeg → rightFoot
├── leftShoulder → leftUpperArm → leftLowerArm → leftHand
└── rightShoulder → rightUpperArm → rightLowerArm → rightHand
```

VRoid / UniVRM humanoids retarget cleanly to Amoji’s VRMA motion library.

### Testing matrix (legal models in repo)

| File | Role test | License |
|------|-----------|---------|
| `companion-avatarsample-b.vrm` | Girlfriend baseline (industry reference) | VRoid AvatarSample |
| `companion-vroid-male.vrm` | Boyfriend / male secretary rig | VRoid sample |
| `companion-chad.vrm` | Confident boyfriend (iBoy-style) | CC0 100Avatars |
| `companion-david.vrm` | Soft boyfriend (Nomi-style) | CC0 100Avatars |
| `companion-robert.vrm` | Male secretary | CC0 100Avatars |
| `companion-rose.vrm` | Female secretary | CC0 100Avatars |
| `companion-rabbit.vrm` | Pet / kawaii | CC0 100Avatars |

Download more: `node amoji-engine/scripts/download-legal-vrm.mjs`

---

## 4. Role-based product design (Amoji v214)

Four user intents map to **character + prompt + UI mode**:

| Role | User fantasy | Default characters | UI emphasis |
|------|--------------|-------------------|-------------|
| **Girlfriend** | Warm romance, daily chat | Amoji, Kizuna, Yuki (AvatarSample B) | Hearts, chase, voice |
| **Boyfriend** | Protective, flirty, remembers you | Rex, Chad, David, Kai | Proactive lines, male Cantonese voice |
| **Secretary** | Tasks, drafts, reminders | Rose, Robert, Nova | Secretary modes (work/life/chill) |
| **Pet** | Cozy care, no pressure | Mimi (bunny), Chibi | Pet meters, feed, chase coins |

Implemented in `companionRolePresets.js` + mobile onboarding picker.

---

## 5. Boyfriend-app features to ship next

Priority from review mining:

1. **Memory UI** — show 3 pinned facts (Nomi-style)
2. **Proactive push** — “he missed you” tied to pet decay
3. **Relationship level** — bond rank already in raising UI; surface in mobile hub
4. **Personality quiz onboarding** — 4 questions → prompt fragment
5. **Voice note mode** — push-to-talk if full duplex latency > 5s

---

## 6. Legal asset policy

✅ **Allowed**

- VRoid AvatarSample A/B/C (pixiv terms)
- ToxSam 100Avatars CC0 ([opensourceavatars.com](https://opensourceavatars.com))
- VTubeMe CC-BY with attribution (Kai, Sky, Nova…)
- User-uploaded VRM with ToS warranty

❌ **Not allowed**

- Ripping `.vrm` / `.unity3d` from Replika, Nomi, iBoy, etc.
- Redistribution of paid Hub models without license
- NFT avatars unless license verified in `projects.json`

See `prototypes/assets/ASSET_MANIFEST.md` for shipped files.

---

## Sources

- [VRoid AvatarSample terms](https://vroid.pixiv.help/hc/en-us/articles/4402394424089)
- [ToxSam Open Source Avatars](https://github.com/ToxSam/open-source-avatars)
- [madjin/vrm-samples](https://github.com/madjin/vrm-samples) (AvatarSample mirrors)
- [Ami — VRM companion](https://withami.ai)
- App Store / Google Play listings: Replika, Nomi, iBoy, Talkie, Kindroid (2025–2026)
- Internal: `JAPANESE_RAISING_GAMES_RESEARCH.md`, `MOBILE_APP_ARCHITECTURE.md`
