import { cn } from "@/lib/utils/cn";
import { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Accessible input with optional label, error message, and hint text.
 * Error state is signalled via aria-invalid and aria-describedby so screen
 * readers announce the error when focus enters the field.
 *
 * Field id strategy: explicit `id` prop wins; otherwise React's useId()
 * generates a stable, unique id per instance. Earlier this slugified the
 * label, which collided when two inputs on the same page shared a label
 * (e.g. two "Notes" fields → both labels pointed at the first input).
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined
          }
          className={cn(
            "h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors",
            "bg-white text-gray-900 placeholder:text-gray-400",
            "dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500",
            "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-red-500 focus:ring-red-500 dark:border-red-500"
              : "border-gray-300 dark:border-gray-600",
            className,
          )}
          {...props}
        />

        {hint && !error && (
          <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
