# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

passive-logic is a Python project using Python 3.12.

It simulates a simple solar-thermal system (collector + pump loop + storage tank) without needing the original exercise screenshot.

## Development Setup

This project uses `uv` for dependency management (indicated by pyproject.toml structure and .python-version file).

```bash
# Install dependencies
uv sync

# Run the application (thin runner)
uv run python main.py

# Run via the package CLI and export results
uv run passive-logic-simulator --config resources/default_config.toml --output-csv out/simulation.csv
```

## Project Structure

- `src/passive_logic_simulator/` - Simulation package (modular code)
- `resources/default_config.toml` - Default simulation configuration
- `main.py` - Thin runner that calls the package CLI
- `pyproject.toml` - Project configuration and dependencies

## Simulation Summary (Decisions)

- System: environment → **solar collector** → **pump/loop** → **storage tank** → return to collector.
- State: tank modeled as **well-mixed** with a single temperature `T_tank(t)` (no stratification).
- Units: **Kelvin for all temperatures**.
- Collector model: useful heat `Q_u = A * F_R * (eta0 * G(t) - U_L * (T_in - T_amb))`, clamped to `Q_u >= 0` to avoid cooling the tank.
- Pump control: hysteresis deadband (`ΔT_on`, `ΔT_off`) based on nominal collector outlet vs tank temperature; optional minimum irradiance.
- Tank losses: lumped to a constant indoor/room temperature `T_room` (configurable).
- Integration: fixed-step **RK4** on the tank ODE; pump state is updated once per time step and held constant within the RK4 sub-steps.

For the full equations and parameter definitions, see `README.md`.
