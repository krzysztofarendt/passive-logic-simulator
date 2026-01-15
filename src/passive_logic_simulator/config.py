"""Load simulation configuration from TOML.

The config file is designed to be front-end friendly (simple scalar fields and
tables), so it can be mirrored later in a web UI and sent to a backend.

All temperatures are in Kelvin (K). See `README.md` for the full parameter
definitions and units.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import tomllib

from passive_logic_simulator.params import (
    CollectorParams,
    ControlParams,
    PumpParams,
    SimulationParams,
    TankParams,
)
from passive_logic_simulator.weather import CsvWeatherConfig, SyntheticWeatherConfig, WeatherConfig


@dataclass(frozen=True)
class SimulationConfig:
    """Fully specified configuration for a simulation run."""

    collector: CollectorParams
    tank: TankParams
    pump: PumpParams
    control: ControlParams
    sim: SimulationParams
    weather: WeatherConfig


def _require_mapping(value: Any, *, key_path: str) -> dict[str, Any]:
    """Validate that a TOML value is a table (dict-like mapping).

    Args:
        value: Parsed TOML value.
        key_path: Dotted key path used for error messages.
    """
    if not isinstance(value, dict):
        raise ValueError(f"Expected table at '{key_path}', got {type(value).__name__}")
    return value


def _get_float(table: dict[str, Any], key: str, *, default: float | None = None, key_path: str) -> float:
    """Read a numeric value from a TOML table.

    Args:
        table: Parsed TOML table.
        key: Field name within the table.
        default: Optional default to use when `key` is missing.
        key_path: Dotted key path used for error messages.
    """
    if key in table:
        value = table[key]
        if isinstance(value, (int, float)):
            return float(value)
        raise ValueError(f"Expected number at '{key_path}.{key}', got {type(value).__name__}")
    if default is None:
        raise ValueError(f"Missing required key '{key_path}.{key}'")
    return default


def _get_bool(table: dict[str, Any], key: str, *, default: bool | None = None, key_path: str) -> bool:
    """Read a boolean value from a TOML table."""
    if key in table:
        value = table[key]
        if isinstance(value, bool):
            return value
        raise ValueError(f"Expected boolean at '{key_path}.{key}', got {type(value).__name__}")
    if default is None:
        raise ValueError(f"Missing required key '{key_path}.{key}'")
    return default


def _get_str(table: dict[str, Any], key: str, *, default: str | None = None, key_path: str) -> str:
    """Read a string value from a TOML table."""
    if key in table:
        value = table[key]
        if isinstance(value, str):
            return value
        raise ValueError(f"Expected string at '{key_path}.{key}', got {type(value).__name__}")
    if default is None:
        raise ValueError(f"Missing required key '{key_path}.{key}'")
    return default


def _parse_weather(config: dict[str, Any], *, base_dir: Path) -> WeatherConfig:
    """Parse the `[weather]` table into a concrete weather config."""
    weather_table = _require_mapping(config.get("weather", {}), key_path="weather")
    kind = _get_str(weather_table, "kind", default="synthetic", key_path="weather")
    if kind == "synthetic":
        ambient_period_s = _get_float(weather_table, "ambient_period_s", default=24 * 3600, key_path="weather")
        return SyntheticWeatherConfig(
            sunrise_s=_get_float(weather_table, "sunrise_s", default=6 * 3600, key_path="weather"),
            sunset_s=_get_float(weather_table, "sunset_s", default=18 * 3600, key_path="weather"),
            peak_irradiance_w_m2=_get_float(
                weather_table, "peak_irradiance_w_m2", default=850.0, key_path="weather"
            ),
            ambient_mean_k=_get_float(weather_table, "ambient_mean_k", default=293.15, key_path="weather"),
            ambient_amplitude_k=_get_float(weather_table, "ambient_amplitude_k", default=6.0, key_path="weather"),
            ambient_period_s=ambient_period_s,
            ambient_peak_s=_get_float(
                weather_table,
                "ambient_peak_s",
                default=0.625 * ambient_period_s,
                key_path="weather",
            ),
        )
    if kind == "csv":
        csv_path = Path(_get_str(weather_table, "csv_path", key_path="weather"))
        if not csv_path.is_absolute():
            csv_path = (base_dir / csv_path).resolve()
        # Keep extrapolation modes explicit so a UI can present a finite set.
        extrapolation = _get_str(weather_table, "extrapolation", default="clamp", key_path="weather")
        if extrapolation not in {"clamp", "zero", "error"}:
            raise ValueError("weather.extrapolation must be one of: 'clamp', 'zero', 'error'")
        return CsvWeatherConfig(
            csv_path=csv_path,
            time_column=_get_str(weather_table, "time_column", default="time_s", key_path="weather"),
            irradiance_column=_get_str(
                weather_table, "irradiance_column", default="irradiance_w_m2", key_path="weather"
            ),
            ambient_column=_get_str(weather_table, "ambient_column", default="ambient_k", key_path="weather"),
            extrapolation=extrapolation,
        )
    raise ValueError(f"Unsupported weather.kind='{kind}' (expected 'synthetic' or 'csv')")


def load_config(path: str | Path) -> SimulationConfig:
    """Load a TOML file and convert it into a typed `SimulationConfig`."""
    path = Path(path)
    raw = tomllib.loads(path.read_text(encoding="utf-8"))
    root = _require_mapping(raw, key_path="root")

    collector_table = _require_mapping(root.get("collector", {}), key_path="collector")
    tank_table = _require_mapping(root.get("tank", {}), key_path="tank")
    pump_table = _require_mapping(root.get("pump", {}), key_path="pump")
    control_table = _require_mapping(root.get("control", {}), key_path="control")
    sim_table = _require_mapping(root.get("simulation", {}), key_path="simulation")

    collector = CollectorParams(
        area_m2=_get_float(collector_table, "area_m2", default=2.0, key_path="collector"),
        heat_removal_factor=_get_float(
            collector_table, "heat_removal_factor", default=0.9, key_path="collector"
        ),
        optical_efficiency=_get_float(
            collector_table, "optical_efficiency", default=0.75, key_path="collector"
        ),
        loss_coefficient_w_m2k=_get_float(
            collector_table, "loss_coefficient_w_m2k", default=5.0, key_path="collector"
        ),
    )

    tank = TankParams(
        mass_kg=_get_float(tank_table, "mass_kg", default=200.0, key_path="tank"),
        cp_j_kgk=_get_float(tank_table, "cp_j_kgk", default=4180.0, key_path="tank"),
        ua_w_k=_get_float(tank_table, "ua_w_k", default=3.0, key_path="tank"),
        initial_temperature_k=_get_float(
            tank_table, "initial_temperature_k", default=293.15, key_path="tank"
        ),
        room_temperature_k=_get_float(tank_table, "room_temperature_k", default=293.15, key_path="tank"),
    )

    pump = PumpParams(
        mass_flow_kg_s=_get_float(pump_table, "mass_flow_kg_s", default=0.05, key_path="pump")
    )

    control = ControlParams(
        enabled=_get_bool(control_table, "enabled", default=True, key_path="control"),
        delta_t_on_k=_get_float(control_table, "delta_t_on_k", default=2.0, key_path="control"),
        delta_t_off_k=_get_float(control_table, "delta_t_off_k", default=1.0, key_path="control"),
        min_irradiance_w_m2=_get_float(
            control_table, "min_irradiance_w_m2", default=25.0, key_path="control"
        ),
    )

    sim = SimulationParams(
        t0_s=_get_float(sim_table, "t0_s", default=0.0, key_path="simulation"),
        dt_s=_get_float(sim_table, "dt_s", default=10.0, key_path="simulation"),
        duration_s=_get_float(sim_table, "duration_s", default=24 * 3600, key_path="simulation"),
    )

    weather = _parse_weather(root, base_dir=path.parent)

    return SimulationConfig(
        collector=collector,
        tank=tank,
        pump=pump,
        control=control,
        sim=sim,
        weather=weather,
    )
