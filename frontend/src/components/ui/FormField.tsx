import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── Field ─────────────────────────────────────────────────────────────────────

export function Field({
  label,
  error,
  children,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-[--text-primary] mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-[--text-muted] bg-white",
        hasError
          ? "border-red-400 focus:border-red-400"
          : "border-[--border] focus:border-brand-400",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
