import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UtensilsCrossed,
  Package,
} from "lucide-react";
import api from "@/api/client";
import type { OrderStatus } from "@/api/orders";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerOrderItemSummary {
  mealName: string;
  variantName: string;
  quantity: number;
  lineTotal: number;
  currency: string;
}

interface CustomerOrder {
  orderId: string;
  chefId: string;
  chefName: string;
  chefAvatarSmallUrl: string | null;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  items: CustomerOrderItemSummary[];
}

// ── API ───────────────────────────────────────────────────────────────────────

const fetchMyOrders = (monthsBack: number) =>
  api
    .get<CustomerOrder[]>("/customer/orders", { params: { monthsBack } })
    .then((r) => r.data);

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Pending: {
    label: "Pending",
    color: "bg-amber-50  text-amber-700  border-amber-200",
    icon: <Clock size={12} />,
  },
  Confirmed: {
    label: "Confirmed",
    color: "bg-blue-50   text-blue-700   border-blue-200",
    icon: <CheckCircle2 size={12} />,
  },
  Rejected: {
    label: "Rejected",
    color: "bg-red-50    text-red-600    border-red-200",
    icon: <XCircle size={12} />,
  },
  Preparing: {
    label: "Preparing",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: <UtensilsCrossed size={12} />,
  },
  ReadyForPickup: {
    label: "Ready for Pickup",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <Package size={12} />,
  },
  OutForDelivery: {
    label: "On the Way",
    color: "bg-blue-50   text-blue-700   border-blue-200",
    icon: <Package size={12} />,
  },
  Delivered: {
    label: "Delivered",
    color: "bg-green-50  text-green-700  border-green-200",
    icon: <CheckCircle2 size={12} />,
  },
  Cancelled: {
    label: "Cancelled",
    color: "bg-gray-50   text-gray-500   border-gray-200",
    icon: <XCircle size={12} />,
  },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Preparing",
  "ReadyForPickup",
  "OutForDelivery",
];

type Tab = "all" | "active" | "delivered" | "cancelled";

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

function applyTabFilter(orders: CustomerOrder[], tab: Tab): CustomerOrder[] {
  switch (tab) {
    case "active":
      return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    case "delivered":
      return orders.filter((o) => o.status === "Delivered");
    case "cancelled":
      return orders.filter((o) => o.status === "Cancelled");
    default:
      return orders;
  }
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: CustomerOrder }) {
  const cfg = STATUS_CONFIG[order.status];
  const date = new Date(order.createdAt);

  return (
    <Link
      to={`/orders/${order.orderId}/track`}
      className="block bg-white rounded-2xl border border-[--border] p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {order.chefAvatarSmallUrl ? (
            <img
              src={order.chefAvatarSmallUrl}
              alt={order.chefName}
              className="w-10 h-10 rounded-full object-cover border border-[--border] shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
              {order.chefName[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate">
              {order.chefName}
            </p>
            <p className="text-xs text-[--text-muted]">
              {date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0",
            cfg.color,
          )}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      <div className="flex flex-col gap-1 mb-3">
        {order.items.slice(0, 3).map((item, i) => (
          <p key={i} className="text-xs text-[--text-muted]">
            <span className="font-medium text-[--text-primary]">
              {item.quantity}×
            </span>{" "}
            {item.mealName}
            {item.variantName && (
              <span className="text-[--text-muted]"> ({item.variantName})</span>
            )}
          </p>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-[--text-muted]">
            +{order.items.length - 3} more items
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[--border]">
        <p className="text-sm font-bold text-[--text-primary]">
          {order.total.toFixed(2)} {order.currency}
        </p>
        <span className="text-xs text-brand-600 font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
          View details <ChevronRight size={13} />
        </span>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerOrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [monthsBack, setMonths] = useState(1);

  // One fetch per window size. staleTime of 2 min means switching tabs
  // never triggers a network request — filtering happens in memory.
  const {
    data: orders,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ["customer-orders", monthsBack],
    queryFn: () => fetchMyOrders(monthsBack),
    staleTime: 2 * 60 * 1000,
  });

  const visible = applyTabFilter(orders ?? [], tab);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary]">
            My Orders
          </h1>
          <p className="text-sm text-[--text-muted] mt-0.5">
            {monthsBack === 1 ? "Last 30 days" : `Last ${monthsBack} months`}
            {isFetching && !isLoading && (
              <span className="ml-2 inline-flex items-center gap-1 text-brand-500">
                <Loader2 size={11} className="animate-spin" /> refreshing
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs — client-side only, zero network cost */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              tab === t.value
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-[--text-muted] border-[--border] hover:border-brand-300 hover:text-brand-600",
            )}
          >
            {t.label}
            {orders && (
              <span
                className={cn(
                  "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  tab === t.value
                    ? "bg-white/20 text-white"
                    : "bg-[--border] text-[--text-muted]",
                )}
              >
                {applyTabFilter(orders, t.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-20">
          <p className="text-[--text-muted]">
            Could not load orders. Please try again.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <ShoppingBag size={36} className="text-brand-300" />
          </div>
          <h2 className="font-display text-lg font-bold text-[--text-primary] mb-1">
            {tab === "all" ? "No orders yet" : `No ${tab} orders`}
          </h2>
          <p className="text-sm text-[--text-muted] mb-6">
            {tab === "all"
              ? "Discover home-cooked meals near you"
              : "Try a different tab"}
          </p>
          {tab === "all" && (
            <Link to="/" className="btn-primary text-sm py-2.5 px-6">
              Browse Chefs
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderCard key={order.orderId} order={order} />
          ))}
        </div>
      )}

      {/* Load older — only shown when there's data and window can still expand */}
      {!isLoading && !isError && monthsBack < 6 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setMonths((m) => m + 1)}
            disabled={isFetching}
            className="text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isFetching ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Loading…
              </>
            ) : (
              `Load orders older than ${monthsBack} month${monthsBack > 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
