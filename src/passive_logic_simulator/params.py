"""Typed parameter sets for the physical model.

The simulator uses a small set of dataclasses to represent inputs. Parameters
are validated on construction so that downstream simulation code can assume
basic invariants (e.g., positive masses and time steps).

All temperatures are in Kelvin (K).
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def _require_finite(name: str, value: float) -> None:
    """Validate that a numeric value is finite (not NaN/inf)."""
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite, got {value!r}")


def _require_positive(name: str, value: float) -> None:
    """Validate that a numeric value is finite and strictly positive."""
    _require_finite(name, value)
    if value <= 0.0:
        raise ValueError(f"{name} must be > 0, got {value!r}")


def _require_non_negative(name: str, value: float) -> None:
    """Validate that a numeric value is finite and non-negative."""
    _require_finite(name, value)
    if value < 0.0:
        raise ValueError(f"{name} must be >= 0, got {value!r}")


def _require_unit_interval(name: str, value: float) -> None:
    """Validate that a numeric value lies within the closed unit interval [0, 1]."""
    _require_finite(name, value)
    if not (0.0 <= value <= 1.0):
        raise ValueError(f"{name} must be in [0, 1], got {value!r}")


@dataclass(frozen=True)
class CollectorParams:
    """Collector model parameters."""

    area_m2: float
    heat_removal_factor: float  # F_R [-]
    optical_efficiency: float  # eta0 [-]
    loss_coefficient_w_m2k: float  # U_L [W/(m^2*K)]

    def __post_init__(self) -> None:
        _require_positive("collector.area_m2", self.area_m2)
        _require_unit_interval("collector.heat_removal_factor", self.heat_removal_factor)
        _require_unit_interval("collector.optical_efficiency", self.optical_efficiency)
        _require_non_negative("collector.loss_coefficient_w_m2k", self.loss_coefficient_w_m2k)


@dataclass(frozen=True)
class TankParams:
    """Tank model parameters and initial conditions."""

    mass_kg: float
    cp_j_kgk: float
    ua_w_k: float  # UAtank [W/K]
    initial_temperature_k: float
    room_temperature_k: float

    def __post_init__(self) -> None:
        _require_positive("tank.mass_kg", self.mass_kg)
        _require_positive("tank.cp_j_kgk", self.cp_j_kgk)
        _require_non_negative("tank.ua_w_k", self.ua_w_k)
        _require_non_negative("tank.initial_temperature_k", self.initial_temperature_k)
        _require_non_negative("tank.room_temperature_k", self.room_temperature_k)


@dataclass(frozen=True)
class PumpParams:
    """Pump/loop parameters."""

    mass_flow_kg_s: float  # m_dot [kg/s] when on

    def __post_init__(self) -> None:
        _require_non_negative("pump.mass_flow_kg_s", self.mass_flow_kg_s)


@dataclass(frozen=True)
class ControlParams:
    """Controller settings for the pump."""

    enabled: bool = True
    delta_t_on_k: float = 2.0
    delta_t_off_k: float = 1.0
    min_irradiance_w_m2: float = 25.0

    def __post_init__(self) -> None:
        _require_non_negative("control.delta_t_on_k", self.delta_t_on_k)
        _require_non_negative("control.delta_t_off_k", self.delta_t_off_k)
        if self.delta_t_off_k > self.delta_t_on_k:
            raise ValueError("control.delta_t_off_k must be <= control.delta_t_on_k")
        _require_non_negative("control.min_irradiance_w_m2", self.min_irradiance_w_m2)


@dataclass(frozen=True)
class SimulationParams:
    """Simulation timeline and fixed-step integration settings."""

    t0_s: float
    dt_s: float
    duration_s: float

    def __post_init__(self) -> None:
        _require_finite("simulation.t0_s", self.t0_s)
        _require_positive("simulation.dt_s", self.dt_s)
        _require_non_negative("simulation.duration_s", self.duration_s)
