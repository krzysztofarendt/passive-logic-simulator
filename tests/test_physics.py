import math

from passive_logic_simulator.params import CollectorParams, TankParams
from passive_logic_simulator.physics import (
    clamp_min,
    collector_outlet_k,
    collector_useful_heat_w,
    tank_dTdt_k_s,
)


def test_clamp_min() -> None:
    assert clamp_min(2.0, 3.0) == 3.0
    assert clamp_min(3.0, 3.0) == 3.0
    assert clamp_min(4.0, 3.0) == 4.0


def test_collector_useful_heat_clamps_to_non_negative() -> None:
    collector = CollectorParams(
        area_m2=1.0,
        heat_removal_factor=1.0,
        optical_efficiency=0.0,
        loss_coefficient_w_m2k=1.0,
    )
    # With eta0=0, useful heat would be negative when T_in > T_amb.
    q_u = collector_useful_heat_w(t_in_k=310.0, t_amb_outdoor_k=300.0, irradiance_w_m2=0.0, collector=collector)
    assert q_u == 0.0


def test_collector_outlet_handles_no_flow() -> None:
    assert collector_outlet_k(t_in_k=300.0, q_u_w=100.0, m_dot_kg_s=0.0, cp_j_kgk=4180.0) == 300.0


def test_collector_outlet_energy_balance() -> None:
    t_out = collector_outlet_k(t_in_k=300.0, q_u_w=4180.0, m_dot_kg_s=1.0, cp_j_kgk=4180.0)
    assert math.isclose(t_out, 301.0)


def test_tank_dTdt_signs() -> None:
    tank = TankParams(
        mass_kg=100.0,
        cp_j_kgk=1000.0,
        ua_w_k=10.0,
        initial_temperature_k=300.0,
        room_temperature_k=295.0,
    )

    # If the loop returns warmer than the tank, mixing increases temperature.
    d1 = tank_dTdt_k_s(t_tank_k=300.0, t_out_k=310.0, t_room_k=295.0, m_dot_kg_s=1.0, tank=tank)
    assert d1 > 0.0

    # If the room is cooler than the tank, losses decrease temperature.
    d2 = tank_dTdt_k_s(t_tank_k=300.0, t_out_k=300.0, t_room_k=295.0, m_dot_kg_s=0.0, tank=tank)
    assert d2 < 0.0
