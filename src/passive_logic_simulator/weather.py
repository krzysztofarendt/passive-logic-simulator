"""Weather input models.

Two sources are supported:
- Synthetic (clear-day irradiance + sinusoidal ambient temperature)
- CSV time series with linear interpolation
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from math import cos, pi
from pathlib import Path
from typing import Protocol, TypeAlias

from passive_logic_simulator.time_series import ExtrapolationMode, TimeSeries


class Weather(Protocol):
    """Callable weather interface used by the simulator."""

    def irradiance_w_m2(self, t_s: float) -> float: ...

    def ambient_temperature_k(self, t_s: float) -> float: ...


@dataclass(frozen=True)
class SyntheticWeatherConfig:
    """Parameters for the built-in synthetic weather model."""

    sunrise_s: float
    sunset_s: float
    peak_irradiance_w_m2: float
    ambient_mean_k: float
    ambient_amplitude_k: float
    ambient_period_s: float


@dataclass(frozen=True)
class CsvWeatherConfig:
    """Parameters for a CSV-backed weather model."""

    csv_path: Path
    time_column: str = "time_s"
    irradiance_column: str = "irradiance_w_m2"
    ambient_column: str = "ambient_k"
    extrapolation: ExtrapolationMode = "clamp"


WeatherConfig: TypeAlias = SyntheticWeatherConfig | CsvWeatherConfig


def irradiance_clear_day_w_m2(t_s: float, *, sunrise_s: float, sunset_s: float, peak_w_m2: float) -> float:
    """Simple clear-day irradiance curve (half-sine between sunrise and sunset)."""
    if t_s < sunrise_s or t_s > sunset_s:
        return 0.0
    x = (t_s - sunrise_s) / (sunset_s - sunrise_s)
    return peak_w_m2 * (1.0 - cos(pi * x)) / 2.0


def ambient_sinusoid_k(t_s: float, *, mean_k: float, amplitude_k: float, period_s: float) -> float:
    """Simple ambient temperature model (cosine over `period_s`)."""
    return mean_k + amplitude_k * cos(2.0 * pi * t_s / period_s)


@dataclass(frozen=True)
class SyntheticWeather:
    """Synthetic weather implementation."""

    config: SyntheticWeatherConfig

    def irradiance_w_m2(self, t_s: float) -> float:
        return irradiance_clear_day_w_m2(
            t_s,
            sunrise_s=self.config.sunrise_s,
            sunset_s=self.config.sunset_s,
            peak_w_m2=self.config.peak_irradiance_w_m2,
        )

    def ambient_temperature_k(self, t_s: float) -> float:
        return ambient_sinusoid_k(
            t_s,
            mean_k=self.config.ambient_mean_k,
            amplitude_k=self.config.ambient_amplitude_k,
            period_s=self.config.ambient_period_s,
        )


@dataclass(frozen=True)
class CsvWeather:
    """CSV weather implementation using piecewise-linear interpolation."""

    irradiance_w_m2_series: TimeSeries
    ambient_temperature_k_series: TimeSeries
    extrapolation: ExtrapolationMode = "clamp"

    def irradiance_w_m2(self, t_s: float) -> float:
        return self.irradiance_w_m2_series.value_at(t_s, extrapolation=self.extrapolation)

    def ambient_temperature_k(self, t_s: float) -> float:
        return self.ambient_temperature_k_series.value_at(t_s, extrapolation=self.extrapolation)


def _read_csv_weather(config: CsvWeatherConfig) -> CsvWeather:
    """Load weather time series from a CSV file into interpolatable structures."""
    with config.csv_path.open(newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    times: list[float] = []
    g: list[float] = []
    t_amb_k: list[float] = []
    for i, row in enumerate(rows, start=1):
        try:
            times.append(float(row[config.time_column]))
            g.append(float(row[config.irradiance_column]))
            t_amb_k.append(float(row[config.ambient_column]))
        except KeyError as e:
            raise ValueError(f"Missing column {e!s} in {config.csv_path}") from e
        except ValueError as e:
            raise ValueError(f"Invalid numeric value in {config.csv_path} at row {i}") from e

    if len(times) < 2:
        raise ValueError(f"{config.csv_path} must have at least 2 rows")

    return CsvWeather(
        irradiance_w_m2_series=TimeSeries(times_s=times, values=g),
        ambient_temperature_k_series=TimeSeries(times_s=times, values=t_amb_k),
        extrapolation=config.extrapolation,
    )


def build_weather(config: WeatherConfig) -> Weather:
    """Build a concrete `Weather` implementation from a weather config."""
    if isinstance(config, SyntheticWeatherConfig):
        return SyntheticWeather(config)
    if isinstance(config, CsvWeatherConfig):
        return _read_csv_weather(config)
    raise TypeError(f"Unsupported WeatherConfig: {type(config).__name__}")
