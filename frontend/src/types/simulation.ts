/**
 * TypeScript types for the solar thermal simulation.
 * These mirror the Python dataclasses used by the backend.
 */

export interface CollectorParams {
  area_m2: number;
  heat_removal_factor: number;
  optical_efficiency: number;
  loss_coefficient_w_m2k: number;
}

export interface TankParams {
  mass_kg: number;
  cp_j_kgk: number;
  ua_w_k: number;
  initial_temperature_k: number;
  room_temperature_k: number;
}

export interface PumpParams {
  mass_flow_kg_s: number;
}

export interface ControlParams {
  enabled: boolean;
  delta_t_on_k: number;
  delta_t_off_k: number;
  min_irradiance_w_m2: number;
}

export interface SimulationParams {
  t0_s: number;
  dt_s: number;
  duration_s: number;
}

export interface SyntheticWeatherParams {
  kind: "synthetic";
  sunrise_s: number;
  sunset_s: number;
  peak_irradiance_w_m2: number;
  ambient_mean_k: number;
  ambient_amplitude_k: number;
  ambient_period_s: number;
}

export interface SimulationConfig {
  collector: CollectorParams;
  tank: TankParams;
  pump: PumpParams;
  control: ControlParams;
  simulation: SimulationParams;
  weather: SyntheticWeatherParams;
}

export interface SimulationResult {
  times_s: number[];
  tank_temperature_k: number[];
  ambient_temperature_k: number[];
  irradiance_w_m2: number[];
  pump_on: boolean[];
}

/** Default configuration values matching default_config.toml */
export const DEFAULT_CONFIG: SimulationConfig = {
  collector: {
    area_m2: 2.0,
    heat_removal_factor: 0.9,
    optical_efficiency: 0.75,
    loss_coefficient_w_m2k: 5.0,
  },
  tank: {
    mass_kg: 200.0,
    cp_j_kgk: 4180.0,
    ua_w_k: 3.0,
    initial_temperature_k: 293.15,
    room_temperature_k: 293.15,
  },
  pump: {
    mass_flow_kg_s: 0.05,
  },
  control: {
    enabled: true,
    delta_t_on_k: 2.0,
    delta_t_off_k: 1.0,
    min_irradiance_w_m2: 25.0,
  },
  simulation: {
    t0_s: 0.0,
    dt_s: 10.0,
    duration_s: 86400.0,
  },
  weather: {
    kind: "synthetic",
    sunrise_s: 21600.0,
    sunset_s: 64800.0,
    peak_irradiance_w_m2: 850.0,
    ambient_mean_k: 293.15,
    ambient_amplitude_k: 6.0,
    ambient_period_s: 86400.0,
  },
};

/** Convert Kelvin to Celsius */
export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

/** Convert Celsius to Kelvin */
export function celsiusToKelvin(c: number): number {
  return c + 273.15;
}

/** Convert seconds to hours */
export function secondsToHours(s: number): number {
  return s / 3600;
}
