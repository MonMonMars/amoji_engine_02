# High-poly VRM face + lip sync

**Build:** `2026-09-17-v190-face-emotion`  
**Purpose:** Document the flagship high-polygon VRM path, expression control, and lip sync verification.

---

## Recommended model: Kizuna AI KAMATTE

| Metric | Value |
|--------|-------|
| File | `prototypes/assets/kizuna-kamatte.vrm` |
| Triangles | ~72,691 |
| VRM | 1.0 (MToon, spring bone) |
| Expressions | 18 loaded presets |
| Visemes | `aa`, `ih`, `ou`, `ee`, `oh` |
| Character id | `kizuna` — roster **#2** (gallery priority, after Nova) |
| Picker | HD face chips + footer hint via `listHighPolyFaceCharacters()` |
| Window probe | `window.__amojiFaceReport` after VRM load |

**Alternates**

| Model | Tris | Best for |
|-------|------|----------|
| Kai | ~50k | ARKit morph fallback + visemes |
| Alicia | ~32k | VRM 0.x (`a/i/u/e/o`) baseline |
| Nova | ~17k | Photoreal, faster boot |
| Ember | ~23k | Expressive anime |

---

## Expression control stack

```
LLM [mood] + [nuance]
  → buildVrmExpressionBlend() (companionContentMotion.js)
  → adaptBlendForFaceProfile() (companionFaceEmotion.js)
  → VRM expressionManager presets (Happy, Sad, Angry, …)
  → clampRestFaceBlend / capTalkingEmotionWeight (companionFaceRest.js)

TTS / charToViseme (companionViseme.js)
  → onMouth(open, shape) in amoji-companion.html
  → vrmAvatar.setMouthOpen / setMouthShape
  → VRM viseme presets + applyMorphMouthOpen + jaw bone
  → resolveTalkEmotionMorphWeights() → applyTalkEmotionMorphs (ARKit fallback)
```

Model-adaptive profiles (`buildModelFaceProfile`) auto-detect rig type
(`vrm1-anime`, `vrm0-standard`, `arkit`, `minimal`, `gltf`, `procedural`) and
scale preset/morph weights per character. GLTF + procedural avatars expose the
same `applyExpressionProfile({ emotion, nuance })` API.

**Rule:** visemes and jaw are applied **after** `expressionManager.update()` so Happy/Surprised cannot freeze the mouth.

---

## API (vrmAvatar)

| Method | Role |
|--------|------|
| `setEmotion(name)` | happy / sad / angry / surprised / thinking / neutral |
| `applyExpressionProfile({ emotion, nuance })` | mood + nuance blend |
| `setTalking(on)` | enables viseme + talk pulse |
| `setMouthOpen(0..1)` | lip openness |
| `setMouthShape('aa'\|'ih'\|…)` | phoneme shape |
| `setEating(on)` | chew mouth pulse |
| `getFaceReport()` | static mesh + preset inventory at load |
| `getFaceDebug()` | live mouth / viseme / expression weights |

---

## Test pages & scripts

| Tool | Usage |
|------|--------|
| Face lab | `/prototypes/vrm-highpoly-face-test.html` |
| Kizuna quick load | `?model=kizuna-kamatte.vrm` |
| Auto viseme cycle (CI) | `?autocycle=1` |
| Companion | `/prototypes/amoji-companion.html?character=kizuna` |
| Mesh inspector | `node scripts/inspect-vrm-face.mjs` |
| Lip sync smoke | `node amoji-engine/scripts/highpoly-face-lipsync-smoke.mjs` |
| Companion kizuna smoke | `node scripts/companion-kizuna-lipsync-smoke.mjs` |

---

## Key files

- `engine/companion/vrmAvatar.js` — face render loop
- `engine/companion/companionFaceRest.js` — visemes, hazards, morph regexes
- `engine/companion/companionViseme.js` — char → viseme mapping
- `engine/companion/companionMeshStats.js` — triangle / morph inventory
- `engine/companion/companionVoice.js` — TTS lip sync driver (re-exports viseme)

---

## Performance notes

- Kizuna (~19 MB) first load: ~20–25 s on lab VM; use Nova/Kai for faster iteration.
- Mobile: preload only the selected character URL (`companionCharacterPreload.js`).
- Do not fall back to Michelle GLB when a character VRM fails — keeps wrong face off stage.
