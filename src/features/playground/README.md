# Playground Structure

Each experiment lives in its own folder directly under `playground/`. Tableau
dashboards live outside the playground, in `src/features/dashboards/`.

Current experiments:

- `sql-rush` - Pyxel/Pyodide typing game for BigQuery SQL syntax.
- `biwave` - Browser-only BI dashboard builder (biwave) with CSV upload, DuckDB-WASM, Apache ECharts, calculated fields, and movable React Grid widgets.
- `sailor` - Local CSV explorer with DuckDB-WASM, CodeMirror, profiling, and a bring-your-own-key AI contract (OpenRouter / WebLLM).
- `mael` - Browser-only tabular ML lab (MÆL) using Pyodide, XGBoost, sklearn metrics, and what-if prediction.

Shared infrastructure:

- `_shared/duckdb` - DuckDB-WASM client used by both `biwave` and `sailor`. Single source for `createDuckDBConnection`, `queryToRows`, `registerCsvTable`, `sqlIdent`.

Related (outside playground):

- `../dashboards` - Tableau Public gallery driven by typed report metadata (`TableauGalleryCard`, `TableauEmbed`, `tableauReports`).

Use `public/playground/...` for runtime files that need to be loaded by iframe,
Pyodide, Pyxel, workers, or other browser runtimes outside the Vite bundle.
