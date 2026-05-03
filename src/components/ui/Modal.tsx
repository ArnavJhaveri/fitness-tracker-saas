"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  // Close on Escape (native dialog handles it but we sync state)
  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onCancel={handleCancel}
      className={cn(
        "w-full rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl",
        "dark:border-gray-700 dark:bg-gray-800",
        "backdrop:bg-black/40 backdrop:backdrop-blur-sm",
        SIZE[size],
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
