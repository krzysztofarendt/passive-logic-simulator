/**
 * TypeScript types for the solar thermal simulation.
 * These mirror the Python dataclasses used by the backend.
 */

/** Solver type for numerical integration */
export type SolverName = "rk4" | "euler";

/** Tab identifiers */
export type TabId = "simulation" | "error-estimation" | "documentation";

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

/** Convert Kelvin to Fahrenheit */
export function kelvinToFahrenheit(k: number): number {
  return (k - 273.15) * 9 / 5 + 32;
}

/** Convert seconds to hours */
export function secondsToHours(s: number): number {
  return s / 3600;
}

/** Convert hours to seconds */
export function hoursToSeconds(h: number): number {
  return h * 3600;
}

/** Error comparison result from Euler vs RK4 */
export interface ErrorComparisonResult {
  times_s: number[];
  temperature_error_k: number[];  // T_euler - T_rk4 at each time
  energy_error_j: number[];       // Cumulative energy deviation
  rk4_temperature_k: number[];
  euler_temperature_k: number[];
  stats: ErrorStatistics;
}

export interface ErrorStatistics {
  max_abs_temp_error_k: number;
  rms_temp_error_k: number;
  mean_temp_error_k: number;
  final_energy_error_kj: number;
}

/** Parameter help text for tooltips */
export const PARAMETER_HELP: Record<string, string> = {
  // Collector
  "collector.area_m2": "Solar collector surface area exposed to sunlight",
  "collector.heat_removal_factor": "Efficiency of heat transfer from absorber to fluid (F_R). Typical range: 0.7-0.95",
  "collector.optical_efficiency": "Fraction of solar radiation absorbed (η₀). Accounts for glass transmittance and absorber absorptance",
  "collector.loss_coefficient_w_m2k": "Heat loss rate per unit area per degree temperature difference (U_L)",

  // Tank
  "tank.mass_kg": "Mass of water in the storage tank",
  "tank.cp_j_kgk": "Specific heat capacity of water (4180 J/kg·K for water)",
  "tank.ua_w_k": "Overall heat loss coefficient of the tank to the room (insulation quality)",
  "tank.initial_temperature_k": "Starting temperature of the tank water",
  "tank.room_temperature_k": "Indoor temperature where the tank is located (for heat loss calculation)",

  // Pump
  "pump.mass_flow_kg_s": "Water flow rate through the collector loop when pump is running.\n\nIn this simplified model, higher flow mainly reduces the collector temperature lift:\nΔT ≈ Qᵤ / (ṁ · cₚ).\nSo higher flow can delay pump turn-on (needs higher irradiance to exceed ΔT_on) and shorten the on-window.\nTip: if the pump starts too late, lower flow or reduce ΔT_on/ΔT_off.",

  // Control - detailed explanations
  "control.enabled": "Enable/disable hysteresis pump control. When disabled, pump runs continuously during daylight.",
  "control.delta_t_on_k": "Pump turns ON when collector is this much hotter than tank (T_collector - T_tank > ΔT_on). Higher values delay turn-on. Note: higher mass flow reduces (T_collector - T_tank), which can also delay turn-on.",
  "control.delta_t_off_k": "Pump turns OFF when temperature difference drops below this threshold. Must be less than ΔT_on to create hysteresis band and prevent rapid cycling.",
  "control.min_irradiance_w_m2": "Minimum solar irradiance required for pump operation. Prevents pump from running during low-light conditions.",

  // Simulation
  "simulation.t0_s": "Simulation start time (seconds from midnight)",
  "simulation.dt_s": "Integration time step. Smaller values = more accurate but slower",
  "simulation.duration_s": "Total simulation duration",

  // Weather
  "weather.sunrise_s": "Time of sunrise (seconds from midnight). Default 21600 = 6:00 AM",
  "weather.sunset_s": "Time of sunset (seconds from midnight). Default 64800 = 6:00 PM",
  "weather.peak_irradiance_w_m2": "Maximum solar irradiance at solar noon",
  "weather.ambient_mean_k": "Average outdoor temperature over the day",
  "weather.ambient_amplitude_k": "Temperature swing from mean (±amplitude)",
  "weather.ambient_period_s": "Period of temperature oscillation (86400s = 24h)",
};
