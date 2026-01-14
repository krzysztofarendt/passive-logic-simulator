"""Solar collector + pump + tank simulation package.

Public API:
- `load_config(...)` loads a TOML configuration into a `SimulationConfig`.
- `run_simulation(...)` runs the transient model and returns a `SimulationResult`.
"""

from passive_logic_simulator.config import SimulationConfig, load_config
from passive_logic_simulator.simulation import SimulationResult, run_simulation

__all__ = [
    "SimulationConfig",
    "SimulationResult",
    "load_config",
    "run_simulation",
]
