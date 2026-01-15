"""Command-line interface for running the simulation and exporting results."""

from __future__ import annotations

import csv
import os
import signal
import subprocess
import sys
from pathlib import Path
from typing import Annotated, Literal, Optional

import typer

from passive_logic_simulator.config import load_config
from passive_logic_simulator.simulation import run_simulation

app = typer.Typer(
    name="passive-logic-simulator",
    help="Solar thermal simulation: collector + pump + storage tank",
)


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
    n = len(times_s)
    lengths = {
        "tank_temperature_k": len(tank_temperature_k),
        "ambient_temperature_k": len(ambient_temperature_k),
        "irradiance_w_m2": len(irradiance_w_m2),
        "pump_on": len(pump_on),
    }
    if any(length != n for length in lengths.values()):
        raise ValueError(f"Result series length mismatch: times_s={n}, {lengths}")

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


@app.command()
def run(
    config: Annotated[
        Path,
        typer.Option("--config", "-c", help="Path to TOML config file"),
    ] = Path("resources/default_config.toml"),
    solver: Annotated[
        Literal["rk4", "euler"],
        typer.Option("--solver", help="Numerical solver for the tank ODE: rk4 or euler"),
    ] = "rk4",
    output_csv: Annotated[
        Path,
        typer.Option("--output-csv", "-o", help="Write results to CSV file"),
    ] = Path("out/simulation.csv"),
) -> None:
    """Run a simulation with the given config and write results to CSV."""
    sim_config = load_config(config)
    result = run_simulation(sim_config, solver=solver)

    _write_results_csv(
        output_csv,
        times_s=result.times_s,
        tank_temperature_k=result.tank_temperature_k,
        ambient_temperature_k=result.ambient_temperature_k,
        irradiance_w_m2=result.irradiance_w_m2,
        pump_on=result.pump_on,
    )

    typer.echo(f"Wrote {output_csv}")
    typer.echo(f"Final tank temperature: {result.tank_temperature_k[-1]:.2f} K")

def _run_webapp(
    backend_port: Annotated[
        int,
        typer.Option("--backend-port", "-b", help="Port for the FastAPI backend"),
    ] = 8000,
    frontend_port: Annotated[
        int,
        typer.Option("--frontend-port", "-f", help="Port for the Vite frontend"),
    ] = 5173,
) -> None:
    """Start the backend API server and frontend development server."""
    # Find the project root (where frontend/ directory is)
    # cli.py is at src/passive_logic_simulator/cli.py, so go up 3 levels
    project_root = Path(__file__).parent.parent.parent
    frontend_dir = project_root / "frontend"

    if not frontend_dir.exists():
        typer.echo(f"Error: frontend directory not found at {frontend_dir}", err=True)
        raise typer.Exit(1)

    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        typer.echo("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)

    typer.echo(f"Starting backend on http://localhost:{backend_port}")
    typer.echo(f"Starting frontend on http://localhost:{frontend_port}")
    typer.echo("Press Ctrl+C to stop both servers.\n")

    processes: list[subprocess.Popen[bytes]] = []

    def cleanup(signum: Optional[int] = None, frame: Optional[object] = None) -> None:
        """Terminate all child processes."""
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        if signum is not None:
            sys.exit(0)

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        # Start backend (uvicorn)
        backend_proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "passive_logic_simulator.api:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(backend_port),
                "--reload",
            ],
            cwd=project_root,
        )
        processes.append(backend_proc)

        # Start frontend (npm run dev)
        frontend_env = os.environ.copy()
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev", "--", "--port", str(frontend_port)],
            cwd=frontend_dir,
            env=frontend_env,
        )
        processes.append(frontend_proc)

        # Wait for either process to exit
        while True:
            for proc in processes:
                retcode = proc.poll()
                if retcode is not None:
                    typer.echo(f"Process exited with code {retcode}")
                    cleanup()
                    raise typer.Exit(retcode if retcode else 0)
            # Small sleep to avoid busy-waiting
            import time

            time.sleep(0.5)

    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        cleanup()
        raise typer.Exit(1)


@app.command()
def demo(
    backend_port: Annotated[
        int,
        typer.Option("--backend-port", "-b", help="Port for the FastAPI backend"),
    ] = 8000,
    frontend_port: Annotated[
        int,
        typer.Option("--frontend-port", "-f", help="Port for the Vite frontend"),
    ] = 5173,
) -> None:
    """Start the demo webapp (backend + frontend)."""
    _run_webapp(backend_port=backend_port, frontend_port=frontend_port)


def main(argv: list[str] | None = None) -> None:
    """Entry point for the CLI."""
    if argv is not None:
        # For testing: override sys.argv
        import sys

        original_argv = sys.argv
        sys.argv = ["passive-logic-simulator"] + argv
        try:
            app()
        finally:
            sys.argv = original_argv
    else:
        app()
