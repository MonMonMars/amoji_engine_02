# Agent instructions

## Demo links — required after every update

After completing code changes (commit, push, or PR), **always** end your summary with a **Demo** section containing the live links below. Use the current `AMOJI_BUILD` from `amoji-engine/engine/companion/buildVersion.mjs`.

### Debug before you share (mandatory)

**Never paste demo links without running the verifier first:**

```bash
# 1. Local — must pass before every delivery
LOCAL=1 node scripts/demo-link-verify.mjs

# 2. Production — run after merge/deploy; must pass before calling links "live"
node scripts/demo-link-verify.mjs
```

| Exit | Meaning | What to tell the user |
|------|---------|------------------------|
| `0` | All checks passed | Share production links confidently |
| `2` | Production build behind repo (warnings only) | Say **deploy pending** — give PR link; optional local proof |
| `1` | Hard failure | Fix before sharing any demo link |

The script checks `/api/health` build id, boot splash/picker visibility (no black screen), page load, conversation-ui, activity rail, and voice-nav → tasks. Screenshots land in `/opt/cursor/artifacts/demo-verify-*.png`.

Picker-only E2E: `node scripts/companion-picker-verify.mjs` (14+ checks including boot paint + in-session featured row).

**Base URL:** https://temporary-rushing-oxygen-ok5jzhd.vercel.app

| App | Path |
|-----|------|
| **Bookmark this** (new URL every open) | `/play` |
| Girlfriend 3D (Cantonese) | `/play?lang=yue&pick=1&automic=0` |
| Girlfriend 3D (English) | `/play?lang=en&pick=1&automic=0` |
| Boyfriend 3D | `/play?role=boyfriend&lang=en&pick=1&automic=0` |
| Secretary (Today tab, 粵) | `/play?role=secretary&tab=today&lang=yue&pick=1&automic=0` |
| Secretary (EN) | `/play?role=secretary&lang=en&pick=1&automic=0` |
| Setup / API key | `/setup` |

**Unified app:** one 3D companion (`amoji-companion.html`) — girlfriend / boyfriend / secretary / pet come from **each character’s roster role** (voice + personality), not a separate mode menu. Switch character via start picker or Menu → Switch 3D companion; switch **language** via Menu → Session. Legacy `?role=` deep links still filter the roster; `kind=lite` redirects to `role=secretary`.

Do **not** bookmark `/companion-full` or `/companion`. iOS Safari often caches those pathnames forever and ignores `?build=`. `/play` is a never-cached 303 onto a brand-new `/n/<timestamp>/full` path on every open, then wipes Cache Storage / service workers.

**Example:**

- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=yue&pick=1&automic=0
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=en&pick=1&automic=0
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?role=secretary&tab=today&lang=yue&pick=1&automic=0
- Backup entry (same 303): https://temporary-rushing-oxygen-ok5jzhd.vercel.app/go

Programmatic helper: `formatDemoLinkBlock()` in `amoji-engine/engine/companion/deployUrls.mjs`.

**Deploy caveat:** Links point at production Vercel. They reflect your changes only after the branch is merged to the deploy branch (`cursor/companion-improvements-6647` or `main`) and Vercel finishes redeploying (~1 min). Until `node scripts/demo-link-verify.mjs` exits `0`, do **not** claim production is updated — run `LOCAL=1` verifier and report deploy pending.

**Cache bust:** Bookmark `/play` (not `/companion-full`). Each visit 303s to a unique `/n/<stamp>/full` pathname, sends `Clear-Site-Data: "cache"` on the HTML document only (never `"storage"`, so keys survive), and the page purges Cache Storage on open plus BFCache `pageshow`. Query `?build=` is a fallback only. Before deploy, run `node scripts/sync-build-version.mjs` so HTML `?v=` tags match `AMOJI_BUILD`.

## Testing

- Unit tests: `cd amoji-engine && npm test`
- Local full companion: `cd amoji-engine && node scripts/lab-serve.mjs` → http://127.0.0.1:5173/play
