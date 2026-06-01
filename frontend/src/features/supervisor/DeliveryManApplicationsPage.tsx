import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApplicationReview } from "./hooks/useApplicationReview";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  Bike,
  Car,
  CreditCard,
  Eye,
  ShieldCheck,
  Motorbike,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryState } from "@/components/ui/QueryState";
import {
  supervisorApi,
  type ProfileStatus,
  type VehicleType,
  type DeliveryManApplication,
} from "@/api/supervisor";

// ── Vehicle config ────────────────────────────────────────────────────────────

const VEHICLE_CONFIG: Record<
  VehicleType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  Bike: {
    label: "Bicycle",
    icon: <Bike size={14} />,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  Motorcycle: {
    label: "Motorcycle",
    icon: <Motorbike size={14} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Car: {
    label: "Car",
    icon: <Car size={14} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

function VehicleBadge({ type }: { type: VehicleType }) {
  const cfg = VEHICLE_CONFIG[type];
  console.log(cfg, VEHICLE_CONFIG, type);
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

import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Initials avatar ───────────────────────────────────────────────────────────

function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        "rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-700 shrink-0",
        size === "sm" && "w-8 h-8 text-xs",
        size === "md" && "w-10 h-10 text-sm",
        size === "lg" && "w-16 h-16 text-xl",
      )}
    >
      {initials}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  applicant,
  onClose,
}: {
  applicant: DeliveryManApplication;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: () => supervisorApi.approveDeliveryMan(applicant.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-man-applications"],
      });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      supervisorApi.rejectDeliveryMan(applicant.userId, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-man-applications"],
      });
      onClose();
    },
  });

  const isPending = applicant.status === "Pending";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden fade-up">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-7 pt-7 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={15} />
          </button>
          <div className="flex items-center gap-4">
            <Avatar name={applicant.fullName} size="lg" />
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {applicant.fullName}
              </h2>
              <p className="text-white/70 text-sm">{applicant.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={applicant.status} />
                <VehicleBadge type={applicant.vehicleType} />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 -mt-4 pb-7 flex flex-col gap-5">
          {/* Info strip */}
          <div className="bg-white rounded-xl border border-[--border] shadow-card p-4 flex flex-col gap-3">
            {/* Personal ID */}
            <div className="flex items-start gap-3 text-sm">
              <CreditCard
                size={15}
                className="text-brand-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="font-medium text-[--text-primary]">
                  National ID Number
                </p>
                <p className="text-[--text-muted] text-xs mt-0.5 font-mono tracking-wide">
                  {applicant.personalIdNumber}
                </p>
              </div>
            </div>

            {/* Location */}
            {applicant.latitude !== null && applicant.longitude !== null && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={15} className="text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[--text-primary]">
                    Last Known Location
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${applicant.latitude},${applicant.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 text-xs mt-0.5 hover:underline"
                  >
                    {applicant.latitude.toFixed(5)},{" "}
                    {applicant.longitude.toFixed(5)} ↗
                  </a>
                </div>
              </div>
            )}

            {/* Applied date */}
            <div className="flex items-start gap-3 text-sm">
              <Calendar size={15} className="text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[--text-primary]">Applied</p>
                <p className="text-[--text-muted] text-xs mt-0.5">
                  {new Date(applicant.appliedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Rejection reason */}
            {applicant.rejectionReason && (
              <div className="flex items-start gap-3 text-sm">
                <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-600">Rejection Reason</p>
                  <p className="text-red-500/80 text-xs mt-0.5">
                    {applicant.rejectionReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Verification checklist */}
          <div>
            <p className="text-sm font-semibold text-[--text-primary] mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand-500" />
              Verification Checklist
            </p>
            <div className="bg-[--bg] rounded-xl p-4 flex flex-col gap-2.5">
              {[
                {
                  label: "National ID number provided",
                  done: !!applicant.personalIdNumber,
                },
                {
                  label: "Vehicle type specified",
                  done: applicant.vehicleType !== undefined,
                },
                {
                  label: "Starting location registered",
                  done: applicant.latitude !== null,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs",
                      item.done
                        ? "bg-brand-100 text-brand-600"
                        : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {item.done ? "✓" : "○"}
                  </span>
                  <span
                    className={
                      item.done
                        ? "text-[--text-primary]"
                        : "text-[--text-muted]"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reject reason textarea */}
          {rejectMode && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[--text-primary]">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this application is being rejected…"
                rows={3}
                maxLength={500}
                className="border border-red-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 transition-colors resize-none"
              />
              <p className="text-xs text-[--text-muted] text-right">
                {rejectReason.length}/500
              </p>
            </div>
          )}

          {/* Error */}
          {(approveMutation.isError || rejectMutation.isError) && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <X size={14} className="shrink-0" />
              {(approveMutation.error as any)?.response?.data?.detail ??
                (rejectMutation.error as any)?.response?.data?.detail ??
                "Something went wrong. Please try again."}
            </div>
          )}

          {/* Actions */}
          {isPending ? (
            <div className="flex gap-3">
              {rejectMode ? (
                <>
                  <button
                    onClick={() => setRejectMode(false)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-[--border] text-[--text-muted] font-semibold text-sm hover:bg-[--bg] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate()}
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl border-2 border-red-400 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {rejectMutation.isPending && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Confirm Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setRejectMode(true)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    {approveMutation.isPending && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Approve
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-[--border] text-[--text-muted] font-semibold text-sm hover:bg-[--bg] transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function ApplicationRow({
  applicant,
  onView,
}: {
  applicant: DeliveryManApplication;
  onView: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-brand-50/40 transition-colors border-b border-[--border] last:border-0">
      <Avatar name={applicant.fullName} size="md" />

      {/* Name & email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {applicant.fullName}
        </p>
        <p className="text-xs text-[--text-muted] truncate">
          {applicant.email}
        </p>
      </div>

      {/* Vehicle */}
      <div className="hidden md:block shrink-0">
        <VehicleBadge type={applicant.vehicleType} />
      </div>

      {/* ID number */}
      <span className="hidden lg:inline text-xs text-[--text-muted] font-mono max-w-[120px] truncate">
        {applicant.personalIdNumber}
      </span>

      {/* Date */}
      <span className="hidden sm:inline text-xs text-[--text-muted] whitespace-nowrap">
        {new Date(applicant.appliedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </span>

      {/* Status */}
      <div className="hidden sm:block shrink-0">
        <StatusBadge status={applicant.status} />
      </div>

      {/* Action */}
      <button
        onClick={onView}
        className="shrink-0 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50"
      >
        <Eye size={14} />
        <span className="hidden sm:inline">Review</span>
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[--border] shadow-card p-5">
      <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={cn("font-display text-3xl font-bold", accent)}>{value}</p>
      <p className="text-xs text-[--text-muted] mt-1">{sub}</p>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: ProfileStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DeliveryManApplicationsPage() {
  const [reviewing, setReviewing] = useState<DeliveryManApplication | null>(
    null,
  );

  const {
    isLoading,
    isError,
    refetch,
    filtered,
    counts,
    search,
    setSearch,
    activeTab,
    setActiveTab,
  } = useApplicationReview("delivery");

  return (
    <>
      {reviewing && (
        <ReviewModal applicant={reviewing} onClose={() => setReviewing(null)} />
      )}

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-[--text-primary]">
              Delivery Man Applications
            </h1>
            <p className="text-[--text-muted] text-sm mt-1">
              Review and manage delivery partner applications
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-sm text-[--text-muted] hover:text-brand-600 transition-colors px-3 py-2 rounded-xl hover:bg-brand-50 border border-transparent hover:border-brand-200"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total"
            value={counts.all}
            sub="registered"
            accent="text-[--text-primary]"
          />
          <StatCard
            label="Pending"
            value={counts.Pending}
            sub="awaiting review"
            accent="text-amber-600"
          />
          <StatCard
            label="Approved"
            value={counts.Approved}
            sub="active drivers"
            accent="text-brand-600"
          />
          <StatCard
            label="Rejected"
            value={counts.Rejected}
            sub="not approved"
            accent="text-red-500"
          />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-[--border] shadow-card overflow-hidden">
          {/* Search toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[--border]">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]"
              />
              <input
                type="text"
                placeholder="Search by name, email or ID number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[--border] rounded-xl outline-none focus:border-brand-400 transition-colors"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-[--border] overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                  activeTab === tab.value
                    ? "bg-brand-500 text-white"
                    : "text-[--text-muted] hover:bg-brand-50 hover:text-brand-600",
                )}
              >
                {tab.label}
                <span className="ml-1.5 opacity-70">
                  {counts[tab.value as keyof typeof counts] ?? counts.all}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <QueryState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!isLoading && !isError && filtered.length === 0}
            onRetry={refetch}
            emptyMessage={
              search
                ? `No applicants match "${search}"`
                : "No delivery man applications yet."
            }
            variant="inline"
          />
          {!isLoading &&
            !isError &&
            filtered.length > 0 &&
            filtered.map((applicant) => (
              <ApplicationRow
                key={applicant.userId}
                applicant={applicant as DeliveryManApplication}
                onView={() => setReviewing(applicant as DeliveryManApplication)}
              />
            ))}
        </div>
      </div>
    </>
  );
}
