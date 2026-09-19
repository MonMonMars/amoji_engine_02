# Amoji — App Store & Google Play Release Guide

**App ID:** `com.amoji.companion`  
**Primary market:** Apple App Store  
**Shell:** Capacitor 6 (`mobile/`)

---

## 1. Product overview

Amoji is a hybrid **pet game + anime companion + chase collection** app:

| Mode | Description |
|------|-------------|
| **Title → Login** | Guest or Sign in with Apple |
| **Hub** | Home navigation |
| **Companion** | Full 3D VRM chat (`/play?mobile=1&pick=0` or hub embed) |
| **Pet Care** | Pou/Tamagotchi-style hunger & hearts |
| **Chase** | Catch the running girl for coins |
| **Shop** | IAP coins, Premium subscription, character pack |
| **Settings** | Language, notifications, cloud sync, privacy |

---

## 2. Backend (Vercel)

Deploy the repo root. Required env vars for production:

| Variable | Purpose |
|----------|---------|
| `AMOJI_AUTH_SECRET` | JWT signing (required in prod) |
| `APPLE_CLIENT_ID` | `com.amoji.companion` for Apple token verify |
| `AMOJI_APPLE_STRICT` | `1` to enforce Apple config |
| `UPSTASH_REDIS_REST_URL` | Persistent user saves |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |
| `REVENUECAT_PUBLIC_API_KEY` | Client SDK |
| `REVENUECAT_WEBHOOK_SECRET` | Webhook auth |
| `AMOJI_IAP_DEV` | `1` only for sandbox QA without receipts |

### API routes

- `POST /api/auth/guest` — guest session
- `POST /api/auth/apple` — Apple Sign In
- `GET /api/auth/session` — validate token
- `GET|POST /api/user/save` — cloud save
- `GET|POST /api/user/settings` — settings
- `GET /api/iap/products` — catalog
- `POST /api/iap/verify` — receipt verify
- `POST /api/iap/webhook` — RevenueCat events

Web app entry: **`/app`**

---

## 3. App Store Connect — IAP products

Create these product IDs (match `api/_lib/iapCatalog.mjs`):

| Product ID | Type | Price |
|------------|------|-------|
| `com.amoji.coins.small` | Consumable | $0.99 |
| `com.amoji.coins.medium` | Consumable | $4.99 |
| `com.amoji.premium.monthly` | Auto-renewable subscription | $6.99 |
| `com.amoji.characters.idol` | Non-consumable | $9.99 |
| `com.amoji.remove.ads` | Non-consumable | $2.99 |

Link RevenueCat → App Store Connect → webhook `https://YOUR_DOMAIN/api/iap/webhook`

---

## 4. iOS build steps

```bash
cd mobile
npm install
npx cap add ios          # first time only
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Set **Team** and **Bundle ID** `com.amoji.companion`
2. Enable **Sign in with Apple** capability
3. Add **In-App Purchase** capability
4. Configure **Push Notifications** (pet decay reminders)
5. Set `AMOJI_MOBILE_SERVER_URL` or edit `capacitor.config.ts` `server.url` to production `/app`
6. Archive → App Store Connect

### App Privacy (Apple)

Declare: User ID, purchase history, gameplay content, optional email (Apple Sign In).

Privacy policy URL: `https://YOUR_DOMAIN/privacy`

---

## 5. Android (Google Play)

```bash
cd mobile
npx cap add android
npx cap sync android
npx cap open android
```

- Enable Play Billing in Play Console
- Map same logical products to `googleProductId` in catalog
- Use RevenueCat Google Play integration

---

## 6. Research references (pet + chase anime games)

- **Care loop:** Pou, TamaPets, Travel Island Nyanko — decay + check-in + feed
- **Collection/chase:** gacha runners, time-limited character variants
- **Monetization:** cosmetics, premium currency, subscription (unlimited chat), battle-pass style daily streaks (chase streak in `companionChaseGame.js`)

See also: `amoji-engine/docs/JAPANESE_RAISING_GAMES_RESEARCH.md`

---

## 7. QA checklist

- [ ] Guest login → hub → pet feed → cloud sync
- [ ] Apple Sign In on real device
- [ ] Chase round completes → coins added
- [ ] Sandbox IAP → entitlements update
- [ ] Settings language persists + remote sync
- [ ] Companion iframe loads with mic permission
- [ ] Privacy policy accessible from Settings
