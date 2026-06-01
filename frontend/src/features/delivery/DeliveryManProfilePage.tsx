import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Navigation,
} from "lucide-react";
import { useUserStore } from "@/store/user.store";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { VehicleType } from "@/api/supervisor";

// ── Vehicle config ────────────────────────────────────────────────────────────

const VEHICLE_CONFIG: Record<
  VehicleType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  Bike: {
    label: "Bicycle",
    icon: <Bike size={20} />,
    color: "bg-green-100  text-green-700",
  },
  Motorcycle: {
    label: "Motorcycle",
    icon: <Navigation size={20} />,
    color: "bg-orange-100 text-orange-700",
  },
  Car: {
    label: "Car",
    icon: <Car size={20} />,
    color: "bg-blue-100   text-blue-700",
  },
};

// ── Timeline item ─────────────────────────────────────────────────────────────

function TimelineItem({
  label,
  date,
  done = false,
  active = false,
  rejected = false,
}: {
  label: string;
  date: string | null | undefined;
  done?: boolean;
  active?: boolean;
  rejected?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          done
            ? "bg-brand-500 text-white"
            : rejected
              ? "bg-red-100   text-red-500"
              : active
                ? "bg-amber-100 text-amber-600"
                : "bg-[--border] text-[--text-muted]",
        )}
      >
        {done ? (
          <CheckCircle2 size={14} />
        ) : rejected ? (
          <XCircle size={14} />
        ) : active ? (
          <Clock size={14} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-current" />
        )}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <p
          className={cn(
            "text-sm font-medium",
            done || active || rejected
              ? "text-[--text-primary]"
              : "text-[--text-muted]",
          )}
        >
          {label}
        </p>
        {date && (
          <p className="text-xs text-[--text-muted]">
            {new Date(date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DeliveryManProfilePage() {
  const { firstName, lastName, email, deliveryManProfile } = useUserStore();

  if (!deliveryManProfile) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col items-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
          <Bike size={36} className="text-brand-300" />
        </div>
        <h2 className="font-display text-lg font-bold text-[--text-primary] mb-1">
          No delivery profile found
        </h2>
        <p className="text-sm text-[--text-muted]">
          Your delivery profile hasn't been set up yet.
        </p>
      </div>
    );
  }

  const vehicle = VEHICLE_CONFIG[deliveryManProfile.vehicleType];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[--text-primary]">
          My Profile
        </h1>
        <p className="text-sm text-[--text-muted] mt-0.5">
          Your delivery man account details
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card mb-4">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400 rounded-t-2xl" />
        <div className="px-5 pb-5">
          {/* Avatar — no photo upload for delivery men */}
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center">
              <span className="text-blue-700 font-bold text-2xl">
                {firstName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-bold text-[--text-primary]">
                {firstName} {lastName}
              </h2>
              <p className="text-sm text-[--text-muted]">{email}</p>
            </div>
            <StatusBadge status={deliveryManProfile.status} />
          </div>

          {deliveryManProfile.status === "Rejected" &&
            deliveryManProfile.rejectionReason && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Application rejected
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {deliveryManProfile.rejectionReason}
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card mb-4 px-5 py-4">
        <h3 className="font-semibold text-[--text-primary] mb-4">
          Delivery Details
        </h3>

        <div className="flex flex-col gap-4">
          {/* Vehicle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  vehicle.color,
                )}
              >
                {vehicle.icon}
              </div>
              <div>
                <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide">
                  Vehicle
                </p>
                <p className="text-sm font-semibold text-[--text-primary]">
                  {vehicle.label}
                </p>
              </div>
            </div>
          </div>

          {/* National ID */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide">
                National ID
              </p>
              <p className="text-sm font-semibold text-[--text-primary] font-mono tracking-wide">
                {deliveryManProfile.personalIdNumber}
              </p>
            </div>
          </div>

          {/* Last known location */}
          {deliveryManProfile.currentLatitude != null &&
            deliveryManProfile.currentLongitude != null && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide">
                    Last Known Location
                  </p>
                  <p className="text-sm font-semibold text-[--text-primary] font-mono">
                    {deliveryManProfile.currentLatitude.toFixed(5)},{" "}
                    {deliveryManProfile.currentLongitude.toFixed(5)}
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Timeline card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card px-5 py-4">
        <h3 className="font-semibold text-[--text-primary] mb-3">
          Application Timeline
        </h3>
        <div className="flex flex-col gap-3">
          <TimelineItem
            label="Applied"
            date={deliveryManProfile.appliedAt}
            done
          />
          <TimelineItem
            label="Under review"
            date={null}
            done={deliveryManProfile.status !== "Pending"}
            active={deliveryManProfile.status === "Pending"}
          />
          <TimelineItem
            label={
              deliveryManProfile.status === "Rejected" ? "Rejected" : "Approved"
            }
            date={deliveryManProfile.reviewedAt}
            done={deliveryManProfile.status === "Approved"}
            rejected={deliveryManProfile.status === "Rejected"}
          />
        </div>
      </div>
    </div>
  );
}
