from __future__ import annotations

"""Top-level simulation orchestration.

This module wires together:
- weather inputs (`G(t)`, `T_amb(t)`)
- pump hysteresis control (updated once per step)
- RK4 fixed-step integration of the single tank state `T_tank`
"""

from dataclasses import dataclass

from passive_logic_simulator.config import SimulationConfig
from passive_logic_simulator.control import update_pump_state
from passive_logic_simulator.numerics import rk4_step
from passive_logic_simulator.physics import collector_outlet_k, collector_useful_heat_w, tank_dTdt_k_s
from passive_logic_simulator.weather import build_weather


@dataclass(frozen=True)
class SimulationResult:
    """Time series produced by the simulator (suitable for plotting/export)."""

    times_s: list[float]
    tank_temperature_k: list[float]
    ambient_temperature_k: list[float]
    irradiance_w_m2: list[float]
    pump_on: list[bool]


def run_simulation(config: SimulationConfig) -> SimulationResult:
    """Run a transient simulation and return the full trajectory."""
    weather = build_weather(config.weather)

    times_s: list[float] = []
    tank_temperature_k: list[float] = []
    ambient_temperature_k: list[float] = []
    irradiance_w_m2: list[float] = []
    pump_on_series: list[bool] = []

    t_s = config.sim.t0_s
    t_tank_k = config.tank.initial_temperature_k
    pump_on = False

    # Fixed-step integration; `pump_on` is updated once per step and held constant
    # during all RK4 sub-stages for that step (per README/AGENTS conventions).
    n_steps = int(config.sim.duration_s // config.sim.dt_s)
    for step in range(n_steps + 1):
        g = weather.irradiance_w_m2(t_s)
        t_amb_k = weather.ambient_temperature_k(t_s)

        pump_on = update_pump_state(
            pump_on=pump_on,
            t_tank_k=t_tank_k,
            t_amb_outdoor_k=t_amb_k,
            irradiance_w_m2=g,
            collector=config.collector,
            pump=config.pump,
            tank=config.tank,
            control=config.control,
        )

        times_s.append(t_s)
        tank_temperature_k.append(t_tank_k)
        ambient_temperature_k.append(t_amb_k)
        irradiance_w_m2.append(g)
        pump_on_series.append(pump_on)

        if step == n_steps:
            break

        m_dot_kg_s = config.pump.mass_flow_kg_s if pump_on else 0.0
        t_room_k = config.tank.room_temperature_k

        def rhs(local_t_s: float, local_t_tank_k: float) -> float:
            # Within a step, the pump state is constant; weather inputs can vary with time.
            local_g = weather.irradiance_w_m2(local_t_s)
            local_t_amb_k = weather.ambient_temperature_k(local_t_s)

            q_u_w = collector_useful_heat_w(
                t_in_k=local_t_tank_k,
                t_amb_outdoor_k=local_t_amb_k,
                irradiance_w_m2=local_g,
                collector=config.collector,
            )
            t_out_k = collector_outlet_k(
                t_in_k=local_t_tank_k,
                q_u_w=q_u_w,
                m_dot_kg_s=m_dot_kg_s,
                cp_j_kgk=config.tank.cp_j_kgk,
            )
            return tank_dTdt_k_s(
                t_tank_k=local_t_tank_k,
                t_out_k=t_out_k,
                t_room_k=t_room_k,
                m_dot_kg_s=m_dot_kg_s,
                tank=config.tank,
            )

        t_tank_k = rk4_step(t_s, t_tank_k, config.sim.dt_s, rhs)
        t_s += config.sim.dt_s

    return SimulationResult(
        times_s=times_s,
        tank_temperature_k=tank_temperature_k,
        ambient_temperature_k=ambient_temperature_k,
        irradiance_w_m2=irradiance_w_m2,
        pump_on=pump_on_series,
    )
