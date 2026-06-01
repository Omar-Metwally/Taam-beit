import { Suspense, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  User,
  UtensilsCrossed,
  ShoppingBag,
  BarChart2,
  Bell,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  Menu,
  X,
  Bike,
  Navigation,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUserStore } from "@/store/user.store";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

interface DashboardLayoutProps {
  role: "chef" | "supervisor" | "delivery";
}

const chefNav: NavItem[] = [
  {
    label: "Application Status",
    icon: <ClipboardList size={18} />,
    to: "/chef",
  },
  { label: "My Profile", icon: <User size={18} />, to: "/chef/profile" },
  { label: "My Menu", icon: <UtensilsCrossed size={18} />, to: "/chef/menu" },
  { label: "Orders", icon: <ShoppingBag size={18} />, to: "/chef/orders" },
  { label: "Analytics", icon: <BarChart2 size={18} />, to: "/chef/analytics" },
];

const supervisorNav: NavItem[] = [
  { label: "Chefs", icon: <Users size={18} />, to: "/supervisor" },
  {
    label: "Delivery men",
    icon: <Bike size={18} />,
    to: "/supervisor/deliverymen",
  },
  {
    label: "Orders",
    icon: <ShoppingBag size={18} />,
    to: "/supervisor/orders",
  },
  {
    label: "Analytics",
    icon: <BarChart2 size={18} />,
    to: "/supervisor/analytics",
  },
  {
    label: "Verification",
    icon: <ShieldCheck size={18} />,
    to: "/supervisor/verification",
  },
];

const deliveryNav: NavItem[] = [
  {
    label: "Available Orders",
    icon: <ShoppingBag size={18} />,
    to: "/delivery",
  },
  {
    label: "Active Delivery",
    icon: <Navigation size={18} />,
    to: "/delivery/active",
  },
];

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { firstName, lastName, avatarSmallUrl, chefProfile } = useUserStore();
  const navigate = useNavigate();

  const nav =
    role === "chef"
      ? chefNav
      : role === "delivery"
        ? deliveryNav
        : supervisorNav;

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // Role label shown under the name
  const roleLabel =
    role === "chef"
      ? "Chef"
      : role === "delivery"
        ? "Delivery Man"
        : "Supervisor";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/10",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-brand-600 font-display font-bold text-sm">
            <img src="/favicon.ico" alt="Ta'am Beit" />
          </span>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-white text-lg tracking-tight">
            <img
              src="/logo.svg"
              alt="Ta'am Beit"
              className="h-6 w-auto brightness-0 invert"
            />
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={
              item.to === "/chef" ||
              item.to === "/supervisor" ||
              item.to === "/delivery"
            }
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                collapsed && "justify-center px-0 py-3",
                isActive
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-white/80 hover:bg-white/15 hover:text-white",
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10 my-2" />

      {/* Bottom nav */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {[
          {
            label: "Notification Center",
            icon: <Bell size={18} />,
            to: `/${role}/notifications`,
          },
          {
            label: "Help Center",
            icon: <HelpCircle size={18} />,
            to: `/${role}/help`,
          },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                collapsed && "justify-center px-0 py-3",
                isActive
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-white/80 hover:bg-white/15 hover:text-white",
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* User identity block */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl bg-white/10",
            collapsed && "justify-center px-0 py-3",
          )}
        >
          <SidebarAvatar
            name={firstName}
            avatarUrl={role === "chef" ? avatarSmallUrl() : null}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {firstName && lastName ? `${firstName} ${lastName}` : "—"}
              </p>
              <p className="text-white/50 text-xs truncate">{roleLabel}</p>
              {role === "chef" && chefProfile && (
                <StatusDot status={chefProfile.status} />
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-all duration-150 w-full",
            collapsed && "justify-center px-0 py-3",
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>

      {/* Terms */}
      {!collapsed && (
        <p className="text-white/30 text-xs text-center pb-4 px-4">
          Terms &amp; Conditions
        </p>
      )}

      {/* Collapse toggle — desktop */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden md:flex items-center justify-center w-6 h-6 bg-white text-brand-600 rounded-full shadow-md absolute -right-3 top-20 hover:bg-brand-50 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[--bg] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col relative bg-brand-600 transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] bg-brand-600 z-50 transition-transform duration-300 md:hidden flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[--border]">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-[--text-primary]"
          >
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-brand-600">
            Ta'am Beit
          </span>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SidebarAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "avatar"}
        className="w-8 h-8 rounded-full object-cover border-2 border-white/30 shrink-0"
      />
    );
  }

  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold border-2 border-white/30 shrink-0">
      {initial}
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: "Pending" | "Approved" | "Rejected";
}) {
  const config = {
    Approved: { color: "bg-emerald-400", label: "Active" },
    Pending: { color: "bg-amber-400", label: "Pending review" },
    Rejected: { color: "bg-red-400", label: "Rejected" },
  }[status];

  return (
    <span className="flex items-center gap-1 mt-0.5">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.color)} />
      <span className="text-white/50 text-[10px]">{config.label}</span>
    </span>
  );
}
