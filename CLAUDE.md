# Repository Guidelines

## Project Structure & Module Organization

- `src/passive_logic_simulator/` contains the simulation package code (physics, numerics, control, config, CLI, API).
- `frontend/` contains the React/TypeScript webapp (Vite + Tailwind CSS).
- `main.py` is a thin runner that invokes the package CLI.
- `pyproject.toml` defines project metadata and dependencies.
- `uv.lock` and `.venv/` support reproducible environments via `uv`.
- `tests/` contains pytest tests for the simulation package.

Keep new simulation code inside the package and avoid growing `main.py`.

## Simulation Conventions

- Model: solar collector → pumped loop → well-mixed storage tank (single state `T_tank`).
- Units: **all temperatures are Kelvin**; keep parameters consistent with the units listed in `README.md`.
- Control: pump uses hysteresis (`ΔT_on`, `ΔT_off`) and should not cool the tank (collector useful heat is clamped to `Q_u >= 0`).
- Numerics: fixed-step **RK4** (default) or **Euler**; pump state updates once per time step and is held constant within the step (and RK4 sub-steps).
- Numerics: `duration_s` should be an integer multiple of `dt_s`.
- Weather inputs: `G(t)` and outdoor `T_amb(t)` can come from a synthetic model or a CSV time series.
- Tank losses: use constant indoor/room temperature `T_room` (configurable) as the tank loss reference.

## API & Frontend Architecture

The project includes a FastAPI backend (`api.py`) and a React frontend for interactive simulations.

- **API**: FastAPI server at `POST /api/simulate` accepts JSON with collector, tank, pump, control, simulation, and weather parameters. Returns time series of tank temperature, ambient temperature, irradiance, and pump state.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS. Uses Recharts for visualization. Communicates with the backend API on port 8000.
- **CORS**: The API allows requests from `localhost:5173` (Vite dev server).

## Build, Test, and Development Commands

This repo targets Python 3.12 (see `.python-version`) and uses `uv` for dependency management.

### Backend (Python)

- `uv sync`: create/update the virtual environment from `pyproject.toml`/`uv.lock`.
- `uv run python main.py`: run the application using the managed environment.
- `uv run passive-logic-simulator run --config resources/default_config.toml --output-csv out/simulation.csv`: run via the package CLI and write results to CSV.
- `uv run passive-logic-simulator demo`: start the demo webapp (backend + frontend).
- `uv run uvicorn passive_logic_simulator.api:app --reload --port 8000`: run the API server standalone.
- `uv add <package>`: add a dependency and update the lockfile.
- `uv run pytest`: run the test suite.

### Frontend (React/TypeScript)

- `cd frontend && npm install`: install frontend dependencies.
- `cd frontend && npm run dev`: start the Vite dev server (http://localhost:5173).
- `cd frontend && npm run build`: build production assets to `frontend/dist/`.
- `cd frontend && npm run lint`: run ESLint on frontend code.
- `./build.sh`: convenience script to build the frontend from the repo root.

## Coding Style & Naming Conventions

- Indentation: 4 spaces; follow PEP 8.
- Naming: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Prefer explicit types for public functions and return values (type hints), and keep modules small and focused.

No formatter/linter is configured yet; if you introduce one (for example `ruff`), apply it consistently and document the new command(s) here.

## Testing Guidelines

Tests use `pytest` and live under `tests/`. The test suite covers physics, numerics, control logic, configuration, CLI, and weather modules.

- Run tests with `uv run pytest`.
- Place tests under `tests/` and name files `test_*.py`.
- Keep tests deterministic (no network calls; use fakes/fixtures where needed).

## Commit & Pull Request Guidelines

This repository has no established commit-message convention yet. Use a clear, consistent format such as Conventional Commits (e.g., `feat: add parser`, `fix: handle empty input`).

For PRs:
- Include a short description, how to run/verify changes, and any follow-ups or linked issues.
- If behavior changes, add or update tests (or explain why not).

## Security & Configuration Tips

- Do not commit secrets. Use environment variables for configuration and keep local `.env` files untracked.
