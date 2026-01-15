import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ErrorComparisonResult } from "../types/simulation";
import { secondsToHours } from "../types/simulation";

interface ErrorChartProps {
  result: ErrorComparisonResult | null;
}

const MAX_POINTS = 500;

function downsample<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export function ErrorChart({ result }: ErrorChartProps) {
  const chartData = useMemo(() => {
    if (!result) return [];

    const data = result.times_s.map((t, i) => ({
      time_h: secondsToHours(t),
      temp_error_k: result.temperature_error_k[i],
      energy_error_kj: result.energy_error_j[i] / 1000,
      rk4_temp_k: result.rk4_temperature_k[i],
      euler_temp_k: result.euler_temperature_k[i],
    }));

    return downsample(data, MAX_POINTS);
  }, [result]);

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-[450px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-lg font-medium">No comparison data</p>
          <p className="text-sm mt-1">
            Run comparison to see Euler vs RK4 differences
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Numerical Discrepancy (Euler vs RK4)
      </h3>

      {/* Temperature Error Chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Temperature Difference (T_euler - T_rk4)
        </h4>
        <div className="flex items-center">
          <div className="flex-shrink-0 w-16 text-xs text-gray-600 text-center">
            Difference (K)
          </div>
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time_h"
                  label={{ value: "Time (h)", position: "insideBottomRight", offset: -5 }}
                  tickFormatter={(v) => v.toFixed(0)}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(v) => v.toFixed(3)}
                />
                <Tooltip
                  formatter={(value) => [typeof value === "number" ? value.toFixed(4) + " K" : "-", "Temp Difference"]}
                  labelFormatter={(label) => `Time: ${Number(label).toFixed(2)} h`}
                />
                <Line
                  type="monotone"
                  dataKey="temp_error_k"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="Temperature Difference"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Energy Error Chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Cumulative Energy Difference (E_euler - E_rk4)
        </h4>
        <div className="flex items-center">
          <div className="flex-shrink-0 w-16 text-xs text-gray-600 text-center">
            Difference (kJ)
          </div>
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time_h"
                  label={{ value: "Time (h)", position: "insideBottomRight", offset: -5 }}
                  tickFormatter={(v) => v.toFixed(0)}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={(v) => v.toFixed(0)}
                />
                <Tooltip
                  formatter={(value) => [typeof value === "number" ? value.toFixed(2) + " kJ" : "-", "Energy Difference"]}
                  labelFormatter={(label) => `Time: ${Number(label).toFixed(2)} h`}
                />
                <Line
                  type="monotone"
                  dataKey="energy_error_kj"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  name="Energy Difference"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Summary Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Max Abs Difference"
            value={result.stats.max_abs_temp_error_k.toFixed(4)}
            unit="K"
          />
          <StatCard
            label="RMS Difference"
            value={result.stats.rms_temp_error_k.toFixed(4)}
            unit="K"
          />
          <StatCard
            label="Mean Difference"
            value={result.stats.mean_temp_error_k.toFixed(4)}
            unit="K"
          />
          <StatCard
            label="Final Energy Difference"
            value={result.stats.final_energy_error_kj.toFixed(2)}
            unit="kJ"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
      </div>
    </div>
  );
}
