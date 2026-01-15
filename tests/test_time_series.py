"""Tests for the `TimeSeries` interpolation utility."""

import pytest

from passive_logic_simulator.time_series import TimeSeries


def test_time_series_requires_same_length() -> None:
    with pytest.raises(ValueError, match="same length"):
        TimeSeries(times_s=[0.0, 1.0], values=[1.0])


def test_time_series_requires_at_least_two_points() -> None:
    with pytest.raises(ValueError, match="at least 2"):
        TimeSeries(times_s=[0.0], values=[1.0])


def test_time_series_requires_strictly_increasing_times() -> None:
    with pytest.raises(ValueError, match="strictly increasing"):
        TimeSeries(times_s=[0.0, 0.0], values=[1.0, 2.0])

    with pytest.raises(ValueError, match="strictly increasing"):
        TimeSeries(times_s=[0.0, -1.0], values=[1.0, 2.0])


def test_time_series_linear_interpolation() -> None:
    ts = TimeSeries(times_s=[0.0, 10.0], values=[0.0, 10.0])
    assert ts.value_at(0.0) == 0.0
    assert ts.value_at(10.0) == 10.0
    assert ts.value_at(5.0) == 5.0


def test_time_series_extrapolation_modes() -> None:
    ts = TimeSeries(times_s=[0.0, 10.0], values=[1.0, 3.0])

    assert ts.value_at(-1.0, extrapolation="clamp") == 1.0
    assert ts.value_at(11.0, extrapolation="clamp") == 3.0

    assert ts.value_at(-1.0, extrapolation="zero") == 0.0
    assert ts.value_at(11.0, extrapolation="zero") == 0.0

    with pytest.raises(ValueError, match="before start"):
        ts.value_at(-1.0, extrapolation="error")
    with pytest.raises(ValueError, match="after end"):
        ts.value_at(11.0, extrapolation="error")
