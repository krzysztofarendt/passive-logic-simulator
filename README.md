# passive-logic

## Problem

Simulate heat transfer from a solar thermal collector (“solar panel”) through a pumped fluid loop into a storage tank, producing the tank temperature trajectory `T_tank(t)` given weather inputs and system parameters.

## Quickstart

This repo targets Python 3.12 and uses `uv` for dependency management.

```bash
uv sync
uv run passive-logic-simulator run --config resources/default_config.toml --output-csv out/simulation.csv
```

The output CSV contains:

- `time_s` [s]
- `tank_temperature_k` [K]
- `ambient_temperature_k` [K]
- `irradiance_w_m2` [W/m²]
- `pump_on` (0/1)

## Repository Layout

```text
.
├── main.py                          # Thin runner that delegates to the package CLI
├── pyproject.toml                   # Project metadata + CLI entrypoints
├── resources/
│   ├── default_config.toml          # Default simulation configuration (TOML)
│   └── templates/weather.csv        # Example weather time series for CSV mode
├── src/passive_logic_simulator/
│   ├── __init__.py                  # Public Python API exports
│   ├── __main__.py                  # `python -m passive_logic_simulator`
│   ├── api.py                       # FastAPI backend used by the demo
│   ├── cli.py                       # Typer CLI (`run`, `demo`) + CSV export
│   ├── config.py                    # TOML -> typed `SimulationConfig`
│   ├── control.py                   # Pump hysteresis (deadband) controller
│   ├── numerics.py                  # Fixed-step RK4 + Euler integrators
│   ├── params.py                    # Typed parameter dataclasses + validation
│   ├── physics.py                   # Collector + tank energy-balance functions
│   ├── simulation.py                # Orchestrates weather + control + integration
│   ├── time_series.py               # Linear interpolation for CSV weather
│   └── weather.py                   # Synthetic weather and CSV-backed weather
├── tests/                           # Pytest unit tests for the model + utilities
└── frontend/                        # Demo UI (Vite dev server, talks to `api.py`)
```

## System Overview

Closed-loop hydronic circuit:

1. **Environment** → `G(t)`, `T_amb(t)`
2. **Collector** → useful heat into fluid
3. **Pump/loop** → circulation with `m_dot` when enabled
4. **Tank** → stores heat as a single temperature `T_tank(t)` (well-mixed)

Primary modeling assumptions (kept intentionally simple):
- Tank is **well-mixed** (no stratification).
- Working fluid has constant `c_p` and is single-phase.
- No explicit pipe/heat-exchanger thermal mass; only tank stores energy.
- Collector losses are lumped to outdoor ambient via `U_L`.
- Tank losses are lumped to an indoor/room temperature via `UAtank`.

## Modeling Approach (Lumped-Parameter)

This repository uses a simple, thermodynamically grounded 0D model:

- **Collector**: converts incident solar power into useful heat, reduced by thermal losses to ambient.
- **Pump/loop**: when on, sets a mass flow rate `m_dot` that carries heat from collector → tank.
- **Tank**: treated as a **well-mixed** thermal mass with a single temperature `T_tank(t)` and a lumped heat loss to ambient.

## Governing Equations

Collector useful heat modeled with the Hottel–Whillier–Bliss (HWB) equation:

`Q_u = A * F_R * (eta0 * G(t) - U_L * (T_in - T_amb))`  [W]

Collector outlet temperature (pump on):

`T_out = T_in + Q_u / (m_dot * c_p)`

Tank energy balance (well-mixed tank, loop return from tank):

`dT_tank/dt = (m_dot/m_tank) * (T_out - T_tank) - (UAtank/(m_tank*c_p)) * (T_tank - T_room)`

Notes:
- Clamp `Q_u >= 0` (or turn pump off) if the collector would remove heat from the tank.
- `T_in` is assumed to be the current tank temperature (`T_in = T_tank`) since the loop returns from the tank.
- Use Kelvin for all temperatures (if inputs are in Celsius, add `273.15`).
- Pump control uses a deadband/hysteresis controller (see “Pump Control (Hysteresis)” below).

### Collector Model Note (Evacuated Tube Collectors)

The HWB form above is traditionally used for flat-plate collectors. For
evacuated tube collectors, the underlying heat transfer mechanisms can be
more complex (e.g., geometry effects and, in some designs/operating regimes,
boiling/condensation), so the fitted HWB parameters may lose a strict physical
interpretation and can even become negative during parameter identification.

In practice, the HWB form can still work well as an empirical predictor of
collector outlet temperature for evacuated tube collectors when its coefficients
are identified from measurements. For discussion and a comparison with an
“efficiency equation” (EE) model, see: https://www.mdpi.com/2673-4117/5/4/178

### Pump Control (Hysteresis)

The pump is modeled as an ideal on/off switch that sets the loop mass flow rate:

- If the pump is on: `m_dot = m_dot,design`
- If the pump is off: `m_dot = 0`

If `control.enabled = false`, the pump is forced on (always circulating).

If `control.enabled = true`, the pump state is updated once per simulation time step using hysteresis:

