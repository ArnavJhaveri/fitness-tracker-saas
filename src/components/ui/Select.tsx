import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

/**
 * Accessible select with optional label and error message.
 *
 * Field id is generated via React.useId() unless an explicit `id` is passed,
 * so two selects with the same label don't collide. The error is linked
 * via aria-describedby so screen readers announce it on focus.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors",
            "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100",
            "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
