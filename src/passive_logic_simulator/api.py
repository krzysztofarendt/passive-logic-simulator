"""FastAPI server for running simulations via HTTP.

Run with:
    uv run uvicorn passive_logic_simulator.api:app --reload --port 8000
"""

from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from passive_logic_simulator.config import SimulationConfig
from passive_logic_simulator.params import (
    CollectorParams,
    ControlParams,
    PumpParams,
    SimulationParams,
    TankParams,
)
from passive_logic_simulator.simulation import run_simulation
from passive_logic_simulator.weather import SyntheticWeatherConfig

app = FastAPI(
    title="Solar Thermal Simulation API",
    description="API for running solar collector + pump + tank simulations",
    version="0.1.0",
)

# Allow CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class CollectorInput(BaseModel):
    area_m2: float = Field(default=2.0, gt=0, description="Collector area [m²]")
    heat_removal_factor: float = Field(default=0.9, ge=0, le=1, description="Heat removal factor F_R [-]")
    optical_efficiency: float = Field(default=0.75, ge=0, le=1, description="Optical efficiency eta0 [-]")
    loss_coefficient_w_m2k: float = Field(default=5.0, ge=0, description="Loss coefficient U_L [W/(m²·K)]")


class TankInput(BaseModel):
    mass_kg: float = Field(default=200.0, gt=0, description="Tank fluid mass [kg]")
    cp_j_kgk: float = Field(default=4180.0, gt=0, description="Specific heat capacity [J/(kg·K)]")
    ua_w_k: float = Field(default=3.0, ge=0, description="Tank heat loss coefficient [W/K]")
    initial_temperature_k: float = Field(default=293.15, ge=0, description="Initial tank temperature [K]")
    room_temperature_k: float = Field(default=293.15, ge=0, description="Room temperature for tank losses [K]")


class PumpInput(BaseModel):
    mass_flow_kg_s: float = Field(default=0.05, ge=0, description="Mass flow rate when pump is on [kg/s]")


class ControlInput(BaseModel):
    enabled: bool = Field(default=True, description="Enable hysteresis control")
    delta_t_on_k: float = Field(default=2.0, ge=0, description="Turn-on temperature threshold [K]")
    delta_t_off_k: float = Field(default=1.0, ge=0, description="Turn-off temperature threshold [K]")
    min_irradiance_w_m2: float = Field(default=25.0, ge=0, description="Minimum irradiance for pump operation [W/m²]")


class SimulationInput(BaseModel):
    t0_s: float = Field(default=0.0, description="Start time [s]")
    dt_s: float = Field(default=10.0, gt=0, description="Time step [s]")
    duration_s: float = Field(default=86400.0, ge=0, description="Simulation duration [s]")


class SyntheticWeatherInput(BaseModel):
    kind: Literal["synthetic"] = "synthetic"
    sunrise_s: float = Field(default=21600.0, ge=0, description="Sunrise time [s from midnight]")
    sunset_s: float = Field(default=64800.0, ge=0, description="Sunset time [s from midnight]")
    peak_irradiance_w_m2: float = Field(default=850.0, ge=0, description="Peak solar irradiance [W/m²]")
    ambient_mean_k: float = Field(default=293.15, ge=0, description="Mean ambient temperature [K]")
    ambient_amplitude_k: float = Field(default=6.0, ge=0, description="Ambient temperature amplitude [K]")
    ambient_period_s: float = Field(default=86400.0, gt=0, description="Ambient temperature period [s]")


class SimulationRequest(BaseModel):
    collector: CollectorInput = Field(default_factory=CollectorInput)
    tank: TankInput = Field(default_factory=TankInput)
    pump: PumpInput = Field(default_factory=PumpInput)
    control: ControlInput = Field(default_factory=ControlInput)
    simulation: SimulationInput = Field(default_factory=SimulationInput)
    weather: SyntheticWeatherInput = Field(default_factory=SyntheticWeatherInput)


class SimulationResponse(BaseModel):
    times_s: list[float]
    tank_temperature_k: list[float]
    ambient_temperature_k: list[float]
    irradiance_w_m2: list[float]
    pump_on: list[bool]


@app.get("/")
def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "message": "Solar Thermal Simulation API"}


@app.post("/api/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest) -> SimulationResponse:
    """Run a simulation with the provided parameters and return results."""
    try:
        # Convert Pydantic models to simulation dataclasses
        config = SimulationConfig(
            collector=CollectorParams(
                area_m2=request.collector.area_m2,
                heat_removal_factor=request.collector.heat_removal_factor,
                optical_efficiency=request.collector.optical_efficiency,
                loss_coefficient_w_m2k=request.collector.loss_coefficient_w_m2k,
            ),
            tank=TankParams(
                mass_kg=request.tank.mass_kg,
                cp_j_kgk=request.tank.cp_j_kgk,
                ua_w_k=request.tank.ua_w_k,
                initial_temperature_k=request.tank.initial_temperature_k,
                room_temperature_k=request.tank.room_temperature_k,
            ),
            pump=PumpParams(
                mass_flow_kg_s=request.pump.mass_flow_kg_s,
            ),
            control=ControlParams(
                enabled=request.control.enabled,
                delta_t_on_k=request.control.delta_t_on_k,
                delta_t_off_k=request.control.delta_t_off_k,
                min_irradiance_w_m2=request.control.min_irradiance_w_m2,
            ),
            sim=SimulationParams(
                t0_s=request.simulation.t0_s,
                dt_s=request.simulation.dt_s,
                duration_s=request.simulation.duration_s,
            ),
            weather=SyntheticWeatherConfig(
                sunrise_s=request.weather.sunrise_s,
                sunset_s=request.weather.sunset_s,
                peak_irradiance_w_m2=request.weather.peak_irradiance_w_m2,
                ambient_mean_k=request.weather.ambient_mean_k,
                ambient_amplitude_k=request.weather.ambient_amplitude_k,
                ambient_period_s=request.weather.ambient_period_s,
            ),
        )

        result = run_simulation(config)

        return SimulationResponse(
            times_s=result.times_s,
            tank_temperature_k=result.tank_temperature_k,
            ambient_temperature_k=result.ambient_temperature_k,
            irradiance_w_m2=result.irradiance_w_m2,
            pump_on=result.pump_on,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e!s}") from e
