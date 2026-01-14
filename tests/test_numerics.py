import math

from passive_logic_simulator.numerics import rk4_step


def test_rk4_step_matches_exponential_growth() -> None:
    # dy/dt = y, y(0)=1 => y(t)=exp(t)
    dt = 0.1
    y1 = rk4_step(0.0, 1.0, dt, lambda _t, y: y)
    assert math.isclose(y1, math.exp(dt), rel_tol=0.0, abs_tol=1e-7)
