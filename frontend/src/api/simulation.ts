/**
 * API client for the solar thermal simulation backend.
 */

import type {
  SimulationConfig,
  SimulationResult,
  SolverName,
  ErrorComparisonResult,
  ErrorStatistics,
} from "../types/simulation";
import { MAX_SIMULATION_DURATION_DAYS, MAX_SIMULATION_DURATION_HOURS } from "../types/simulation";

// Use environment variable for production, fallback to localhost for development.
// In production, set VITE_API_URL to your backend URL (e.g., "https://api.example.com")
// or leave empty to use relative URLs (same origin).
const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8011" : "");

type FastApiValidationIssue = {
  loc?: unknown;
  msg?: unknown;
};

function _format_validation_error(detail: unknown): string {
  if (!Array.isArray(detail) || detail.length === 0) return "Request validation failed";

  const messages: string[] = [];
  for (const rawIssue of detail) {
    const issue = rawIssue as FastApiValidationIssue;
    const msg = typeof issue.msg === "string" ? issue.msg : "Invalid value";

    const locParts = Array.isArray(issue.loc)
      ? issue.loc
          .filter((p) => typeof p === "string" || typeof p === "number")
          .map(String)
          .filter((p) => p !== "body" && p !== "query" && p !== "path")
      : [];

    const loc = locParts.join(".");
    if (loc.endsWith("simulation.duration_s")) {
      messages.push(
        `Simulation duration is limited to ${MAX_SIMULATION_DURATION_DAYS} days (${MAX_SIMULATION_DURATION_HOURS} h).`
      );
      continue;
    }

    messages.push(loc ? `${loc}: ${msg}` : msg);
  }

  return messages.join(" ");
}

function _format_api_error(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return _format_validation_error(detail);
  if (detail && typeof detail === "object" && "detail" in detail) {
    const nested = (detail as { detail?: unknown }).detail;
    if (typeof nested === "string") return nested;
    if (Array.isArray(nested)) return _format_validation_error(nested);
  }
  return `Request failed (HTTP ${status})`;
}

export async function runSimulation(
  config: SimulationConfig,
  solver: SolverName = "rk4"
): Promise<SimulationResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...config, solver }),
    });
  } catch {
    // Network errors (e.g., backend not running)
    const serverInfo = API_BASE_URL || "the server";
    throw new Error(
      `Cannot connect to simulation server (${serverInfo}). ` +
      `Make sure the backend is running.`
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(_format_api_error((errorBody as { detail?: unknown }).detail, response.status));
  }

  const result = await response.json();

  // Validate the response has the expected shape
  if (!result || typeof result !== "object") {
    throw new Error("Invalid response from server: expected JSON object");
  }

  const requiredFields = ["times_s", "tank_temperature_k", "ambient_temperature_k", "irradiance_w_m2", "pump_on"];
  for (const field of requiredFields) {
    if (!Array.isArray(result[field])) {
      throw new Error(`Invalid response from server: missing or invalid '${field}' array`);
    }
  }

  return result as SimulationResult;
}

/**
 * Run both Euler and RK4 simulations and compute error metrics.
 */
export async function runComparison(
  config: SimulationConfig
): Promise<ErrorComparisonResult> {
  // Run both simulations in parallel
  const [rk4Result, eulerResult] = await Promise.all([
    runSimulation(config, "rk4"),
    runSimulation(config, "euler"),
  ]);

  // Compute point-by-point temperature errors
  const temperatureError = rk4Result.tank_temperature_k.map(
    (rk4Temp, i) => eulerResult.tank_temperature_k[i] - rk4Temp
  );

  // Compute cumulative energy error
  // Energy = mass * cp * temperature
  // We assume same mass and cp, so energy error is proportional to temp error
  // E_error = m * cp * T_error (cumulative)
  const massKg = config.tank.mass_kg;
  const cpJKgK = config.tank.cp_j_kgk;

  const energyError: number[] = [];
  let cumulativeEnergy = 0;
  for (let i = 0; i < temperatureError.length; i++) {
    // Power difference = m * cp * dT/dt, but we integrate temp error directly
    // Cumulative energy difference at time t = m * cp * (T_euler(t) - T_rk4(t))
    // Actually, let's compute instantaneous energy rate error and integrate
    if (i === 0) {
      cumulativeEnergy = 0;
    } else {
      // Heat rate error = m * cp * (dT_euler/dt - dT_rk4/dt)
      // Approximate by integrating temperature error * m * cp over time
      // This gives thermal energy stored difference
      cumulativeEnergy += temperatureError[i] * massKg * cpJKgK;
    }
    energyError.push(cumulativeEnergy);
  }

  // Compute statistics
  const absErrors = temperatureError.map(Math.abs);
  const maxAbsTempError = Math.max(...absErrors);
  const meanTempError = temperatureError.reduce((a, b) => a + b, 0) / temperatureError.length;
  const rmsError = Math.sqrt(
    temperatureError.reduce((sum, e) => sum + e * e, 0) / temperatureError.length
  );
  const finalEnergyErrorKj = energyError[energyError.length - 1] / 1000;

  const stats: ErrorStatistics = {
    max_abs_temp_error_k: maxAbsTempError,
    rms_temp_error_k: rmsError,
    mean_temp_error_k: meanTempError,
    final_energy_error_kj: finalEnergyErrorKj,
  };

  return {
    times_s: rk4Result.times_s,
    temperature_error_k: temperatureError,
    energy_error_j: energyError,
    rk4_temperature_k: rk4Result.tank_temperature_k,
    euler_temperature_k: eulerResult.tank_temperature_k,
    stats,
  };
}
