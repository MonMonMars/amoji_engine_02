# Amoji on Windows

## Double-click does nothing / window flashes?

1. Use **`Start Companion.vbs`** instead of `start-companion.cmd` — keeps CMD open so you can read errors.
2. Or right-click `start-companion.cmd` → **Run as administrator** (rarely needed).
3. Check log file next to the script: **`start-companion.log`**

Common errors in the log:

| Message | Fix |
| --- | --- |
| `Node not found` | Install Node from https://nodejs.org or add `D:\devtools\node` to PATH |
| `lab-serve.mjs missing` | Wrong folder — run **`setup-amoji.cmd`** (clones to `D:\amoji_engine_02`) |
| `npm install failed` | Run CMD as user: `cd D:\amoji_engine_02\amoji-engine` then `npm.cmd install` |

## Don't have the repo yet? (easiest)

Double-click **`setup-amoji.cmd`** — it will:

1. Clone to **`D:\amoji_engine_02`**
2. `npm install`
3. Start the companion

Then open http://127.0.0.1:5173/

## Find existing folder (fast — not a full disk search)

Double-click **`find-amoji-quick.cmd`** — checks common paths in seconds and writes **`find-amoji-result.txt`**.

Or in PowerShell (max depth 3 on D: only — finishes quickly):

```powershell
Get-ChildItem D:\ -Filter "amoji_engine_02" -Directory -Depth 3 -ErrorAction SilentlyContinue | Select-Object FullName
```

**Do not** use `-Recurse` on whole `D:\` — that can run for hours.

## Run manually (CMD, not PowerShell)

```cmd
cd /d D:\amoji_engine_02\amoji-engine
node scripts\lab-serve.mjs
```

Browser: http://127.0.0.1:5173/

## PowerShell npm policy error

Use **`npm.cmd`** instead of `npm`, or skip npm entirely:

```powershell
cd D:\amoji_engine_02\amoji-engine
node scripts\lab-serve.mjs
```

## Ollama

Keep Ollama running (`qwen3:4b` on `D:\Ollama`). App auto-picks **Qwen4**.
