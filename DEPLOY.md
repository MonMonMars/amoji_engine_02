# Amoji — run online (no local PC)

Everything loads in the browser. **No npm, Ollama, or local server on your computer.**

## Live app (your Vercel project)

**https://temporary-rushing-oxygen-ok5jzhd.vercel.app**

**Dashboard:** [vercel.com/mars2350-1971/temporary-rushing-oxygen-ok5jzhd](https://vercel.com/mars2350-1971/temporary-rushing-oxygen-ok5jzhd)

Opens the full 3D companion in your browser — avatar, tap, voice, chat. No local PC needed.

### Enable smart chat — pick any option (no desktop login required)

**Option A — Paste key in the app (easiest)**  
1. On your **phone**, sign up at **[openrouter.ai/keys](https://openrouter.ai/keys)** (recommended — Groq console is often down)  
2. Copy the key (starts with `sk-or-`)  
3. Open the live app → tap **⚙** → paste key → **Save key & connect**  
   Key stays in your browser only — no Vercel login needed.

**Option B — Vercel env var (permanent for all visitors)**  
1. [Environment Variables](https://vercel.com/mars2350-1971/temporary-rushing-oxygen-ok5jzhd/settings/environment-variables)  
2. Add **`OPENROUTER_API_KEY`** (recommended) or **`GROQ_API_KEY`**  
3. Redeploy

**Option C — Basic brain**  
Works now with no key — canned Cantonese replies, avatar + voice still work.

## One-click deploy (Vercel)

1. Push this repo to GitHub (or use the existing repo).
2. Open [vercel.com/new](https://vercel.com/new) → **Import** your repo.
3. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Required | Where to get it |
   |------|----------|-----------------|
   | `OPENROUTER_API_KEY` | **Recommended** (free smart chat) | [openrouter.ai/keys](https://openrouter.ai/keys) — uses `openrouter/free` by default |
   | `GROQ_API_KEY` | Optional backup | [console.groq.com](https://console.groq.com) — free tier |
   | `OPENROUTER_MODEL` | Optional | Override default `openrouter/free` (e.g. `google/gemma-3-12b-it:free`) |

4. Click **Deploy**. Wait ~1 minute.

5. Open your URL, e.g. `https://amoji-engine.vercel.app`

   - **Brain** auto-connects to **Groq** (cloud).
   - **3D VRM**, **tap**, **voice**, and **chat** all run in the browser.
   - No install on your PC.

## What works online

| Feature | Online |
|---------|--------|
| 3D anime avatar (VRM) | ✅ |
| Tap character | ✅ |
| Voice + lip sync | ✅ |
| Smart LLM (Groq / OpenRouter) | ✅ with API keys in Vercel |
| Local Ollama (Qwen on your PC) | ❌ not needed |

## Local development (optional)

Only if you want to hack on the code:

```bash
cd amoji-engine
npm install
node scripts/lab-serve.mjs
```

Open http://127.0.0.1:5173/

## Troubleshooting

- **“Basic brain” only** → Add `GROQ_API_KEY` in Vercel and redeploy.
- **404 on `/api/chat`** → Ensure `vercel.json` is at repo root and `api/` folder exists.
- **Avatar not loading** → Check browser console; VRM path is `/amoji-engine/assets/...` (served as static files).
