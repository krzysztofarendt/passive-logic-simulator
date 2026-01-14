from __future__ import annotations

"""
Minimal time-series utilities used by the simulator.

The simulator needs to query weather inputs as functions of time, e.g. `G(t)` and
`T_amb(t)`. This module provides a small, dependency-free helper for piecewise
linear interpolation over a strictly increasing time grid.
"""

from dataclasses import dataclass
from typing import Literal


ExtrapolationMode = Literal["clamp", "zero", "error"]


@dataclass(frozen=True)
class TimeSeries:
    """A 1D time series with linear interpolation.

    - `times_s` must be strictly increasing and expressed in seconds.
    - `values` is the corresponding scalar value at each time.

    Interpolation is linear between adjacent points. Behavior outside the time
    span is controlled by `extrapolation` in `value_at`.
    """

    times_s: list[float]
    values: list[float]

    def __post_init__(self) -> None:
        if len(self.times_s) != len(self.values):
            raise ValueError("TimeSeries.times_s and TimeSeries.values must have the same length")
        if len(self.times_s) < 2:
            raise ValueError("TimeSeries must have at least 2 points")
        if any(t2 <= t1 for t1, t2 in zip(self.times_s, self.times_s[1:])):
            raise ValueError("TimeSeries.times_s must be strictly increasing")

    def value_at(self, t_s: float, *, extrapolation: ExtrapolationMode = "clamp") -> float:
        """Return the interpolated value at time `t_s`.

        Args:
            t_s: Query time in seconds.
            extrapolation: Out-of-range behavior:
                - `"clamp"`: return the nearest endpoint value
                - `"zero"`: return `0.0`
                - `"error"`: raise `ValueError`
        """
        if t_s <= self.times_s[0]:
            if extrapolation == "clamp":
                return self.values[0]
            if extrapolation == "zero":
                return 0.0
            raise ValueError(f"t_s={t_s} is before start of series")
        if t_s >= self.times_s[-1]:
            if extrapolation == "clamp":
                return self.values[-1]
            if extrapolation == "zero":
                return 0.0
            raise ValueError(f"t_s={t_s} is after end of series")

        lo = 0
        hi = len(self.times_s) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.times_s[mid] <= t_s:
                lo = mid
            else:
                hi = mid

        t0 = self.times_s[lo]
        t1 = self.times_s[hi]
        v0 = self.values[lo]
        v1 = self.values[hi]

        if t1 == t0:
            return v0
        alpha = (t_s - t0) / (t1 - t0)
        return v0 + alpha * (v1 - v0)
