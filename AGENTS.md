# Agent instructions

## Demo links — required after every update

After completing code changes (commit, push, or PR), **always** end your summary with a **Demo** section containing the live links below. Use the current `AMOJI_BUILD` from `amoji-engine/engine/companion/buildVersion.mjs`.

**Base URL:** https://temporary-rushing-oxygen-ok5jzhd.vercel.app

| App | Path |
|-----|------|
| Full 3D companion (Cantonese) | `/companion-full?lang=yue&build=<AMOJI_BUILD>` |
| Full 3D companion (English) | `/companion-full?lang=en&build=<AMOJI_BUILD>` |
| Lite chat | `/companion` |
| Setup / API key | `/setup` |

**Example (replace build id after each bump):**

- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion-full?lang=yue&build=2026-09-15-v68-spring-stability
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion-full?lang=en&build=2026-09-15-v68-spring-stability
- https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion

Programmatic helper: `formatDemoLinkBlock()` in `amoji-engine/engine/companion/deployUrls.mjs`.

**Deploy caveat:** Links point at production Vercel. They reflect your changes only after the branch is merged to the deploy branch and Vercel finishes redeploying (~1 min). Until then, say so and link the open PR.

## Testing

- Unit tests: `cd amoji-engine && npm test`
- Local full companion: `cd amoji-engine && node scripts/lab-serve.mjs` → http://127.0.0.1:5173/companion-full
