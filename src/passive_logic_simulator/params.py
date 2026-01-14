from __future__ import annotations

"""Typed parameter sets for the physical model."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CollectorParams:
    """Collector model parameters."""

    area_m2: float
    heat_removal_factor: float  # F_R [-]
    optical_efficiency: float  # eta0 [-]
    loss_coefficient_w_m2k: float  # U_L [W/(m^2*K)]


@dataclass(frozen=True)
class TankParams:
    """Tank model parameters and initial conditions."""

    mass_kg: float
    cp_j_kgk: float
    ua_w_k: float  # UAtank [W/K]
    initial_temperature_k: float
    room_temperature_k: float


@dataclass(frozen=True)
class PumpParams:
    """Pump/loop parameters."""

    mass_flow_kg_s: float  # m_dot [kg/s] when on


@dataclass(frozen=True)
class ControlParams:
    """Controller settings for the pump."""

    enabled: bool = True
    delta_t_on_k: float = 2.0
    delta_t_off_k: float = 1.0
    min_irradiance_w_m2: float = 25.0


@dataclass(frozen=True)
class SimulationParams:
    """Simulation timeline and fixed-step integration settings."""

    t0_s: float
    dt_s: float
    duration_s: float
