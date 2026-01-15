"""Numerical utilities used by the simulator."""

from __future__ import annotations

from collections.abc import Callable


def rk4_step(
    t_s: float,
    y: float,
    dt_s: float,
    f: Callable[[float, float], float],
) -> float:
    """Advance a scalar ODE one fixed step using classic 4th-order Runge-Kutta.

    Args:
        t_s: Current time [s].
        y: Current state value.
        dt_s: Fixed step size [s].
        f: RHS function implementing `dy/dt = f(t, y)`.
    """
    k1 = f(t_s, y)
    k2 = f(t_s + dt_s / 2.0, y + dt_s * k1 / 2.0)
    k3 = f(t_s + dt_s / 2.0, y + dt_s * k2 / 2.0)
    k4 = f(t_s + dt_s, y + dt_s * k3)
    return y + (dt_s / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def euler_step(
    t_s: float,
    y: float,
    dt_s: float,
    f: Callable[[float, float], float],
) -> float:
    """Advance a scalar ODE one fixed step using forward Euler."""
    return y + dt_s * f(t_s, y)
