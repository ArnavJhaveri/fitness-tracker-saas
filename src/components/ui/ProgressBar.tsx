import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  sublabel?: string;
  color?: "indigo" | "blue" | "green" | "orange" | "violet" | "red";
  size?: "sm" | "md";
  className?: string;
  showPercent?: boolean;
}

const TRACK = "bg-gray-100 dark:bg-gray-700";
const COLORS = {
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  red: "bg-red-500",
};

export function ProgressBar({
  value,
  label,
  sublabel,
  color = "indigo",
  size = "md",
  className,
  showPercent = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || sublabel || showPercent) && (
        <div className="flex items-center justify-between">
          <div>
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            )}
            {sublabel && (
              <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>
            )}
          </div>
          {showPercent && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full",
          TRACK,
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", COLORS[color])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
