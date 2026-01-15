# Repository Guidelines

## Project Structure & Module Organization

- `src/passive_logic_simulator/` contains the simulation package code.
- `main.py` is a thin runner that invokes the package CLI.
- `pyproject.toml` defines project metadata and dependencies.
- `uv.lock` and `.venv/` support reproducible environments via `uv`.

Keep new simulation code inside the package and avoid growing `main.py`.

## Simulation Conventions

- Model: solar collector → pumped loop → well-mixed storage tank (single state `T_tank`).
- Units: **all temperatures are Kelvin**; keep parameters consistent with the units listed in `README.md`.
- Control: pump uses hysteresis (`ΔT_on`, `ΔT_off`) and should not cool the tank (collector useful heat is clamped to `Q_u >= 0`).
- Numerics: fixed-step **RK4** (default) or **Euler**; pump state updates once per time step and is held constant within the step (and RK4 sub-steps).
- Numerics: `duration_s` should be an integer multiple of `dt_s`.
- Weather inputs: `G(t)` and outdoor `T_amb(t)` can come from a synthetic model or a CSV time series.
- Tank losses: use constant indoor/room temperature `T_room` (configurable) as the tank loss reference.

## Build, Test, and Development Commands

This repo targets Python 3.12 (see `.python-version`) and uses `uv` for dependency management.

- `uv sync`: create/update the virtual environment from `pyproject.toml`/`uv.lock`.
- `uv run python main.py`: run the application using the managed environment.
- `uv run passive-logic-simulator run --config resources/default_config.toml --output-csv out/simulation.csv`: run via the package CLI and write results to CSV.
- `uv run passive-logic-simulator demo`: start the demo webapp (backend + frontend).
- `uv add <package>`: add a dependency and update the lockfile.

When tests exist:
- `uv run pytest`: run the test suite.

## Coding Style & Naming Conventions

- Indentation: 4 spaces; follow PEP 8.
- Naming: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Prefer explicit types for public functions and return values (type hints), and keep modules small and focused.

No formatter/linter is configured yet; if you introduce one (for example `ruff`), apply it consistently and document the new command(s) here.

## Testing Guidelines

Tests use `pytest` and live under `tests/`. When adding tests:

- Use `pytest`.
- Place tests under `tests/` and name files `test_*.py`.
- Keep tests deterministic (no network calls; use fakes/fixtures where needed).

## Commit & Pull Request Guidelines

This repository has no established commit-message convention yet. Use a clear, consistent format such as Conventional Commits (e.g., `feat: add parser`, `fix: handle empty input`).

For PRs:
- Include a short description, how to run/verify changes, and any follow-ups or linked issues.
- If behavior changes, add or update tests (or explain why not).

## Security & Configuration Tips

- Do not commit secrets. Use environment variables for configuration and keep local `.env` files untracked.
