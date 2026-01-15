import { useState, useMemo, memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { SimulationResult } from "../types/simulation";
import { kelvinToCelsius, secondsToHours } from "../types/simulation";

interface SimulationChartProps {
  result: SimulationResult | null;
}

type TemperatureUnit = "celsius" | "kelvin";

export const SimulationChart = memo(function SimulationChart({ result }: SimulationChartProps) {
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("celsius");
  const [showIrradiance, setShowIrradiance] = useState(true);
  const [showAmbient, setShowAmbient] = useState(true);
  const [showPumpRegions, setShowPumpRegions] = useState(true);

  const tempLabel = tempUnit === "celsius" ? "C" : "K";
  const convertTemp = (k: number) =>
    tempUnit === "celsius" ? kelvinToCelsius(k) : k;

  // Transform data for Recharts - memoized to avoid recomputing on every render
  // Returns empty array if result is null/invalid
  const chartData = useMemo(() => {
    if (!result?.times_s?.length) return [];
    const toTemp = (k: number) =>
      tempUnit === "celsius" ? kelvinToCelsius(k) : k;
    return result.times_s.map((t, i) => ({
      time_h: secondsToHours(t),
      tank_temp: toTemp(result.tank_temperature_k[i]),
      ambient_temp: toTemp(result.ambient_temperature_k[i]),
      irradiance: result.irradiance_w_m2[i],
      pump_on: result.pump_on[i],
    }));
  }, [result, tempUnit]);

  // Find pump-on regions for shading - memoized
  const pumpRegions = useMemo(() => {
    if (chartData.length === 0) return [];
    const regions: { start: number; end: number }[] = [];
    let regionStart: number | null = null;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].pump_on && regionStart === null) {
        regionStart = chartData[i].time_h;
      } else if (!chartData[i].pump_on && regionStart !== null) {
        regions.push({ start: regionStart, end: chartData[i].time_h });
        regionStart = null;
      }
    }
    if (regionStart !== null) {
      regions.push({
        start: regionStart,
        end: chartData[chartData.length - 1].time_h,
      });
    }
    return regions;
  }, [chartData]);

  // Calculate min/max for temperature axis - memoized
  const { tempMin, tempMax } = useMemo(() => {
    if (chartData.length === 0) return { tempMin: 0, tempMax: 100 };
    const allTemps = [
      ...chartData.map((d) => d.tank_temp),
      ...(showAmbient ? chartData.map((d) => d.ambient_temp) : []),
    ];
    return {
      tempMin: Math.floor(Math.min(...allTemps) - 2),
      tempMax: Math.ceil(Math.max(...allTemps) + 2),
    };
  }, [chartData, showAmbient]);

  // Max irradiance for secondary axis - memoized
  const maxIrradiance = useMemo(
    () => (result?.irradiance_w_m2?.length ? Math.max(...result.irradiance_w_m2) : 1000),
    [result]
  );

  // Now handle conditional rendering AFTER all hooks
  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Configure parameters and click "Run Simulation" to see results.
        </p>
      </div>
    );
  }

  // Defensive check: ensure result has valid data arrays
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <p className="text-red-500 text-center">
          Invalid simulation result: missing or empty data arrays.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Simulation Results</h2>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAmbient}
              onChange={(e) => setShowAmbient(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-600">Ambient</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showIrradiance}
              onChange={(e) => setShowIrradiance(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-600">Irradiance</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPumpRegions}
              onChange={(e) => setShowPumpRegions(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-600">Pump On</span>
          </label>
          <select
            value={tempUnit}
            onChange={(e) => setTempUnit(e.target.value as TemperatureUnit)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="celsius">Celsius</option>
            <option value="kelvin">Kelvin</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time_h"
              label={{ value: "Time (hours)", position: "bottom", offset: -5 }}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => v.toFixed(0)}
            />
            <YAxis
              yAxisId="temp"
              domain={[tempMin, tempMax]}
              label={{
                value: `Temperature (${tempLabel})`,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
              tick={{ fontSize: 12 }}
            />
            {showIrradiance && (
              <YAxis
                yAxisId="irradiance"
                orientation="right"
                domain={[0, maxIrradiance * 1.1]}
                label={{
                  value: "Irradiance (W/m2)",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle" },
                }}
                tick={{ fontSize: 12 }}
              />
            )}
            <Tooltip
              formatter={(value, name) => {
                const numValue = Number(value);
                if (name === "Tank Temperature" || name === "Ambient Temperature") {
                  return [`${numValue.toFixed(2)} ${tempLabel}`, name];
                }
                return [`${numValue.toFixed(1)} W/m2`, name];
              }}
              labelFormatter={(label) => `Time: ${Number(label).toFixed(2)} h`}
            />
            <Legend />

            {/* Pump-on regions */}
            {showPumpRegions &&
              pumpRegions.map((region, i) => (
                <ReferenceArea
                  key={i}
                  yAxisId="temp"
                  x1={region.start}
                  x2={region.end}
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              ))}

            {/* Reference line at sunrise/sunset times (approximate) */}
            <ReferenceLine
              x={6}
              yAxisId="temp"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: "6h", position: "top", fontSize: 10 }}
            />
            <ReferenceLine
              x={18}
              yAxisId="temp"
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: "18h", position: "top", fontSize: 10 }}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="tank_temp"
              name="Tank Temperature"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            {showAmbient && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="ambient_temp"
                name="Ambient Temperature"
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {showIrradiance && (
              <Line
                yAxisId="irradiance"
                type="monotone"
                dataKey="irradiance"
                name="Irradiance"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <span className="text-gray-500">Final Tank Temp</span>
          <p className="font-semibold text-red-600">
            {convertTemp(result.tank_temperature_k[result.tank_temperature_k.length - 1]).toFixed(
              1
            )}{" "}
            {tempLabel}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <span className="text-gray-500">Max Tank Temp</span>
          <p className="font-semibold text-red-600">
            {convertTemp(Math.max(...result.tank_temperature_k)).toFixed(1)} {tempLabel}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <span className="text-gray-500">Pump On Time</span>
          <p className="font-semibold text-blue-600">
            {(
              (result.pump_on.filter((p) => p).length / result.pump_on.length) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <span className="text-gray-500">Data Points</span>
          <p className="font-semibold text-gray-700">{result.times_s.length}</p>
        </div>
      </div>
    </div>
  );
});
