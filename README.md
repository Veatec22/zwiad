<p align="center">
  <img src="public/logo.png" alt="zwiad logo" width="96" />
</p>

# zwiad.com

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

The same common tasks are available through `make`:

```bash
make install
make dev
make check
make test-all
make build
```

Pre-commit hooks can be installed with:

```bash
make precommit-install
```

The Makefile runs pre-commit through `uvx pre-commit`. The hook runs the
repository formatters and fixers first. If they change files during a commit,
the commit is blocked and the fixes are left unstaged; stage the generated
changes and commit again.

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
