import { useState } from "react";
import type { SimulationConfig, ErrorComparisonResult } from "../types/simulation";
import { hoursToSeconds, secondsToHours } from "../types/simulation";
import { runComparison } from "../api/simulation";
import { SystemDiagram } from "./SystemDiagram";
import { ErrorChart } from "./ErrorChart";

interface ErrorEstimationTabProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
}

export function ErrorEstimationTab({ config, onConfigChange }: ErrorEstimationTabProps) {
  const [result, setResult] = useState<ErrorComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for time step and duration (hours)
  const [timeStep, setTimeStep] = useState(config.simulation.dt_s);
  const [durationHours, setDurationHours] = useState(secondsToHours(config.simulation.duration_s));

  const handleRunComparison = async () => {
    setIsLoading(true);
    setError(null);

    // Update config with local values
    const updatedConfig: SimulationConfig = {
      ...config,
      simulation: {
        ...config.simulation,
        dt_s: timeStep,
        duration_s: hoursToSeconds(durationHours),
      },
    };

    // Propagate config change to parent
    onConfigChange(updatedConfig);

    try {
      const comparisonResult = await runComparison(updatedConfig);
      setResult(comparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Parameters Panel - Left Side */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Analysis Parameters
          </h2>

          <p className="text-sm text-gray-600 mb-6">
            Compare Euler (1st order) vs RK4 (4th order) numerical integration.
            All other parameters are taken from the Simulation tab.
          </p>

          <div className="space-y-4 mb-6">
            <label className="block text-sm">
              <span className="text-gray-700">
                Time Step <span className="text-gray-400 ml-1">[s]</span>
              </span>
              <input
                type="number"
                value={timeStep}
                onChange={(e) => setTimeStep(parseFloat(e.target.value) || 1)}
                min={1}
                max={1000}
                step={1}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Larger time steps = more numerical error (faster)
              </p>
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">
                Simulation Length <span className="text-gray-400 ml-1">[h]</span>
              </span>
              <input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                min={1}
                max={168}
                step={1}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Longer simulations = more error accumulation
              </p>
            </label>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleRunComparison}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Running Comparison..." : "Run Comparison"}
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">About the methods</h4>
            <div className="text-xs text-blue-700 space-y-2">
              <p>
                <strong>Euler (Forward)</strong>: Simple 1st-order method. Fast but accumulates
                error proportional to step size.
              </p>
              <p>
                <strong>RK4 (Runge-Kutta)</strong>: Classic 4th-order method. More computations
                per step but much higher accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Panel - Right Side */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <SystemDiagram />
        <ErrorChart result={result} />
      </div>
    </div>
  );
}
