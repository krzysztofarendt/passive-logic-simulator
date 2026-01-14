"""Thin runner for the `passive_logic_simulator` package.

This repository keeps `main.py` as a small entry point that delegates to the
package CLI. The actual simulation code lives under `src/passive_logic_simulator/`.
"""


def main() -> None:
    """Run the package CLI."""
    from passive_logic_simulator.cli import main as cli_main

    cli_main()


if __name__ == "__main__":
    main()
