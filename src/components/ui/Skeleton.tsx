import { cn } from "@/lib/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (lines) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
              i === lines - 1 && "w-3/4",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}
