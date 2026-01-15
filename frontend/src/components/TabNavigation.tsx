import type { TabId } from "../types/simulation";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "simulation", label: "Simulation" },
  { id: "error-estimation", label: "Numerical Error Estimation" },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === tab.id
              ? "bg-green-100 text-green-800 border-2 border-green-300"
              : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
