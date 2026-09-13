# Amoji on Windows

## Your errors explained

| Error | Cause | Fix |
| --- | --- | --- |
| `找不到 ... amoji-engine` | You were in `C:\Windows\System32`, not the project folder | `cd` to where you cloned the repo (see below) |
| `npm.ps1 ... 已停用指令碼執行` | PowerShell blocks `npm` scripts | Use **CMD** or `npm.cmd`, or run `node` directly (easiest below) |

## Easiest: double-click launcher

1. Clone or open the repo folder (must contain `amoji-engine\` and `prototypes\`).
2. Double-click **`start-companion.cmd`** in the repo root.
3. Open http://127.0.0.1:5173/

No PowerShell, no `npm run` needed.

## Find your project folder

If you are not sure where the repo is:

```powershell
# PowerShell — search common drives (may take a minute)
Get-ChildItem -Path D:\, C:\Users\$env:USERNAME -Filter "amoji_engine_02" -Directory -Recurse -ErrorAction SilentlyContinue | Select-Object -First 3 FullName
```

Or clone fresh:

```powershell
cd D:\projects
git clone https://github.com/MonMonMars/amoji_engine_02.git
cd amoji_engine_02
```

## Run from CMD (recommended)

Open **Command Prompt** (cmd.exe), not PowerShell:

```cmd
cd /d D:\projects\amoji_engine_02\amoji-engine
node scripts\lab-serve.mjs
```

Then open http://127.0.0.1:5173/

## If you prefer PowerShell

**Option A — use npm.cmd (bypasses script policy):**

```powershell
cd D:\projects\amoji_engine_02\amoji-engine
& "D:\devtools\node\npm.cmd" run lab
```

**Option B — use node directly (same as the .cmd launcher):**

```powershell
cd D:\projects\amoji_engine_02\amoji-engine
node scripts\lab-serve.mjs
```

**Option C — allow scripts (admin PowerShell, once):**

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Ollama (your setup)

You already have Ollama on `D:\Ollama` with `qwen3:4b` and `qwen3:8b`.

1. Start Ollama (app or `ollama serve` in another terminal).
2. Start the companion (`start-companion.cmd` or `node scripts\lab-serve.mjs`).
3. In the app, **Qwen4** should auto-connect.

## First time only

```cmd
cd /d D:\projects\amoji_engine_02\amoji-engine
npm.cmd install
```

Then use `start-companion.cmd` or `node scripts\lab-serve.mjs` every time.
