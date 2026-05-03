import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700",
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
