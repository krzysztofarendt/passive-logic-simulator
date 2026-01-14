import pytest

from passive_logic_simulator.params import CollectorParams, ControlParams, PumpParams, SimulationParams, TankParams


def test_tank_params_validate_positive_mass_and_cp() -> None:
    with pytest.raises(ValueError, match="tank.mass_kg"):
        TankParams(
            mass_kg=0.0,
            cp_j_kgk=4180.0,
            ua_w_k=3.0,
            initial_temperature_k=293.15,
            room_temperature_k=293.15,
        )

    with pytest.raises(ValueError, match="tank.cp_j_kgk"):
        TankParams(
            mass_kg=200.0,
            cp_j_kgk=0.0,
            ua_w_k=3.0,
            initial_temperature_k=293.15,
            room_temperature_k=293.15,
        )


def test_collector_params_validate_unit_interval() -> None:
    with pytest.raises(ValueError, match="collector.optical_efficiency"):
        CollectorParams(
            area_m2=2.0,
            heat_removal_factor=0.9,
            optical_efficiency=1.1,
            loss_coefficient_w_m2k=5.0,
        )


def test_pump_params_validate_non_negative() -> None:
    with pytest.raises(ValueError, match="pump.mass_flow_kg_s"):
        PumpParams(mass_flow_kg_s=-0.01)


def test_control_params_validate_deadband_order() -> None:
    with pytest.raises(ValueError, match="control\\.delta_t_off_k must be <= control\\.delta_t_on_k"):
        ControlParams(delta_t_on_k=1.0, delta_t_off_k=2.0)


def test_simulation_params_validate_dt_and_duration() -> None:
    with pytest.raises(ValueError, match="simulation.dt_s"):
        SimulationParams(t0_s=0.0, dt_s=0.0, duration_s=10.0)

    with pytest.raises(ValueError, match="simulation.duration_s"):
        SimulationParams(t0_s=0.0, dt_s=1.0, duration_s=-1.0)
