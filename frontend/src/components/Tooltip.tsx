import { useState } from "react";

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="Help"
      >
        ?
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg max-w-xs whitespace-pre-line leading-snug">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </span>
  );
}
