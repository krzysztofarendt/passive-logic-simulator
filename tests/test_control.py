from passive_logic_simulator.control import update_pump_state
from passive_logic_simulator.params import CollectorParams, ControlParams, PumpParams, TankParams


def _simple_params() -> tuple[CollectorParams, PumpParams, TankParams]:
    # Choose parameters that make the algebra easy:
    # Q_u = G (UL=0, A=FR=eta0=1), T_out = T_in + G (m_dot=cp=1).
    collector = CollectorParams(
        area_m2=1.0,
        heat_removal_factor=1.0,
        optical_efficiency=1.0,
        loss_coefficient_w_m2k=0.0,
    )
    pump = PumpParams(mass_flow_kg_s=1.0)
    tank = TankParams(
        mass_kg=100.0,
        cp_j_kgk=1.0,
        ua_w_k=0.0,
        initial_temperature_k=300.0,
        room_temperature_k=300.0,
    )
    return collector, pump, tank


def test_control_disabled_means_pump_forced_on() -> None:
    collector, pump, tank = _simple_params()
    control = ControlParams(enabled=False)
    assert (
        update_pump_state(
            pump_on=False,
            t_tank_k=300.0,
            t_amb_outdoor_k=300.0,
            irradiance_w_m2=0.0,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )
        is True
    )


def test_min_irradiance_forces_off() -> None:
    collector, pump, tank = _simple_params()
    control = ControlParams(enabled=True, min_irradiance_w_m2=10.0)
    assert (
        update_pump_state(
            pump_on=True,
            t_tank_k=300.0,
            t_amb_outdoor_k=300.0,
            irradiance_w_m2=0.0,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )
        is False
    )


def test_hysteresis_on_and_off_thresholds() -> None:
    collector, pump, tank = _simple_params()
    control = ControlParams(enabled=True, delta_t_on_k=2.0, delta_t_off_k=1.0, min_irradiance_w_m2=0.0)

    # With irradiance=1, T_out = 301, so should stay off because 301 is not > 302.
    assert (
        update_pump_state(
            pump_on=False,
            t_tank_k=300.0,
            t_amb_outdoor_k=300.0,
            irradiance_w_m2=1.0,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )
        is False
    )

    # With irradiance=3, T_out = 303, so should turn on (303 > 302).
    assert (
        update_pump_state(
            pump_on=False,
            t_tank_k=300.0,
            t_amb_outdoor_k=300.0,
            irradiance_w_m2=3.0,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )
        is True
    )

    # When already on, use the smaller OFF threshold: with irradiance=2, T_out=302 => 302 > 301, stays on.
    assert (
        update_pump_state(
            pump_on=True,
            t_tank_k=300.0,
            t_amb_outdoor_k=300.0,
            irradiance_w_m2=2.0,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )
        is True
    )
