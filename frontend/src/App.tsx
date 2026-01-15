import { useState } from "react";
import { ParameterForm } from "./components/ParameterForm";
import { SimulationChart } from "./components/SimulationChart";
import { TabNavigation } from "./components/TabNavigation";
import { SystemDiagram } from "./components/SystemDiagram";
import { ErrorEstimationTab } from "./components/ErrorEstimationTab";
import { runSimulation } from "./api/simulation";
import type { SimulationConfig, SimulationResult, TabId } from "./types/simulation";
import { DEFAULT_CONFIG } from "./types/simulation";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("simulation");
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const simulationResult = await runSimulation(config);
      setResult(simulationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Solar Thermal Simulation
              </h1>
              <p className="text-sm text-gray-500">
                Collector + Pump + Storage Tank
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === "simulation" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Parameter Form - Left Side */}
            <div className="lg:col-span-2">
              <ParameterForm
                config={config}
                onChange={setConfig}
                onSubmit={handleRunSimulation}
                isLoading={isLoading}
              />
            </div>

            {/* Chart Area - Right Side */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <SystemDiagram />
              <SimulationChart result={result} />
            </div>
          </div>
        ) : (
          <ErrorEstimationTab config={config} onConfigChange={setConfig} />
        )}
      </main>
    </div>
  );
}

export default App;
