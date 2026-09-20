# Agent instructions

## Demo links — required after every update

After completing code changes (commit, push, or PR), **always** end your summary with a **Demo** section containing the live links below. Use the current `AMOJI_BUILD` from `amoji-engine/engine/companion/buildVersion.mjs`.

### Debug before you share (mandatory)

**Never paste demo links without running the verifier first:**

```bash
# Full gate (unit tests + demo + picker + reported-issues) — run before every user delivery
npm run verify:pre-delivery

# After merge/deploy — same gate against production
npm run verify:pre-delivery:prod
```

Quick checks only:

```bash
LOCAL=1 node scripts/demo-link-verify.mjs
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

## Scene backgrounds

Regenerate all 22 anime scene PNGs + CSS after editing `scripts/scene-bg-anime-art.mjs`:

```bash
npm run scene-bg
node scripts/sync-build-version.mjs
```

Companion loads `prototypes/companion-scene-backgrounds.css` (linked in `amoji-companion.html` head).

## Character picker

- Start picker: fixed hero row + horizontal roster with scroll arrows (`companionScrollAffordances.js`).
- Shared page width: `--amoji-app-max-width` in `prototypes/companion-app-width.css`.
- Legacy stored ids migrate via `migrateLegacyCharacterStorage()` on boot.
- Verifier: `npm run verify:picker` (14+ checks).

## Admin console (multi-level)

- **UI:** `/admin` → `prototypes/amoji-admin.html`
- **API:** `/api/admin/{action}` — `login`, `session`, `roles`, `users`, `user`, `backend`, `audit`, `accounts`
- **Roles (low → high):** `viewer` → `support` → `operations` → `superadmin` (see `api/_lib/adminRoles.mjs`)
- **Bootstrap env (one account):** `AMOJI_ADMIN_EMAIL`, `AMOJI_ADMIN_PASSWORD`, `AMOJI_ADMIN_ROLE` (default `superadmin`)
- **Multi-account JSON:** `AMOJI_ADMIN_ACCOUNTS='[{"id":"a1","email":"ops@…","passwordSha256":"…","role":"operations"}]'` (or `password` in dev only)
- Requires **`AMOJI_AUTH_SECRET`** (same HMAC as player sessions; admin tokens use schema `amoji.adminSession.v1`)
- User records include **`profile`** (`displayName`, `contactEmail`, `tags`, `notes`, `status`) editable by role
- Smoke: `node scripts/admin-console-verify.mjs`

## Payments & security (IAP)

- **Catalog / verify:** `/api/iap/products`, `/api/iap/verify`, RevenueCat `/api/iap/webhook`
- **Web card checkout (optional):** set `STRIPE_SECRET_KEY` + `AMOJI_PUBLIC_URL`; companion Menu → **Shop & services** uses `/api/iap/checkout` and return URL `?iap=success&session_id=…` → `/api/iap/stripe-confirm`
- **Production:** set `AMOJI_AUTH_SECRET`, `REVENUECAT_WEBHOOK_SECRET`, keep `AMOJI_IAP_DEV=0`; optional `AMOJI_ALLOWED_ORIGINS` (comma list) to restrict POST IAP from unknown sites
- **Audit:** `AMOJI_SECURITY_AUDIT=1` logs `[amoji-security]` JSON lines for blocked origins, rate limits, and fulfilled purchases

## Testing

- Unit tests: `cd amoji-engine && npm test`
- Local full companion: `cd amoji-engine && node scripts/lab-serve.mjs` → http://127.0.0.1:5173/play
