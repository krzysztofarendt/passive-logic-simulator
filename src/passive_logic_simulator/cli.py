from __future__ import annotations

"""Command-line interface for running the simulation and exporting results."""

import argparse
import csv
from pathlib import Path

from passive_logic_simulator.config import load_config
from passive_logic_simulator.simulation import run_simulation


def _write_results_csv(
    output_path: Path,
    *,
    times_s: list[float],
    tank_temperature_k: list[float],
    ambient_temperature_k: list[float],
    irradiance_w_m2: list[float],
    pump_on: list[bool],
) -> None:
    """Write simulation outputs to a CSV file suitable for plotting."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "time_s",
                "tank_temperature_k",
                "ambient_temperature_k",
                "irradiance_w_m2",
                "pump_on",
            ],
        )
        writer.writeheader()
        for t_s, t_tank_k, t_amb_k, g, on in zip(
            times_s,
            tank_temperature_k,
            ambient_temperature_k,
            irradiance_w_m2,
            pump_on,
            strict=True,
        ):
            writer.writerow(
                {
                    "time_s": t_s,
                    "tank_temperature_k": t_tank_k,
                    "ambient_temperature_k": t_amb_k,
                    "irradiance_w_m2": g,
                    "pump_on": int(on),
                }
            )


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser."""
    parser = argparse.ArgumentParser(prog="passive-logic-simulator")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("resources/default_config.toml"),
        help="Path to TOML config.",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=Path("out/simulation.csv"),
        help="Write results to CSV.",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    """Run a configured simulation and write results to CSV."""
    parser = build_parser()
    args = parser.parse_args(argv)

    config = load_config(args.config)
    result = run_simulation(config)

    _write_results_csv(
        args.output_csv,
        times_s=result.times_s,
        tank_temperature_k=result.tank_temperature_k,
        ambient_temperature_k=result.ambient_temperature_k,
        irradiance_w_m2=result.irradiance_w_m2,
        pump_on=result.pump_on,
    )

    print(f"Wrote {args.output_csv}")
    print(f"Final tank temperature: {result.tank_temperature_k[-1]:.2f} K")
