import textwrap

import pytest

from passive_logic_simulator.config import load_config
from passive_logic_simulator.simulation import run_simulation


def test_load_config_rejects_invalid_weather_extrapolation(tmp_path) -> None:
    toml_path = tmp_path / "config.toml"
    toml_path.write_text(
        textwrap.dedent(
            """
            [tank]
            room_temperature_k = 293.15

            [weather]
            kind = "csv"
            csv_path = "weather.csv"
            extrapolation = "nope"
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="weather.extrapolation"):
        load_config(toml_path)


def test_run_simulation_constant_inputs_matches_linear_solution(tmp_path) -> None:
    # Create constant weather so collector heat is constant.
    weather_csv = tmp_path / "weather.csv"
    weather_csv.write_text(
        "time_s,irradiance_w_m2,ambient_k\n0,100,300\n100,100,300\n",
        encoding="utf-8",
    )

    # Make the physics exact and easy:
    # - UL=0 => Q_u = A*FR*eta0*G = 100 W
    # - Pump forced on (control.enabled=false)
    # - Tank losses UA=0
    # Then dT/dt = Q_u / (m_tank * c_p) is constant and RK4 is exact for this case.
    config_toml = tmp_path / "config.toml"
    config_toml.write_text(
        textwrap.dedent(
            f"""
            [collector]
            area_m2 = 1.0
            heat_removal_factor = 1.0
            optical_efficiency = 1.0
            loss_coefficient_w_m2k = 0.0

            [tank]
            mass_kg = 10.0
            cp_j_kgk = 10.0
            ua_w_k = 0.0
            initial_temperature_k = 300.0
            room_temperature_k = 300.0

            [pump]
            mass_flow_kg_s = 1.0

            [control]
            enabled = false

            [simulation]
            t0_s = 0.0
            dt_s = 1.0
            duration_s = 10.0

            [weather]
            kind = "csv"
            csv_path = "{weather_csv.as_posix()}"
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )

    config = load_config(config_toml)
    result = run_simulation(config)

    assert len(result.times_s) == 11
    assert result.times_s[0] == 0.0
    assert result.times_s[-1] == 10.0
    assert all(result.pump_on)

    q_u_w = 100.0
    expected_final = 300.0 + (q_u_w / (config.tank.mass_kg * config.tank.cp_j_kgk)) * 10.0
    assert result.tank_temperature_k[-1] == pytest.approx(expected_final, abs=0.0)


def test_run_simulation_requires_duration_multiple_of_dt(tmp_path) -> None:
    config_toml = tmp_path / "config.toml"
    config_toml.write_text(
        textwrap.dedent(
            """
            [simulation]
            dt_s = 0.3
            duration_s = 1.0
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )
    config = load_config(config_toml)
    with pytest.raises(ValueError, match="duration_s must be an integer multiple"):
        run_simulation(config)
