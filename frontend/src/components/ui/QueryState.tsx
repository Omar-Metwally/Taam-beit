import { Loader2, AlertCircle, InboxIcon } from "lucide-react";

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  minHeight?: string;
  /**
   * "default" – centred in a tall viewport slice (original behaviour)
   * "inline"  – compact, fits inside a table/card section
   */
  variant?: "default" | "inline";
}

export function QueryState({
  isLoading,
  isError,
  isEmpty = false,
  onRetry,
  loadingMessage,
  errorMessage = "Something went wrong",
  emptyMessage = "Nothing here yet",
  minHeight,
  variant = "default",
}: QueryStateProps) {
  const resolvedMinHeight =
    minHeight ?? (variant === "inline" ? "120px" : "60vh");

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: `min(${resolvedMinHeight}, 400px)` }}
      >
        <Loader2 size={28} className="animate-spin text-brand-500" />
        {loadingMessage && (
          <span className="ml-3 text-sm text-[--text-muted]">
            {loadingMessage}
          </span>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ minHeight: `min(${resolvedMinHeight}, 400px)` }}
      >
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-[--text-primary] font-semibold">{errorMessage}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-outline px-6 py-2.5 text-sm">
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ minHeight: `min(${resolvedMinHeight}, 400px)` }}
      >
        <InboxIcon size={32} className="text-[--text-muted]" />
        <p className="text-[--text-muted] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return null;
}
