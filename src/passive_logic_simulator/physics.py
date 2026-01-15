"""Physics/energy balance functions for the lumped-parameter model.

Conventions:
- Temperatures are in Kelvin (K).
- Heat rates are in Watts (W).
"""

from __future__ import annotations

from passive_logic_simulator.params import CollectorParams, TankParams


def clamp_min(value: float, minimum: float) -> float:
    """Clamp `value` so it is never less than `minimum`."""
    return value if value >= minimum else minimum


def collector_useful_heat_w(
    *,
    t_in_k: float,
    t_amb_outdoor_k: float,
    irradiance_w_m2: float,
    collector: CollectorParams,
) -> float:
    """Compute useful collector heat `Q_u` (clamped so the collector never cools the tank)."""
    # Hottel–Whillier-style form (see README for the governing equation).
    q_u = collector.area_m2 * collector.heat_removal_factor * (
        collector.optical_efficiency * irradiance_w_m2
        - collector.loss_coefficient_w_m2k * (t_in_k - t_amb_outdoor_k)
    )
    return clamp_min(q_u, 0.0)


def collector_outlet_k(*, t_in_k: float, q_u_w: float, m_dot_kg_s: float, cp_j_kgk: float) -> float:
    """Compute collector outlet temperature given inlet temperature and useful heat."""
    if m_dot_kg_s <= 0.0:
        return t_in_k
    # Energy balance on the circulating fluid: Q = m_dot * c_p * (T_out - T_in).
    return t_in_k + q_u_w / (m_dot_kg_s * cp_j_kgk)


def tank_dTdt_k_s(
    *,
    t_tank_k: float,
    t_out_k: float,
    t_room_k: float,
    m_dot_kg_s: float,
    tank: TankParams,
) -> float:
    """Compute tank temperature derivative using a well-mixed (0D) energy balance."""
    # Mixing adds/removes heat via the loop; losses go to the (constant) room temperature.
    mixing_term = (m_dot_kg_s / tank.mass_kg) * (t_out_k - t_tank_k)
    loss_term = (tank.ua_w_k / (tank.mass_kg * tank.cp_j_kgk)) * (t_tank_k - t_room_k)
    return mixing_term - loss_term
