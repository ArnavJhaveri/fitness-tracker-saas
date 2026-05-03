import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

function Card({ className, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
        padding === "sm" && "p-3",
        padding === "md" && "p-5",
        padding === "lg" && "p-7",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-gray-900 dark:text-gray-100", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)} {...props}>
      {children}
    </p>
  );
}

function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-700",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
