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

The script checks `/api/health` build id, page load, conversation-ui, activity rail, and voice-nav → tasks. Screenshots land in `/opt/cursor/artifacts/demo-verify-*.png`.

**Base URL:** https://temporary-rushing-oxygen-ok5jzhd.vercel.app

| App | Path |
|-----|------|
| **Bookmark this** (new URL every open) | `/play` |
| Full 3D companion (Cantonese) | `/play?lang=yue` |
| Full 3D companion (English) | `/play?lang=en` |
| Secretary MVP (Today tab, 粵) | `/play?kind=lite&tab=today&lang=yue` |
| Lite chat | `/play?kind=lite` |
| Setup / API key | `/setup` |

Do **not** bookmark `/companion-full` or `/companion`. iOS Safari often caches those pathnames forever and ignores `?build=`. `/play` is a never-cached 303 onto a brand-new `/n/<timestamp>/full` (or `/lite`) path on every open, then wipes Cache Storage / service workers.

**Example:**

- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=yue
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=en
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?kind=lite&tab=today&lang=yue
- Backup entry (same 303): https://temporary-rushing-oxygen-ok5jzhd.vercel.app/go

Programmatic helper: `formatDemoLinkBlock()` in `amoji-engine/engine/companion/deployUrls.mjs`.

**Deploy caveat:** Links point at production Vercel. They reflect your changes only after the branch is merged to the deploy branch (`cursor/companion-improvements-6647` or `main`) and Vercel finishes redeploying (~1 min). Until `node scripts/demo-link-verify.mjs` exits `0`, do **not** claim production is updated — run `LOCAL=1` verifier and report deploy pending.

**Cache bust:** Bookmark `/play` (not `/companion-full`). Each visit 303s to a unique `/n/<stamp>/full` pathname, sends `Clear-Site-Data: "cache"` on the HTML document only (never `"storage"`, so keys survive), and the page purges Cache Storage on open plus BFCache `pageshow`. Query `?build=` is a fallback only. Before deploy, run `node scripts/sync-build-version.mjs` so HTML `?v=` tags match `AMOJI_BUILD`.

## Testing

- Unit tests: `cd amoji-engine && npm test`
- Local full companion: `cd amoji-engine && node scripts/lab-serve.mjs` → http://127.0.0.1:5173/play
