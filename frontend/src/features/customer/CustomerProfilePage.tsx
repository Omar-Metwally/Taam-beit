import { useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  MapPin,
  ChefHat,
  Bike,
  ShoppingBag,
  ChevronRight,
  Edit2,
} from "lucide-react";
import { useUserStore } from "@/store/user.store";
import { useAuthStore } from "@/store/auth.store";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border] last:border-0">
      <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Role card ─────────────────────────────────────────────────────────────────

function RoleCard({
  icon,
  title,
  description,
  to,
  status,
  applied,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  status?: "Pending" | "Approved" | "Rejected";
  applied: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[--border] hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
        <p className="text-xs text-[--text-muted] mt-0.5">{description}</p>
        {applied && status && (
          <div className="mt-1.5">
            <StatusBadge status={status} />
          </div>
        )}
      </div>
      <ChevronRight
        size={16}
        className="text-[--text-muted] group-hover:text-brand-500 transition-colors shrink-0"
      />
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const {
    firstName,
    lastName,
    email,
    chefProfile,
    deliveryManProfile,
    avatarLargeUrl,
  } = useUserStore();
  const { hasRole } = useAuthStore();

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="min-h-screen bg-[--bg]">
      {/* Hero */}
      <div className="bg-white border-b border-[--border]">
        <div className="max-w-2xl mx-auto px-4 py-8 flex items-center gap-5">
          {/* Avatar */}
          {avatarLargeUrl() ? (
            <img
              src={avatarLargeUrl()!}
              alt={fullName}
              className="w-20 h-20 rounded-full object-cover border-4 border-[--border] shadow-sm shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-100 border-4 border-[--border] shadow-sm flex items-center justify-center shrink-0">
              <span className="text-brand-700 font-bold text-3xl">
                {firstName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-[--text-primary] truncate">
              {fullName}
            </h1>
            <p className="text-sm text-[--text-muted] mt-0.5 truncate">
              {email}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full">
                Customer
              </span>
              {hasRole("Chef") && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
                  <ChefHat size={11} /> Chef
                </span>
              )}
              {hasRole("DeliveryMan") && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                  <Bike size={11} /> Delivery
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Account info */}
        <div className="bg-white rounded-2xl border border-[--border] shadow-card px-5 py-2">
          <div className="flex items-center justify-between py-3 mb-1">
            <h2 className="font-semibold text-[--text-primary]">
              Account Info
            </h2>
            <button className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              <Edit2 size={13} /> Edit
            </button>
          </div>
          <InfoRow
            icon={<User size={15} />}
            label="Full Name"
            value={fullName}
          />
          <InfoRow
            icon={<Mail size={15} />}
            label="Email"
            value={email ?? "—"}
          />
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-[--border] shadow-card px-5 py-4">
          <h2 className="font-semibold text-[--text-primary] mb-3">
            Quick Links
          </h2>
          <Link
            to="/orders"
            className="flex items-center gap-3 py-3 border-b border-[--border] group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShoppingBag size={15} />
            </div>
            <span className="flex-1 text-sm font-medium text-[--text-primary]">
              My Orders
            </span>
            <ChevronRight
              size={15}
              className="text-[--text-muted] group-hover:text-brand-500 transition-colors"
            />
          </Link>
          <Link to="/saved" className="flex items-center gap-3 py-3 group">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <MapPin size={15} />
            </div>
            <span className="flex-1 text-sm font-medium text-[--text-primary]">
              Saved Addresses
            </span>
            <ChevronRight
              size={15}
              className="text-[--text-muted] group-hover:text-brand-500 transition-colors"
            />
          </Link>
        </div>

        {/* Role profiles */}
        <div>
          <h2 className="font-semibold text-[--text-primary] mb-3">My Roles</h2>
          <div className="flex flex-col gap-3">
            <RoleCard
              icon={<ChefHat size={20} />}
              title="Chef Profile"
              description={
                chefProfile
                  ? "View your chef dashboard"
                  : "Apply to cook on Ta'am Beit"
              }
              to={chefProfile ? "/chef" : "/chef-signup"}
              status={chefProfile?.status}
              applied={!!chefProfile}
            />
            <RoleCard
              icon={<Bike size={20} />}
              title="Delivery Profile"
              description={
                deliveryManProfile
                  ? "View your delivery dashboard"
                  : "Apply as a delivery partner"
              }
              to={deliveryManProfile ? "/delivery" : "/delivery-signup"}
              status={deliveryManProfile?.status}
              applied={!!deliveryManProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
