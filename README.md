# zagiel.dev

Frontend portfolio built with React + Vite. The site combines classic portfolio sections with an interactive playground.

## What's inside

- landing page with PL/EN versions, light/dark mode, and sections for work areas, playground, stack, and contact
- `biwave` - a browser-based BI dashboard builder powered by CSV, DuckDB-WASM, ECharts, and react-grid-layout
- `MAEL` - a local ML lab for tabular data, running in the browser through Pyodide/XGBoost
- `sailor` - a CSV explorer with DuckDB-WASM, SQL, data profiling, and an optional bring-your-own-key AI assistant (OpenRouter / WebLLM)
- `sql-rush` - a smaller experiment/gameplay in the playground section
- Tableau Public report gallery

Everything runs entirely on the client side — there is no backend. Datasets, SQL, ML, and the SQL Rush word list all live in the browser or as static assets.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Zustand
- DuckDB-WASM
- ECharts
- Pyodide/XGBoost for the ML parts

## Running locally

```bash
bun install
bun run dev
```

Production build:

```bash
bun run build
```

Basic repository check:

```bash
bun run check
```

No environment variables are required to run the app. The `sailor` AI assistant
is bring-your-own-key: you connect your own OpenRouter key (OAuth/PKCE, stored in
your browser) or run a local WebLLM model — nothing is read from build-time env.

The technology stack table is seeded from `src/data/stack.csv`.

## Deployment

The site deploys to GitHub Pages from `.github/workflows/deploy.yml` on every push
to `main`, served from the custom domain **zwiad.com**. The Vite base path is
controlled by `VITE_BASE_PATH` (defaults to `/`).

## Tests and quality

Available commands:

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run test:all
```

Python-based playground components are checked separately with `uvx ruff` and `pytest`.
