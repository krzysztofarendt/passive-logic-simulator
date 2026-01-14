/**
 * API client for the solar thermal simulation backend.
 */

import type { SimulationConfig, SimulationResult } from "../types/simulation";

const API_BASE_URL = "http://localhost:8000";

export async function runSimulation(
  config: SimulationConfig
): Promise<SimulationResult> {
  const response = await fetch(`${API_BASE_URL}/api/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
