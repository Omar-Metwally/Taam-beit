import { useState } from "react";
import { useApplicationReview } from "./hooks/useApplicationReview";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  ShieldCheck,
  MapPin,
  Calendar,
  ExternalLink,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryState } from "@/components/ui/QueryState";
import MapPicker from "@/components/ui/MapPicker";
import {
  supervisorApi,
  type ProfileStatus,
  type ChefApplication,
} from "@/api/supervisor";

// ── Status config ─────────────────────────────────────────────────────────────

import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Document viewer button ────────────────────────────────────────────────────

function DocumentButton({
  userId,
  documentType,
  label,
  available,
}: {
  userId: string;
  documentType: 0 | 1;
  label: string;
  available: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    if (!available) return;
    setLoading(true);
    try {
      const url = await supervisorApi.getChefDocumentUrl(userId, documentType);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to load document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={open}
      disabled={!available || loading}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all w-full",
        available
          ? "border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 hover:border-brand-300"
          : "border-[--border] text-[--text-muted] bg-[--bg] cursor-not-allowed opacity-60",
      )}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin shrink-0" />
      ) : (
        <FileText size={15} className="shrink-0" />
      )}
      <span className="flex-1 text-left">{label}</span>
      {available ? (
        <ExternalLink size={13} className="shrink-0 opacity-60" />
      ) : (
        <AlertCircle size={13} className="shrink-0 text-[--text-muted]" />
      )}
    </button>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  chef,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  chef: ChefApplication;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isPending = chef.status === "Pending";
  const initials = chef.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative fade-up overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-7 pt-7 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={15} />
          </button>
          <div className="flex items-center gap-4">
            {chef.avatarUrl ? (
              <img
                src={chef.avatarUrl}
                alt={chef.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl shrink-0">
                {initials}
              </div>
            )}
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {chef.fullName}
              </h2>
              <p className="text-white/70 text-sm">{chef.email}</p>
              <div className="mt-2">
                <StatusBadge status={chef.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 -mt-4 pb-7 flex flex-col gap-5">
          {/* Info strip */}
          <div className="bg-white rounded-xl border border-[--border] shadow-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={15} className="text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[--text-primary]">
                  Operation Location
                </p>
                <p className="text-[--text-muted] text-xs mt-0.5">
                  {chef.operationLocationAddress ||
                    `${chef.latitude.toFixed(4)}, ${chef.longitude.toFixed(4)}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Calendar size={15} className="text-brand-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[--text-primary]">Applied</p>
                <p className="text-[--text-muted] text-xs mt-0.5">
                  {new Date(chef.appliedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            {chef.rejectionReason && (
              <div className="flex items-start gap-3 text-sm">
                <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-600">Rejection Reason</p>
                  <p className="text-red-500/80 text-xs mt-0.5">
                    {chef.rejectionReason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <p className="text-sm font-semibold text-[--text-primary] mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand-500" />
              Verification Documents
            </p>
            <div className="flex flex-col gap-2">
              <DocumentButton
                userId={chef.userId}
                documentType={1}
                label="Personal ID"
                available={chef.hasPersonalId}
              />
              <DocumentButton
                userId={chef.userId}
                documentType={0}
                label="Health Certificate"
                available={chef.hasHealthCertificate}
              />
            </div>
            {(!chef.hasPersonalId || !chef.hasHealthCertificate) && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {!chef.hasPersonalId && !chef.hasHealthCertificate
                  ? "Both documents are missing"
                  : !chef.hasPersonalId
                    ? "Personal ID not uploaded yet"
                    : "Health certificate not uploaded yet"}
              </p>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-[--bg] rounded-xl p-4 flex flex-col gap-2.5">
            {[
              { label: "Personal ID uploaded", done: chef.hasPersonalId },
              {
                label: "Health certificate uploaded",
                done: chef.hasHealthCertificate,
              },
              {
                label: "Operation location set",
                done: !!chef.operationLocationAddress || chef.latitude !== 0,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
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
                    item.done ? "text-[--text-primary]" : "text-[--text-muted]"
                  }
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Reject reason input */}
          {rejectMode && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[--text-primary]">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this application is being rejected..."
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
          {/* (errors surface via toast/global handler) */}

          {/* Actions */}
          {isPending && (
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
                    onClick={() => onReject(rejectReason)}
                    disabled={!rejectReason.trim() || isRejecting}
                    className="flex-1 py-2.5 rounded-xl border-2 border-red-400 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isRejecting && (
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
                    onClick={onApprove}
                    disabled={isApproving}
                    className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    {isApproving && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    Approve
                  </button>
                </>
              )}
            </div>
          )}

          {!isPending && (
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

// ── Chef row ──────────────────────────────────────────────────────────────────

function ChefRow({
  chef,
  onView,
}: {
  chef: ChefApplication;
  onView: () => void;
}) {
  const docsReady = chef.hasPersonalId && chef.hasHealthCertificate;
  const initials = chef.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-brand-50/40 transition-colors border-b border-[--border] last:border-0">
      {/* Avatar */}
      {chef.avatarUrl ? (
        <img
          src={chef.avatarUrl}
          alt={chef.fullName}
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-[--border]"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 font-semibold text-brand-700 text-sm">
          {initials}
        </div>
      )}

      {/* Name & email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {chef.fullName}
        </p>
        <p className="text-xs text-[--text-muted] truncate">{chef.email}</p>
      </div>

      {/* Location */}
      <span className="hidden lg:flex items-center gap-1 text-xs text-[--text-muted] max-w-[140px] truncate">
        <MapPin size={11} className="shrink-0" />
        {chef.operationLocationAddress ||
          `${chef.latitude.toFixed(3)}, ${chef.longitude.toFixed(3)}`}
      </span>

      {/* Docs */}
      <div className="hidden md:flex items-center gap-1">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            chef.hasPersonalId ? "bg-brand-400" : "bg-gray-300",
          )}
          title="Personal ID"
        />
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            chef.hasHealthCertificate ? "bg-brand-400" : "bg-gray-300",
          )}
          title="Health Certificate"
        />
        <span className="text-xs text-[--text-muted] ml-1">
          {docsReady ? "Docs ready" : "Docs missing"}
        </span>
      </div>

      {/* Date */}
      <span className="hidden sm:inline text-xs text-[--text-muted] whitespace-nowrap">
        {new Date(chef.appliedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </span>

      {/* Status */}
      <div className="hidden sm:block shrink-0">
        <StatusBadge status={chef.status} />
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

export default function SupervisorChefsPage() {
  const [reviewing, setReviewing] = useState<ChefApplication | null>(null);

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
    approveMutation,
    rejectMutation,
  } = useApplicationReview("chef");

  return (
    <>
      {reviewing && (
        <ReviewModal
          chef={reviewing}
          onClose={() => setReviewing(null)}
          onApprove={() => {
            approveMutation.mutate(reviewing.userId, {
              onSuccess: () => setReviewing(null),
            });
          }}
          onReject={(reason) => {
            rejectMutation.mutate(
              { userId: reviewing.userId, reason },
              { onSuccess: () => setReviewing(null) },
            );
          }}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
      )}

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-[--text-primary]">
              Chefs
            </h1>
            <p className="text-[--text-muted] text-sm mt-1">
              Review and manage chef applications
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
            sub="active chefs"
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
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 py-4 border-b border-[--border]">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]"
              />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[--border] rounded-xl outline-none focus:border-brand-400 transition-colors"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-[--border] overflow-x-auto scrollbar-hide">
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
                ? `No chefs match "${search}"`
                : "No chef applications yet."
            }
            variant="inline"
          />
          {!isLoading &&
            !isError &&
            filtered.length > 0 &&
            filtered.map((chef) => (
              <ChefRow
                key={chef.userId}
                chef={chef as ChefApplication}
                onView={() => setReviewing(chef as ChefApplication)}
              />
            ))}
        </div>
      </div>
    </>
  );
}
