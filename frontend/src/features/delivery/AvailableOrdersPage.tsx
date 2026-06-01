import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import {
  ShoppingBag,
  ChevronRight,
  Loader2,
  PackageSearch,
  Bike,
  Wifi,
  WifiOff,
  Bell,
  MapPin,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { deliveryApi, type AvailableOrder } from "@/api/delivery";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function distanceLabel(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function getCurrentPositionAsync(
  options?: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  );
}

// ── Connection status pill ────────────────────────────────────────────────────

type HubStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

function ConnectionBadge({ status }: { status: HubStatus }) {
  const cfg = {
    connecting: {
      label: "Connecting…",
      color: "bg-amber-50 text-amber-600 border-amber-200",
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    connected: {
      label: "Live",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <Wifi size={12} />,
    },
    reconnecting: {
      label: "Reconnecting…",
      color: "bg-amber-50 text-amber-600 border-amber-200",
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    disconnected: {
      label: "Offline",
      color: "bg-red-50 text-red-500 border-red-200",
      icon: <WifiOff size={12} />,
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
        cfg.color,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAccept,
  accepting,
  isNew,
}: {
  order: AvailableOrder;
  onAccept: () => void;
  accepting: boolean;
  isNew: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const dist = distanceLabel(
    order.pickupLatitude,
    order.pickupLongitude,
    order.dropoffLatitude,
    order.dropoffLongitude,
  );

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border shadow-card overflow-hidden transition-all duration-300",
        isNew ? "border-brand-400 shadow-md" : "border-[--border]",
      )}
    >
      {isNew && (
        <div className="bg-brand-500 px-4 py-1.5 flex items-center gap-1.5">
          <Bell size={12} className="text-white" />
          <span className="text-xs font-semibold text-white">
            New order just arrived!
          </span>
        </div>
      )}

      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[--text-primary] truncate">
              {order.chefName}
            </p>
            <p className="text-xs text-[--text-muted] mt-0.5">{dist} route</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-brand-600 text-lg leading-tight">
              {order.total}{" "}
              <span className="text-sm font-medium">{order.currency}</span>
            </p>
            <p className="text-xs text-[--text-muted]">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
              <div className="w-px h-4 bg-[--border]" />
            </div>
            <p className="text-sm text-[--text-muted] leading-tight line-clamp-1 flex-1">
              {order.pickupAddress ??
                `${order.pickupLatitude.toFixed(4)}, ${order.pickupLongitude.toFixed(4)}`}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-[--text-muted] leading-tight line-clamp-1 flex-1">
              {order.dropoffAddress ??
                `${order.dropoffLatitude.toFixed(4)}, ${order.dropoffLongitude.toFixed(4)}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-brand-500 transition-colors"
        >
          <ShoppingBag size={13} />
          <span>View items</span>
          <ChevronRight
            size={13}
            className={cn("transition-transform", expanded && "rotate-90")}
          />
        </button>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-[--border] flex flex-col gap-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-[--text-muted]">
                  {item.mealName} ({item.variantName}) ×{item.quantity}
                </span>
                <span className="font-medium text-[--text-primary]">
                  {item.lineTotal} {item.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onAccept}
          disabled={accepting}
          className="btn-primary w-full py-3 text-sm rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {accepting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Accepting…
            </>
          ) : (
            <>
              <Bike size={16} /> Accept Delivery
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Waiting state ─────────────────────────────────────────────────────────────

function WaitingState({ hubStatus }: { hubStatus: HubStatus }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors",
          hubStatus === "connected" ? "bg-brand-50" : "bg-gray-100",
        )}
      >
        <PackageSearch
          size={36}
          className={cn(
            "transition-colors",
            hubStatus === "connected" ? "text-brand-400" : "text-gray-400",
          )}
        />
      </div>
      <h3 className="font-display text-xl font-bold text-[--text-primary] mb-2">
        Waiting for orders
      </h3>
      <p className="text-sm text-[--text-muted] max-w-xs">
        {hubStatus === "connected"
          ? "You're online and listening. New orders will appear here automatically."
          : "Connect to start receiving order notifications in real time."}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvailableOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [hubStatus, setHubStatus] = useState<HubStatus>("connecting");
  const [locationError, setLocationError] = useState<string | null>(null);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── Fetch available orders using current driver location ───────────────────
  const fetchAvailableOrders = async () => {
    try {
      let loc = lastLocationRef.current;

      if (!loc) {
        const pos = await getCurrentPositionAsync({
          enableHighAccuracy: true,
          timeout: 5000,
        });
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastLocationRef.current = loc;
      }

      setLocationError(null);
      const available = await deliveryApi.getAvailable(loc.lat, loc.lng);
      setOrders(available);
    } catch {
      setLocationError("Unable to access your location. Please enable GPS.");
    }
  };

  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval> | undefined;

    const hub = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/delivery")
      .withAutomaticReconnect()
      .build();

    hub.onreconnecting(() => setHubStatus("reconnecting"));
    hub.onreconnected(() => setHubStatus("connected"));
    hub.onclose(() => setHubStatus("disconnected"));

    // Server pushes { orderId, chefId } when a nearby order is ready for pickup
    hub.on(
      "NewDeliveryAvailable",
      async (payload: { orderId: string; chefId: string }) => {
        try {
          const loc = lastLocationRef.current;
          if (!loc) return;

          const available = await deliveryApi.getAvailable(loc.lat, loc.lng);
          const incoming = available.find((o) => o.orderId === payload.orderId);
          if (!incoming) return;

          setOrders((prev) => {
            if (prev.some((o) => o.orderId === incoming.orderId)) return prev;
            return [incoming, ...prev];
          });

          setNewOrderIds((prev) => new Set([...prev, incoming.orderId]));
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              next.delete(incoming.orderId);
              return next;
            });
          }, 8000);
        } catch {
          // Order may have already been taken — ignore silently
        }
      },
    );

    hub
      .start()
      .then(() => {
        setHubStatus("connected");
        hub.invoke("JoinDeliveryManGroup").catch(console.error);

        const sendLocation = () => {
          if (hub.state !== signalR.HubConnectionState.Connected) return;
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              const loc = {
                lat: coords.latitude,
                lng: coords.longitude,
              };
              lastLocationRef.current = loc;

              hub
                .invoke(
                  "UpdateLocation",
                  coords.latitude,
                  coords.longitude,
                  coords.heading ?? null,
                  coords.speed != null ? coords.speed * 3.6 : null,
                )
                .catch(() => {});
            },
            () => {},
            { enableHighAccuracy: true, timeout: 3000 },
          );
        };

        sendLocation();
        locationInterval = setInterval(sendLocation, 4000);
        fetchAvailableOrders();
      })
      .catch(() => setHubStatus("disconnected"));

    hubRef.current = hub;
    return () => {
      clearInterval(locationInterval);
      hub.stop();
    };
  }, []);

  const {
    mutate: acceptOrder,
    variables: acceptingId,
    error: acceptError,
    isError: isAcceptError,
    reset: resetAcceptError,
  } = useMutation({
    mutationFn: (orderId: string) => deliveryApi.accept(orderId),
    onSuccess: (_, orderId) => {
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      queryClient.invalidateQueries({ queryKey: ["delivery", "active"] });
      navigate("/delivery/active");
    },
    onError: (err: any) => {
      console.error("Failed to accept order:", err);
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary]">
            Available Orders
          </h1>
          <p className="text-sm text-[--text-muted] mt-0.5">
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""} ready for pickup`
              : "Orders appear here in real time"}
          </p>
        </div>
        <ConnectionBadge status={hubStatus} />
      </div>

      {locationError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <MapPin size={16} />
          {locationError}
        </div>
      )}

      {isAcceptError && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="truncate">
              {acceptError?.response?.data?.message ??
                acceptError?.message ??
                "Failed to accept order. It may have been taken by another driver."}
            </span>
          </div>
          <button
            onClick={resetAcceptError}
            className="shrink-0 hover:text-red-800 transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {orders.length === 0 && !locationError ? (
        <WaitingState hubStatus={hubStatus} />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onAccept={() => acceptOrder(order.orderId)}
              accepting={acceptingId === order.orderId}
              isNew={newOrderIds.has(order.orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
