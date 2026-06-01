import { useState } from "react";
import { useChefOrders } from "./hooks/useChefOrders";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  X,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryState } from "@/components/ui/QueryState";
import {
  type OrderStatus,
  type OrderItemResponse,
  type ChefOrderResponse,
} from "@/api/orders";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  OrderStatus,
  { label: string; dot: string; badge: string }
> = {
  Pending: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  Confirmed: {
    label: "Confirmed",
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Rejected: {
    label: "Rejected",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
  Preparing: {
    label: "Preparing",
    dot: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  ReadyForPickup: {
    label: "Ready",
    dot: "bg-green-400",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  OutForDelivery: {
    label: "Picked Up",
    dot: "bg-purple-400",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  Delivered: {
    label: "Delivered",
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
  Cancelled: {
    label: "Cancelled",
    dot: "bg-red-300",
    badge: "bg-red-50 text-red-500 border-red-200",
  },
};

const FILTER_TABS: { label: string; value: OrderStatus | "All" }[] = [
  { label: "Pending", value: "Pending" },
  { label: "Confirmed", value: "Confirmed" },
  { label: "Preparing", value: "Preparing" },
  { label: "Ready", value: "ReadyForPickup" },
  { label: "All", value: "All" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

// ── Reject Modal ───────────────────────────────────────────────────────────────

function RejectModal({
  orderId,
  onConfirm,
  onCancel,
  isPending,
}: {
  orderId: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-[--text-primary]">
              Reject Order
            </h3>
            <p className="text-xs text-[--text-muted]">
              {formatShortId(orderId)}
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium text-[--text-primary] mb-1.5">
          Reason <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Out of ingredients, kitchen closed…"
          maxLength={500}
          className="w-full rounded-xl border border-[--border] px-3.5 py-2.5 text-sm text-[--text-primary] resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
        />
        <p className="text-xs text-[--text-muted] text-right mt-1 mb-5">
          {reason.length}/500
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 btn-outline py-2.5 text-sm"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Reject Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Items Expanded ───────────────────────────────────────────────────────

function OrderItemsExpanded({ items }: { items: OrderItemResponse[] }) {
  return (
    <div className="bg-[--bg] border-t border-[--border] px-4 py-3 flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.orderItemId} className="flex gap-3">
          {/* Quantity bubble */}
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
            ×{item.quantity}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-[--text-primary] truncate">
                {item.mealName}
              </p>
              <p className="text-sm font-semibold text-[--text-primary] shrink-0">
                {item.lineTotal.toFixed(2)}{" "}
                <span className="text-xs font-normal text-[--text-muted]">
                  {item.currency}
                </span>
              </p>
            </div>
            <p className="text-xs text-[--text-muted]">{item.variantName}</p>

            {/* Side dishes */}
            {item.sideDishes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.sideDishes.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5"
                  >
                    + {s.name}
                  </span>
                ))}
              </div>
            )}

            {/* Toppings */}
            {item.toppings.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.toppings.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5"
                  >
                    + {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Action Buttons ─────────────────────────────────────────────────────────────

function ActionButtons({
  order,
  onConfirm,
  onReject,
  onStartPreparing,
  onMarkReady,
  loadingAction,
}: {
  order: ChefOrderResponse;
  onConfirm: () => void;
  onReject: () => void;
  onStartPreparing: () => void;
  onMarkReady: () => void;
  loadingAction: string | null;
}) {
  const isLoading = (action: string) =>
    loadingAction === `${action}-${order.orderId}`;

  const btnBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  if (order.status === "Pending") {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onReject}
          disabled={!!loadingAction}
          className={cn(
            btnBase,
            "border border-red-200 text-red-600 hover:bg-red-50",
          )}
        >
          {isLoading("reject") ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <XCircle size={13} />
          )}
          Reject
        </button>
        <button
          onClick={onConfirm}
          disabled={!!loadingAction}
          className={cn(btnBase, "bg-brand-500 text-white hover:bg-brand-600")}
        >
          {isLoading("confirm") ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <CheckCircle2 size={13} />
          )}
          Confirm
        </button>
      </div>
    );
  }

  if (order.status === "Confirmed") {
    return (
      <button
        onClick={onStartPreparing}
        disabled={!!loadingAction}
        className={cn(btnBase, "bg-orange-500 text-white hover:bg-orange-600")}
      >
        {isLoading("start-preparing") ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <ChefHat size={13} />
        )}
        Start Preparing
      </button>
    );
  }

  if (order.status === "Preparing") {
    return (
      <button
        onClick={onMarkReady}
        disabled={!!loadingAction}
        className={cn(btnBase, "bg-green-500 text-white hover:bg-green-600")}
      >
        {isLoading("ready-for-pickup") ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <PackageCheck size={13} />
        )}
        Mark Ready
      </button>
    );
  }

  return null;
}

// ── Order Row ─────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  expanded,
  onToggle,
  onConfirm,
  onReject,
  onStartPreparing,
  onMarkReady,
  loadingAction,
}: {
  order: ChefOrderResponse;
  expanded: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onStartPreparing: () => void;
  onMarkReady: () => void;
  loadingAction: string | null;
}) {
  const meta = STATUS_META[order.status];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border overflow-hidden transition-all duration-200",
        expanded
          ? "border-brand-300 shadow-md"
          : "border-[--border] hover:border-brand-200 hover:shadow-sm",
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <div className="text-[--text-muted] shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {/* Order ID + time */}
        <div className="min-w-0 w-28 shrink-0">
          <p className="text-sm font-bold text-[--text-primary] font-mono">
            {formatShortId(order.orderId)}
          </p>
          <p className="text-xs text-[--text-muted]">
            {formatTime(order.createdAt)}
          </p>
        </div>

        {/* Status badge */}
        <div className="shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
              meta.badge,
            )}
          >
            <span
              className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)}
            />
            {meta.label}
          </span>
        </div>

        {/* Items summary */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-sm text-[--text-primary] truncate">
            {order.items.map((i) => i.mealName).join(", ")}
          </p>
          <p className="text-xs text-[--text-muted]">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Total */}
        <div className="text-right shrink-0 w-24 hidden sm:block">
          <p className="text-sm font-bold text-[--text-primary]">
            {order.total.toFixed(2)}
          </p>
          <p className="text-xs text-[--text-muted]">{order.currency}</p>
        </div>

        {/* Action buttons — stop propagation so clicks don't toggle expand */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 ml-auto">
          <ActionButtons
            order={order}
            onConfirm={onConfirm}
            onReject={onReject}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            loadingAction={loadingAction}
          />
        </div>
      </div>

      {/* Expanded items */}
      {expanded && <OrderItemsExpanded items={order.items} />}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ statusFilter }: { statusFilter: OrderStatus | "All" }) {
  const messages: Record<OrderStatus | "All", { title: string; sub: string }> =
    {
      Pending: {
        title: "No pending orders",
        sub: "New orders will appear here when customers place them.",
      },
      Confirmed: {
        title: "No confirmed orders",
        sub: "Orders you confirm will show up here.",
      },
      Preparing: {
        title: "Nothing in preparation",
        sub: "Start preparing a confirmed order to see it here.",
      },
      ReadyForPickup: {
        title: "No orders ready for pickup",
        sub: "Finish preparing an order and mark it ready.",
      },
      All: {
        title: "No orders yet",
        sub: "Orders from customers will appear here.",
      },
      Rejected: { title: "No rejected orders", sub: "" },
      OutForDelivery: { title: "No picked-up orders", sub: "" },
      Delivered: { title: "No delivered orders", sub: "" },
      Cancelled: { title: "No cancelled orders", sub: "" },
    };
  const { title, sub } = messages[statusFilter];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
        <ClipboardList size={28} className="text-brand-300" />
      </div>
      <h3 className="font-display text-lg font-bold text-[--text-primary] mb-1">
        {title}
      </h3>
      {sub && <p className="text-sm text-[--text-muted] max-w-xs">{sub}</p>}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ChefOrdersDashboard() {
  const {
    isLoading,
    isError,
    refetch,
    orders,
    filtered,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    expandedId,
    setExpandedId,
    rejectTarget,
    setRejectTarget,
    loadingAction,
    error,
    setError,
    confirmOrder,
    rejectOrder,
    startPreparing,
    markReadyForPickup,
  } = useChefOrders();

  // ── Render ─────────────────────────────────────────────────────────────────

  const qs = (
    <QueryState isLoading={isLoading} isError={isError} onRetry={refetch} />
  );
  if (isLoading || isError) return qs;

  return (
    <>
      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          orderId={rejectTarget}
          isPending={loadingAction === `reject-${rejectTarget}`}
          onConfirm={(reason) => rejectOrder(rejectTarget, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[--text-primary]">
              Orders
            </h1>
            <p className="text-sm text-[--text-muted] mt-0.5">
              {orders.length === 0
                ? "No orders"
                : `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-outline flex items-center gap-2 py-2 px-3.5 text-sm shrink-0"
            title="Refresh orders"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                statusFilter === tab.value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-[--text-muted] hover:bg-[--bg] hover:text-[--text-primary]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or meal name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[--border] text-sm text-[--text-primary] bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <EmptyState statusFilter={statusFilter} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((order) => (
              <OrderRow
                key={order.orderId}
                order={order}
                expanded={expandedId === order.orderId}
                onToggle={() =>
                  setExpandedId((prev) =>
                    prev === order.orderId ? null : order.orderId,
                  )
                }
                loadingAction={loadingAction}
                onConfirm={() => confirmOrder(order.orderId)}
                onReject={() => setRejectTarget(order.orderId)}
                onStartPreparing={() => startPreparing(order.orderId)}
                onMarkReady={() => markReadyForPickup(order.orderId)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
