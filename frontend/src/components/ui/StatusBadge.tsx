import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileStatus } from "@/api/supervisor";

const statusConfig: Record<
  ProfileStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Pending: {
    label: "Pending Review",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock size={12} />,
  },
  Approved: {
    label: "Approved",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: <CheckCircle2 size={12} />,
  },
  Rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-600 border-red-200",
    icon: <XCircle size={12} />,
  },
};

export function StatusBadge({ status }: { status: ProfileStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
        cfg.color,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