1. Apply an irradiance gate: if `G(t) < G_min`, force the pump off.
2. Compute a **nominal** outlet temperature `T_out,nom` assuming the pump is on at the design mass flow rate (this is used only for the control decision):

   - `Q_u,nom = max(0, A * F_R * (eta0 * G(t) - U_L * (T_tank - T_amb)))`
   - `T_out,nom = T_tank + Q_u,nom / (m_dot,design * c_p)`

3. Apply deadband thresholds:
   - Turn on if currently off and `T_out,nom > T_tank + ΔT_on`
   - Stay on if currently on and `T_out,nom > T_tank + ΔT_off` (with `ΔT_off <= ΔT_on`)

Within a time step, the computed pump state is held constant for the RK4 sub-steps.

## Numerical Integration

The system is integrated forward in time using a fixed-step method on the tank temperature ODE:

- State: `T_tank(t)` [K]
- Solver: RK4 (default) or forward Euler, both with step `dt_s`
- Switching: pump state updates once per step (hysteresis) and is held constant during the RK4 sub-stages; choose `dt_s` small enough (e.g., 1–30 s) to resolve switching cleanly.
- For fixed-step solvers, `duration_s` should be an integer multiple of `dt_s`.

## Parameters (Units)

- `A` [m²]: collector area
- `G(t)` [W/m²]: solar irradiance vs time
- `eta0` [-]: optical efficiency intercept (zero temperature lift)
- `F_R` [-]: heat removal factor (0–1)
- `U_L` [W/(m²·K)]: collector overall heat-loss coefficient
- `T_in` [K]: collector inlet fluid temperature (typically `T_tank`)
- `T_out` [K]: collector outlet fluid temperature
- `T_amb` [K]: outdoor ambient temperature
- `T_room` [K]: indoor/room temperature (tank loss reference)
- `m_dot` [kg/s]: loop mass flow rate when pump is on
- `c_p` [J/(kg·K)]: fluid specific heat capacity
- `m_tank` [kg]: tank fluid mass (`≈ ρ * V`)
- `UAtank` [W/K]: tank heat-loss coefficient times area (lumped)
- `dt_s` [s]: numerical time step for simulation
- `G_min` [W/m²]: minimum irradiance for pump operation (optional)
- `ΔT_on`, `ΔT_off` [K]: pump control deadband thresholds (optional)
- `T_out,nom` [K]: nominal collector outlet temperature used for control decisions

## Usage

Edit parameters in `resources/default_config.toml` and run:

```bash
uv run passive-logic-simulator run --config resources/default_config.toml --output-csv out/simulation.csv
```

You can also run via Python module entrypoints:

```bash
uv run python -m passive_logic_simulator run --config resources/default_config.toml --output-csv out/simulation.csv
uv run python main.py run --config resources/default_config.toml --output-csv out/simulation.csv
```

To use Euler (for numerical error comparisons):

```bash
uv run passive-logic-simulator run --solver euler --config resources/default_config.toml --output-csv out/simulation.csv
```

To start the demo webapp (backend + frontend):

```bash
uv run passive-logic-simulator demo
```

Demo notes:
- Requires Node.js + `npm` (the first run will install frontend dependencies under `frontend/node_modules/`).
- Backend serves on `http://localhost:8000`, frontend dev server on `http://localhost:5173` (both configurable via CLI flags).

## Python API

For programmatic use (e.g., notebooks), the package exposes a small public API:

```python
from passive_logic_simulator import load_config, run_simulation

config = load_config("resources/default_config.toml")
result = run_simulation(config, solver="rk4")
print(result.tank_temperature_k[-1])
```

### Synthetic weather (default)

By default (`weather.kind = "synthetic"`), the simulator uses a simple, parameterized
weather model intended for quick experiments (it does **not** model sun position):

- **Solar irradiance** `G(t)` [W/m²]: `0` outside the interval `[sunrise_s, sunset_s]`,
  and a smooth clear-day curve inside that window:

  `x = (t_s - sunrise_s) / (sunset_s - sunrise_s)`

  `G(t_s) = peak_irradiance_w_m2 * (1 - cos(2*pi * x)) / 2`

- **Outdoor ambient temperature** `T_amb(t)` [K]: a cosine wave with a configurable peak time:

  `T_amb(t_s) = ambient_mean_k + ambient_amplitude_k * cos(2*pi*(t_s - ambient_peak_s)/ambient_period_s)`

Notes:
- `t_s` is the simulation time in seconds (see `simulation.t0_s` / `simulation.duration_s`).
- Set `sunrise_s` / `sunset_s` to match your timeline (e.g., seconds since midnight for a 24h run).
- `ambient_peak_s` is the time (in the same `t_s` coordinate) when ambient temperature reaches its maximum.

### Weather from CSV

Set `weather.kind = "csv"` and point `weather.csv_path` at a file with (by default) these columns:

- `time_s`
- `irradiance_w_m2`
- `ambient_k`

An example file is provided at `resources/templates/weather.csv`.

## Development

This project targets Python 3.12 and uses `uv`.

```bash
uv sync
uv run python main.py
uv run pytest

# or run the installed CLI entrypoint:
uv run passive-logic-simulator run --config resources/default_config.toml --output-csv out/simulation.csv
uv run passive-logic-simulator demo
```
