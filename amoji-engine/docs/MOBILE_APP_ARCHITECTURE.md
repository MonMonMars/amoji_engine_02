# Amoji Mobile App Architecture (v213)

Full mobile product: **title → login → hub → companion / pet / chase / shop / settings**, with backend auth, cloud save, and IAP.

## Stack

| Layer | Path | Role |
|-------|------|------|
| Web shell | `app/` | Mobile-first SPA, safe areas, routing |
| Engine | `amoji-engine/engine/mobile/` | Auth, cloud sync, chase logic, IAP client |
| Companion | `prototypes/amoji-companion.html` | 3D VRM (loaded in iframe from shell) |
| API | `api/auth/*`, `api/user/*`, `api/iap/*` | Sessions, saves, purchases |
| Native | `mobile/` | Capacitor 6 — iOS primary, Android secondary |

## Client modules

- `companionMobileAuth.js` — guest/Apple/session
- `companionCloudStorage.js` — localStorage ↔ `/api/user/save`
- `companionMobileSettings.js` — settings ↔ `/api/user/settings`
- `companionIapCatalog.js` — products + verify
- `companionChaseGame.js` — chase minigame state + simulation

## Data flow

```
Login → JWT in localStorage
Hub → load treat/raising/chase from localStorage
Action → save local → syncToCloud (POST /api/user/save)
Purchase → RevenueCat/StoreKit → POST /api/iap/verify → entitlements + coins
```

## Store compliance

- Privacy: `/privacy`
- Apple Sign In for account features
- IAP via RevenueCat (recommended) or direct verify stub for dev

See `mobile/APP_STORE_GUIDE.md` for release steps.
