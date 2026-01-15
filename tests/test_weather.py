"""Tests for synthetic and CSV-backed weather models."""

import math
from pathlib import Path

import pytest

from passive_logic_simulator.weather import (
    CsvWeatherConfig,
    SyntheticWeatherConfig,
    ambient_sinusoid_k,
    build_weather,
    irradiance_clear_day_w_m2,
)


def test_irradiance_clear_day_is_zero_outside_window() -> None:
    assert irradiance_clear_day_w_m2(0.0, sunrise_s=10.0, sunset_s=20.0, peak_w_m2=100.0) == 0.0
    assert irradiance_clear_day_w_m2(25.0, sunrise_s=10.0, sunset_s=20.0, peak_w_m2=100.0) == 0.0


def test_irradiance_clear_day_is_zero_at_endpoints_and_peaks_midday() -> None:
    sunrise_s = 10.0
    sunset_s = 20.0
    peak = 100.0
    assert irradiance_clear_day_w_m2(sunrise_s, sunrise_s=sunrise_s, sunset_s=sunset_s, peak_w_m2=peak) == 0.0
    assert irradiance_clear_day_w_m2(sunset_s, sunrise_s=sunrise_s, sunset_s=sunset_s, peak_w_m2=peak) == 0.0

    midday_s = (sunrise_s + sunset_s) / 2.0
    assert irradiance_clear_day_w_m2(midday_s, sunrise_s=sunrise_s, sunset_s=sunset_s, peak_w_m2=peak) == peak


def test_ambient_sinusoid_peaks_at_peak_s() -> None:
    # At the configured peak time, the cosine argument is 0 and we get mean + amplitude.
    assert math.isclose(ambient_sinusoid_k(25.0, mean_k=300.0, amplitude_k=5.0, period_s=100.0, peak_s=25.0), 305.0)
    # Half a period later, we get the minimum: mean - amplitude.
    assert math.isclose(ambient_sinusoid_k(75.0, mean_k=300.0, amplitude_k=5.0, period_s=100.0, peak_s=25.0), 295.0)


def test_build_weather_synthetic() -> None:
    w = build_weather(
        SyntheticWeatherConfig(
            sunrise_s=0.0,
            sunset_s=10.0,
            peak_irradiance_w_m2=100.0,
            ambient_mean_k=300.0,
            ambient_amplitude_k=0.0,
            ambient_period_s=1.0,
            ambient_peak_s=0.0,
        )
    )
    assert w.irradiance_w_m2(-1.0) == 0.0
    assert w.ambient_temperature_k(123.0) == 300.0


def test_synthetic_irradiance_repeats_daily() -> None:
    w = build_weather(
        SyntheticWeatherConfig(
            sunrise_s=10.0,
            sunset_s=20.0,
            peak_irradiance_w_m2=100.0,
            ambient_mean_k=300.0,
            ambient_amplitude_k=0.0,
            ambient_period_s=86400.0,
            ambient_peak_s=0.0,
        )
    )
    t = 15.0
    assert w.irradiance_w_m2(t) > 0.0
    assert math.isclose(w.irradiance_w_m2(t), w.irradiance_w_m2(t + 86400.0))


def test_build_weather_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "weather.csv"
    csv_path.write_text(
        "time_s,irradiance_w_m2,ambient_k\n0,0,300\n10,10,310\n",
        encoding="utf-8",
    )
    w = build_weather(CsvWeatherConfig(csv_path=csv_path))
    assert w.irradiance_w_m2(5.0) == 5.0
    assert w.ambient_temperature_k(5.0) == 305.0


def test_build_weather_csv_requires_enough_rows(tmp_path: Path) -> None:
    csv_path = tmp_path / "weather.csv"
    csv_path.write_text("time_s,irradiance_w_m2,ambient_k\n0,0,300\n", encoding="utf-8")
    with pytest.raises(ValueError, match="at least 2 rows"):
        build_weather(CsvWeatherConfig(csv_path=csv_path))
