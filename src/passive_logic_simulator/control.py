"""Pump control logic (hysteresis / deadband).

The pump state is updated once per simulation step (and held constant within
that step, including RK4 sub-stages). This matches the project convention in
`AGENTS.md` and keeps the discrete control logic separated from the continuous
tank ODE integration.
"""

from __future__ import annotations

from passive_logic_simulator.params import CollectorParams, ControlParams, PumpParams, TankParams
from passive_logic_simulator.physics import collector_outlet_k, collector_useful_heat_w


def update_pump_state(
    *,
    pump_on: bool,
    t_tank_k: float,
    t_amb_outdoor_k: float,
    irradiance_w_m2: float,
    collector: CollectorParams,
    pump: PumpParams,
    tank: TankParams,
    control: ControlParams,
) -> bool:
    """Update pump state using a hysteresis controller.

    The controller:
    - Requires minimum irradiance before the pump can run.
    - Computes a nominal collector outlet temperature assuming the pump is on.
    - Uses ON/OFF deadband thresholds to avoid rapid switching.

    Notes:
        If `control.enabled` is `False`, the controller is bypassed and the pump
        is forced on. This is useful for deterministic tests and "always-on"
        scenarios.
    """
    if not control.enabled:
        return True

    if irradiance_w_m2 < control.min_irradiance_w_m2:
        return False

    # Nominal collector output assumes circulation at the design mass flow rate.
    q_u_nom_w = collector_useful_heat_w(
        t_in_k=t_tank_k,
        t_amb_outdoor_k=t_amb_outdoor_k,
        irradiance_w_m2=irradiance_w_m2,
        collector=collector,
    )
    t_out_nom_k = collector_outlet_k(
        t_in_k=t_tank_k,
        q_u_w=q_u_nom_w,
        m_dot_kg_s=pump.mass_flow_kg_s,
        cp_j_kgk=tank.cp_j_kgk,
    )

    if pump_on:
        # When already on, use the OFF threshold (smaller temperature lift required to stay on).
        return t_out_nom_k > t_tank_k + control.delta_t_off_k
    # When off, require a larger temperature lift to turn on.
    return t_out_nom_k > t_tank_k + control.delta_t_on_k
