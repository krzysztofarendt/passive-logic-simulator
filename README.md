# passive-logic

## Problem

Simulate heat transfer from a solar thermal collector (“solar panel”) through a pumped fluid loop into a storage tank, producing the tank temperature trajectory `T_tank(t)` given weather inputs and system parameters.

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

Collector useful heat (Hottel–Whillier-style form):

`Q_u = A * F_R * (eta0 * G(t) - U_L * (T_in - T_amb))`  [W]

Collector outlet temperature (pump on):

`T_out = T_in + Q_u / (m_dot * c_p)`

Tank energy balance (well-mixed tank, loop return from tank):

`dT_tank/dt = (m_dot/m_tank) * (T_out - T_tank) - (UAtank/(m_tank*c_p)) * (T_tank - T_room)`

Notes:
- Clamp `Q_u >= 0` (or turn pump off) if the collector would remove heat from the tank.
- Use Kelvin for all temperatures (if inputs are in Celsius, add `273.15`).
- A common control is a deadband: pump ON if `T_out,nom > T_tank + ΔT_on`, pump OFF if `T_out,nom < T_tank + ΔT_off`.

## Numerical Integration

The system is integrated forward in time using a fixed-step 4th-order Runge–Kutta (RK4) method on the tank temperature ODE:

- State: `T_tank(t)` [K]
- Solver: RK4 with step `dt`
- Switching: pump state updates once per step (hysteresis) and is held constant during the RK4 sub-stages; choose `dt` small enough (e.g., 1–30 s) to resolve switching cleanly.

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
- `dt` [s]: numerical time step for simulation
- `ΔT_on`, `ΔT_off` [K]: pump control deadband thresholds (optional)

## Usage

Edit parameters in `resources/default_config.toml` and run:

```bash
uv run passive-logic-simulator --config resources/default_config.toml --output-csv out/simulation.csv
```

The output CSV contains:

- `time_s`
- `tank_temperature_k`
- `ambient_temperature_k`
- `irradiance_w_m2`
- `pump_on` (0/1)

### Weather from CSV

Set `weather.kind = "csv"` and point `weather.csv_path` at a file with (by default) these columns:

- `time_s`
- `irradiance_w_m2`
- `ambient_k`

## Development

This project targets Python 3.12 and uses `uv`.

```bash
uv sync
uv run python main.py

# or run the installed CLI entrypoint:
uv run passive-logic-simulator --config resources/default_config.toml --output-csv out/simulation.csv
```
