/**
 * API client for the solar thermal simulation backend.
 */

import type { SimulationConfig, SimulationResult } from "../types/simulation";

const API_BASE_URL = "http://localhost:8000";

export async function runSimulation(
  config: SimulationConfig
): Promise<SimulationResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
  } catch (err) {
    // Network errors (e.g., backend not running)
    throw new Error(
      `Cannot connect to simulation server at ${API_BASE_URL}. ` +
      `Make sure the backend is running with: uv run passive-logic-simulator demo`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
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
