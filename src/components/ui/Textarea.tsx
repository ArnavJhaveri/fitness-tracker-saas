import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Accessible textarea with optional label and error message.
 *
 * Field id is generated via React.useId() unless an explicit `id` is passed.
 * The error is linked via aria-describedby so screen readers announce it
 * when focus enters the field.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          rows={3}
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-sm transition-colors",
            "bg-white text-gray-900 placeholder:text-gray-400",
            "dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500",
            "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none",
            "resize-none disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500" : "border-gray-300 dark:border-gray-600",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
