import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Upload,
} from "lucide-react";
import { useUserStore } from "@/store/user.store";
import { chefApi } from "@/api/chef";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

// ── Avatar upload ─────────────────────────────────────────────────────────────

function AvatarUpload({
  currentUrl,
  name,
}: {
  currentUrl: string | null;
  name: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      const { default: api } = await import("@/api/client");
      return await api.post("/me/chef-avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => fetchProfile(),
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    mutation.mutate(file);
  };

  return (
    <div className="relative w-24 h-24">
      {currentUrl ? (
        <img
          src={currentUrl}
          alt={name ?? "avatar"}
          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-brand-100 border-4 border-white shadow-md flex items-center justify-center">
          <span className="text-brand-700 font-bold text-3xl">
            {name?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={mutation.isPending}
        className="absolute bottom-0 right-0 w-8 h-8 bg-brand-500 hover:bg-brand-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-60"
      >
        {mutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocumentRow({
  label,
  uploaded,
  documentType,
}: {
  label: string;
  uploaded: boolean;
  documentType: 0 | 1;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  const mutation = useMutation({
    mutationFn: (file: File) => chefApi.uploadDocument(documentType, file),
    onSuccess: () => fetchProfile(),
  });

  return (
    <div className="flex items-center justify-between py-3 border-b border-[--border] last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            uploaded
              ? "bg-green-100 text-green-600"
              : "bg-amber-100 text-amber-600",
          )}
        >
          {uploaded ? <CheckCircle2 size={15} /> : <Clock size={15} />}
        </div>
        <div>
          <p className="text-sm font-medium text-[--text-primary]">{label}</p>
          <p className="text-xs text-[--text-muted]">
            {uploaded ? "Uploaded" : "Not uploaded yet"}
          </p>
        </div>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={mutation.isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-60"
      >
        {mutation.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Upload size={13} />
        )}
        {uploaded ? "Replace" : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) mutation.mutate(file);
        }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChefProfilePage() {
  const { firstName, lastName, email, chefProfile, avatarLargeUrl } =
    useUserStore();

  if (!chefProfile) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col items-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
          <FileText size={36} className="text-brand-300" />
        </div>
        <h2 className="font-display text-lg font-bold text-[--text-primary] mb-1">
          No chef profile found
        </h2>
        <p className="text-sm text-[--text-muted]">
          Your chef profile hasn't been set up yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[--text-primary]">
          My Profile
        </h1>
        <p className="text-sm text-[--text-muted] mt-0.5">
          Manage your chef profile and documents
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card mb-4">
        {/* Cover / hero strip */}
        <div className="h-24 bg-gradient-to-r from-brand-600 to-brand-400 rounded-t-2xl" />

        <div className="px-5 pb-5">
          {/* Avatar overlapping the cover */}
          <div className="-mt-12 mb-4">
            <AvatarUpload currentUrl={avatarLargeUrl()} name={firstName} />
          </div>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-bold text-[--text-primary]">
                {firstName} {lastName}
              </h2>
              <p className="text-sm text-[--text-muted]">{email}</p>
            </div>
            <StatusBadge status={chefProfile.status} />
          </div>

          {chefProfile.status === "Rejected" && chefProfile.rejectionReason && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Application rejected
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {chefProfile.rejectionReason}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="mt-4 flex items-center gap-2 text-sm text-[--text-muted]">
            <MapPin size={15} className="text-brand-500 shrink-0" />
            <span>
              {chefProfile.operationLocationAddress ||
                `${chefProfile.latitude.toFixed(4)}, ${chefProfile.longitude.toFixed(4)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Documents card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card mb-4 px-5 py-4">
        <h3 className="font-semibold text-[--text-primary] mb-1">
          Verification Documents
        </h3>
        <p className="text-xs text-[--text-muted] mb-3">
          Required for profile approval
        </p>
        <DocumentRow
          label="National ID"
          uploaded={chefProfile.hasPersonalId}
          documentType={0}
        />
        <DocumentRow
          label="Health Certificate"
          uploaded={chefProfile.hasHealthCertificate}
          documentType={1}
        />
      </div>

      {/* Timeline card */}
      <div className="bg-white rounded-2xl border border-[--border] shadow-card px-5 py-4">
        <h3 className="font-semibold text-[--text-primary] mb-3">
          Application Timeline
        </h3>
        <div className="flex flex-col gap-3">
          <TimelineItem label="Applied" date={chefProfile.appliedAt} done />
          <TimelineItem
            label="Under review"
            date={null}
            done={chefProfile.status !== "Pending"}
            active={chefProfile.status === "Pending"}
          />
          <TimelineItem
            label={chefProfile.status === "Rejected" ? "Rejected" : "Approved"}
            date={chefProfile.reviewedAt}
            done={chefProfile.status === "Approved"}
            rejected={chefProfile.status === "Rejected"}
          />
        </div>
      </div>
    </div>
  );
}

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
              ? "bg-red-100 text-red-500"
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
