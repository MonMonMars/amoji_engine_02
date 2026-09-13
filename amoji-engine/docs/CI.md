# CI / offline validation

This agent’s GitHub token lacks the `workflow` scope, so `.github/workflows/*.yml` cannot be pushed from here. Use either path below.

## Local matrix (always works)

```bash
cd amoji-engine
npm run ci
```

Or step-by-step:

```bash
cd amoji-engine
npm install
npm run typecheck
npm run build
npm test
npm run demo:e2e
npm run demo:facelive-smoke
npm run demo:http-smoke
npm run demo:motion-smoke
```

## GitHub Actions (paste when you have `workflow` scope)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master, "cursor/**"]
  pull_request:

defaults:
  run:
    working-directory: amoji-engine

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: amoji-engine/package-lock.json
      - name: Install
        run: |
          if [ -f package-lock.json ]; then npm ci; else npm install; fi
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
      - run: npm run demo:e2e
      - run: npm run demo:facelive-smoke
      - run: npm run demo:http-smoke
      - run: npm run demo:motion-smoke
```

Or grant the Cursor / `gh` OAuth app the **workflow** scope and ask the agent to add the file.
