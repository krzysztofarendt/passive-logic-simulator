import { useState, useEffect, useRef, memo } from "react";
import type { SimulationConfig } from "../types/simulation";
import { PARAMETER_HELP } from "../types/simulation";
import { Tooltip } from "./Tooltip";

interface ParameterFormProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

interface InputFieldProps {
  label: string;
  value: number | boolean;
  onChange: (value: number | boolean) => void;
  type?: "number" | "checkbox";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help?: string;
}

// Custom comparison: only re-render if value, label, or type changes (not onChange)
const inputFieldPropsAreEqual = (
  prev: InputFieldProps,
  next: InputFieldProps
) => {
  return (
    prev.value === next.value &&
    prev.label === next.label &&
    prev.type === next.type &&
    prev.unit === next.unit &&
    prev.min === next.min &&
    prev.max === next.max &&
    prev.step === next.step &&
    prev.help === next.help
  );
};

// Memoized InputField with local state for responsive typing
const InputField = memo(function InputField({
  label,
  value,
  onChange,
  type = "number",
  min,
  max,
  step = 0.01,
  unit,
  help,
}: InputFieldProps) {
  // Local state for immediate UI response
  const [localValue, setLocalValue] = useState(String(value));

  // Ref to always have latest onChange without triggering re-renders
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync local state when prop changes (e.g., from parent reset)
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  // Debounced update to parent
  useEffect(() => {
    if (type === "checkbox") return;

    const parsed = parseFloat(localValue);
    if (!isNaN(parsed) && parsed !== value) {
      const timer = setTimeout(() => {
        onChangeRef.current(parsed);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [localValue, type, value]);

  if (type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-gray-700">{label}</span>
        {help && <Tooltip text={help} />}
      </label>
    );
  }

  return (
    <label className="block text-sm">
      <span className="text-gray-700">
        {label}
        {unit && <span className="text-gray-400 ml-1">[{unit}]</span>}
        {help && <Tooltip text={help} />}
      </span>
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          // Ensure value is committed on blur
          const parsed = parseFloat(localValue);
          if (!isNaN(parsed) && parsed !== value) {
            onChangeRef.current(parsed);
          }
        }}
        min={min}
        max={max}
        step={step}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </label>
  );
}, inputFieldPropsAreEqual);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function ParameterForm({
  config,
  onChange,
  onSubmit,
  isLoading,
}: ParameterFormProps) {
  const updateCollector = (
    key: keyof typeof config.collector,
    value: number
  ) => {
    onChange({
      ...config,
      collector: { ...config.collector, [key]: value },
    });
  };

  const updateTank = (key: keyof typeof config.tank, value: number) => {
    onChange({
      ...config,
      tank: { ...config.tank, [key]: value },
    });
  };

  const updatePump = (key: keyof typeof config.pump, value: number) => {
    onChange({
      ...config,
      pump: { ...config.pump, [key]: value },
    });
  };

  const updateControl = (
    key: keyof typeof config.control,
    value: number | boolean
  ) => {
    onChange({
      ...config,
      control: { ...config.control, [key]: value },
    });
  };

  const updateSimulation = (
    key: keyof typeof config.simulation,
    value: number
  ) => {
    onChange({
      ...config,
      simulation: { ...config.simulation, [key]: value },
    });
  };

  const updateWeather = (key: keyof typeof config.weather, value: number) => {
    onChange({
      ...config,
      weather: { ...config.weather, [key]: value },
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Simulation Parameters
      </h2>

      <Section title="Collector">
        <InputField
          label="Area"
          unit="m2"
          value={config.collector.area_m2}
          onChange={(v) => updateCollector("area_m2", v as number)}
          min={0.1}
          step={0.1}
          help={PARAMETER_HELP["collector.area_m2"]}
        />
        <InputField
          label="Heat Removal Factor"
          unit="F_R"
          value={config.collector.heat_removal_factor}
          onChange={(v) => updateCollector("heat_removal_factor", v as number)}
          min={0}
          max={1}
          step={0.01}
          help={PARAMETER_HELP["collector.heat_removal_factor"]}
        />
        <InputField
          label="Optical Efficiency"
          unit="eta0"
          value={config.collector.optical_efficiency}
          onChange={(v) => updateCollector("optical_efficiency", v as number)}
          min={0}
          max={1}
          step={0.01}
          help={PARAMETER_HELP["collector.optical_efficiency"]}
        />
        <InputField
          label="Loss Coefficient"
          unit="W/(m2.K)"
          value={config.collector.loss_coefficient_w_m2k}
          onChange={(v) =>
            updateCollector("loss_coefficient_w_m2k", v as number)
          }
          min={0}
          step={0.1}
          help={PARAMETER_HELP["collector.loss_coefficient_w_m2k"]}
        />
      </Section>

      <Section title="Tank">
        <InputField
          label="Mass"
          unit="kg"
          value={config.tank.mass_kg}
          onChange={(v) => updateTank("mass_kg", v as number)}
          min={1}
          step={1}
          help={PARAMETER_HELP["tank.mass_kg"]}
        />
        <InputField
          label="Specific Heat"
          unit="J/(kg.K)"
          value={config.tank.cp_j_kgk}
          onChange={(v) => updateTank("cp_j_kgk", v as number)}
          min={1}
          step={1}
          help={PARAMETER_HELP["tank.cp_j_kgk"]}
        />
        <InputField
          label="Heat Loss UA"
          unit="W/K"
          value={config.tank.ua_w_k}
          onChange={(v) => updateTank("ua_w_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["tank.ua_w_k"]}
        />
        <InputField
          label="Initial Temperature"
          unit="K"
          value={config.tank.initial_temperature_k}
          onChange={(v) => updateTank("initial_temperature_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["tank.initial_temperature_k"]}
        />
        <InputField
          label="Room Temperature"
          unit="K"
          value={config.tank.room_temperature_k}
          onChange={(v) => updateTank("room_temperature_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["tank.room_temperature_k"]}
        />
      </Section>

      <Section title="Pump">
        <InputField
          label="Mass Flow Rate"
          unit="kg/s"
          value={config.pump.mass_flow_kg_s}
          onChange={(v) => updatePump("mass_flow_kg_s", v as number)}
          min={0}
          step={0.001}
          help={PARAMETER_HELP["pump.mass_flow_kg_s"]}
        />
      </Section>

      <Section title="Control">
        <div className="col-span-2">
          <InputField
            label="Enable Control"
            type="checkbox"
            value={config.control.enabled}
            onChange={(v) => updateControl("enabled", v)}
            help={PARAMETER_HELP["control.enabled"]}
          />
        </div>
        <InputField
          label="Delta T On"
          unit="K"
          value={config.control.delta_t_on_k}
          onChange={(v) => updateControl("delta_t_on_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["control.delta_t_on_k"]}
        />
        <InputField
          label="Delta T Off"
          unit="K"
          value={config.control.delta_t_off_k}
          onChange={(v) => updateControl("delta_t_off_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["control.delta_t_off_k"]}
        />
        <InputField
          label="Min Irradiance"
          unit="W/m2"
          value={config.control.min_irradiance_w_m2}
          onChange={(v) => updateControl("min_irradiance_w_m2", v as number)}
          min={0}
          step={1}
          help={PARAMETER_HELP["control.min_irradiance_w_m2"]}
        />
      </Section>

      <Section title="Simulation">
        <InputField
          label="Start Time"
          unit="s"
          value={config.simulation.t0_s}
          onChange={(v) => updateSimulation("t0_s", v as number)}
          min={0}
          step={1}
          help={PARAMETER_HELP["simulation.t0_s"]}
        />
        <InputField
          label="Time Step"
          unit="s"
          value={config.simulation.dt_s}
          onChange={(v) => updateSimulation("dt_s", v as number)}
          min={1}
          step={1}
          help={PARAMETER_HELP["simulation.dt_s"]}
        />
        <InputField
          label="Duration"
          unit="s"
          value={config.simulation.duration_s}
          onChange={(v) => updateSimulation("duration_s", v as number)}
          min={1}
          step={1}
          help={PARAMETER_HELP["simulation.duration_s"]}
        />
      </Section>

      <Section title="Weather (Synthetic)">
        <InputField
          label="Sunrise"
          unit="s"
          value={config.weather.sunrise_s}
          onChange={(v) => updateWeather("sunrise_s", v as number)}
          min={0}
          step={3600}
          help={PARAMETER_HELP["weather.sunrise_s"]}
        />
        <InputField
          label="Sunset"
          unit="s"
          value={config.weather.sunset_s}
          onChange={(v) => updateWeather("sunset_s", v as number)}
          min={0}
          step={3600}
          help={PARAMETER_HELP["weather.sunset_s"]}
        />
        <InputField
          label="Peak Irradiance"
          unit="W/m2"
          value={config.weather.peak_irradiance_w_m2}
          onChange={(v) => updateWeather("peak_irradiance_w_m2", v as number)}
          min={0}
          step={10}
          help={PARAMETER_HELP["weather.peak_irradiance_w_m2"]}
        />
        <InputField
          label="Ambient Mean"
          unit="K"
          value={config.weather.ambient_mean_k}
          onChange={(v) => updateWeather("ambient_mean_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["weather.ambient_mean_k"]}
        />
        <InputField
          label="Ambient Amplitude"
          unit="K"
          value={config.weather.ambient_amplitude_k}
          onChange={(v) => updateWeather("ambient_amplitude_k", v as number)}
          min={0}
          step={0.1}
          help={PARAMETER_HELP["weather.ambient_amplitude_k"]}
        />
        <InputField
          label="Ambient Period"
          unit="s"
          value={config.weather.ambient_period_s}
          onChange={(v) => updateWeather("ambient_period_s", v as number)}
          min={1}
          step={3600}
          help={PARAMETER_HELP["weather.ambient_period_s"]}
        />
      </Section>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Running..." : "Run Simulation"}
      </button>
    </div>
  );
}
