import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { forwardRef, cloneElement, Children } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-500",
        secondary:
          "bg-white text-gray-900 border border-gray-300 shadow-sm hover:bg-gray-50 focus-visible:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700",
        ghost:
          "text-gray-700 hover:bg-gray-100 focus-visible:ring-indigo-500 dark:text-gray-300 dark:hover:bg-gray-800",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500",
        link: "text-indigo-600 underline-offset-4 hover:underline focus-visible:ring-indigo-500 dark:text-indigo-400",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  /** Merges button styles onto the single child element instead of rendering a <button>. */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, asChild = false, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      const child = Children.only(children) as React.ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button ref={ref} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
