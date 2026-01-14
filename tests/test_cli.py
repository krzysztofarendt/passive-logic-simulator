import csv
import textwrap
from pathlib import Path

from passive_logic_simulator.cli import _write_results_csv, build_parser, main


def test_write_results_csv(tmp_path) -> None:
    out_path = tmp_path / "out.csv"
    _write_results_csv(
        out_path,
        times_s=[0.0, 1.0],
        tank_temperature_k=[300.0, 301.0],
        ambient_temperature_k=[290.0, 290.0],
        irradiance_w_m2=[0.0, 100.0],
        pump_on=[False, True],
    )

    with out_path.open(newline="") as f:
        rows = list(csv.DictReader(f))

    assert rows[0]["time_s"] == "0.0"
    assert rows[1]["tank_temperature_k"] == "301.0"
    assert rows[1]["pump_on"] == "1"


def test_build_parser_has_expected_args() -> None:
    parser = build_parser()
    args = parser.parse_args([])
    assert isinstance(args.config, Path)
    assert isinstance(args.output_csv, Path)


def test_cli_main_writes_csv(tmp_path, capsys) -> None:
    config_path = tmp_path / "config.toml"
    output_csv = tmp_path / "simulation.csv"
    config_path.write_text(
        textwrap.dedent(
            """
            [simulation]
            dt_s = 1.0
            duration_s = 2.0

            [weather]
            kind = "synthetic"
            sunrise_s = 0.0
            sunset_s = 100.0
            peak_irradiance_w_m2 = 0.0
            ambient_mean_k = 293.15
            ambient_amplitude_k = 0.0
            ambient_period_s = 86400.0
            """
        ).strip()
        + "\n",
        encoding="utf-8",
    )

    main(["--config", str(config_path), "--output-csv", str(output_csv)])
    captured = capsys.readouterr().out
    assert "Wrote" in captured
    assert output_csv.exists()
