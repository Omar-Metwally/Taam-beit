import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  CheckCircle2,
  Package,
  Bike,
  Loader2,
  Clock,
  ChevronRight,
  Navigation,
  Route,
} from "lucide-react";
import { deliveryApi, type ActiveDeliveryResponse } from "@/api/delivery";
import { cn } from "@/lib/utils";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#2D7A2D;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:16px;">🏠</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const dropoffIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ── Routing via OSRM public demo ──────────────────────────────────────────────

type RouteResult = {
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
};

async function fetchRoadRoute(
  from: [number, number],
  to: [number, number],
): Promise<RouteResult> {
  // OSRM expects lng,lat
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service unavailable");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0])
    throw new Error("No route found");

  const route = data.routes[0];
  const coords: [number, number][] = route.geometry.coordinates.map(
    (c: number[]) => [c[1], c[0]], // geojson is [lng, lat] → leaflet needs [lat, lng]
  );

  return {
    path: coords,
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
  };
}

// ── Map fit-bounds helper ─────────────────────────────────────────────────────

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [map, points]);
  return null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Assigned: {
    label: "Head to pickup",
    description: "Go pick up the order from the chef",
    icon: <Bike size={20} />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    step: 1,
    actionLabel: "Mark as Picked Up",
    actionDescription: "Confirm you've collected the order from the chef",
    actionColor: "bg-brand-500 hover:bg-brand-600",
  },
  PickedUp: {
    label: "Out for delivery",
    description: "Deliver the order to the customer",
    icon: <Navigation size={20} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    step: 2,
    actionLabel: "Mark as Delivered",
    actionDescription: "Confirm the customer has received their order",
    actionColor: "bg-brand-500 hover:bg-brand-600",
  },
  Delivered: {
    label: "Delivered!",
    description: "Order successfully delivered",
    icon: <CheckCircle2 size={20} />,
    color: "bg-green-50 text-green-700 border-green-200",
    step: 3,
    actionLabel: null,
    actionDescription: null,
    actionColor: "",
  },
};

function getStatusConfig(status: string) {
  const config = (STATUS_CONFIG as any)[status];
  if (!config) {
    console.warn("Unknown delivery status:", status);
    return {
      label: status,
      description: "Unknown status",
      icon: <Package size={20} />,
      color: "bg-gray-50 text-gray-600 border-gray-200",
      step: 1,
      actionLabel: null,
      actionDescription: null,
      actionColor: "",
    };
  }
  return config;
}

// ── Progress steps ────────────────────────────────────────────────────────────

function ProgressSteps({ step }: { step: number }) {
  const steps = [
    { label: "Accepted", icon: <Package size={14} /> },
    { label: "Picked Up", icon: <Bike size={14} /> },
    { label: "Delivered", icon: <CheckCircle2 size={14} /> },
  ];
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => {
        const done = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                  done
                    ? "bg-brand-500 border-brand-500 text-white"
                    : active
                      ? "bg-white border-brand-500 text-brand-500"
                      : "bg-white border-[--border] text-[--text-muted]",
                )}
              >
                {s.icon}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  active
                    ? "text-brand-600"
                    : done
                      ? "text-brand-400"
                      : "text-[--text-muted]",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 mb-5 transition-colors",
                  done ? "bg-brand-500" : "bg-[--border]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── No Active Delivery ────────────────────────────────────────────────────────

function NoActiveDelivery({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center mb-6">
        <Bike size={44} className="text-brand-400" />
      </div>
      <h2 className="font-display text-2xl font-bold text-[--text-primary] mb-2">
        No active delivery
      </h2>
      <p className="text-sm text-[--text-muted] max-w-xs mb-8">
        You don't have an active delivery right now. Browse available orders to
        get started.
      </p>
      <button onClick={onBrowse} className="btn-primary px-8">
        Browse Available Orders
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const LOCATION_INTERVAL_MS = 4000;

export default function ActiveDeliveryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmStep, setConfirmStep] = useState<"idle" | "confirm">("idle");
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: delivery,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["delivery", "active"],
    queryFn: deliveryApi.getActive,
    retry: false,
  });

  const { mutate: markPickedUp, isPending: pickingUp } = useMutation({
    mutationFn: () => deliveryApi.markPickedUp(delivery!.deliveryTrackingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery", "active"] });
      setConfirmStep("idle");
    },
  });

  const { mutate: markDelivered, isPending: delivering } = useMutation({
    mutationFn: () => deliveryApi.markDelivered(delivery!.deliveryTrackingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery", "active"] });
      setConfirmStep("idle");
    },
  });

  // ── SignalR + GPS interval ────────────────────────────────────────────────

  useEffect(() => {
    if (!delivery || delivery.status === "Delivered") return;

    const hub = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/delivery")
      .withAutomaticReconnect()
      .build();

    const sendLocation = () => {
      if (hub.state !== signalR.HubConnectionState.Connected) return;

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const pos: [number, number] = [coords.latitude, coords.longitude];
          setDriverPos(pos);

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

    hub
      .start()
      .then(() => {
        hub.invoke("JoinDeliveryManGroup").catch(console.error);
        sendLocation();
        intervalRef.current = setInterval(sendLocation, LOCATION_INTERVAL_MS);
      })
      .catch(console.error);

    hubRef.current = hub;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      hub.stop();
    };
  }, [delivery?.deliveryTrackingId, delivery?.status]);

  // ── Road route from driver → destination ──────────────────────────────────

  const destination: [number, number] | null =
    delivery?.status === "Assigned"
      ? [delivery.pickupLatitude, delivery.pickupLongitude]
      : delivery?.status === "PickedUp"
        ? [delivery.dropoffLatitude, delivery.dropoffLongitude]
        : null;

  const { data: route, isLoading: routeLoading } = useQuery({
    queryKey: [
      "route",
      driverPos?.[0],
      driverPos?.[1],
      destination?.[0],
      destination?.[1],
    ],
    queryFn: () => fetchRoadRoute(driverPos!, destination!),
    enabled: !!driverPos && !!destination,
    staleTime: 30_000, // re-fetch every 30s max
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !delivery) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <NoActiveDelivery onBrowse={() => navigate("/delivery")} />
      </div>
    );
  }

  const config = getStatusConfig(delivery.status);
  const pickup: [number, number] = [
    delivery.pickupLatitude,
    delivery.pickupLongitude,
  ];
  const dropoff: [number, number] = [
    delivery.dropoffLatitude,
    delivery.dropoffLongitude,
  ];

  const boundsPoints: [number, number][] = [pickup, dropoff];
  if (driverPos) boundsPoints.push(driverPos);

  const handleAction = () => {
    if (confirmStep === "idle") {
      setConfirmStep("confirm");
      return;
    }
    if (delivery.status === "Assigned") markPickedUp();
    else if (delivery.status === "PickedUp") markDelivered();
  };

  const isActing = pickingUp || delivering;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[--text-primary]">
          Active Delivery
        </h1>
        <p className="text-sm text-[--text-muted] mt-0.5">
          Order #{delivery.orderId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-[--border] p-4 mb-4">
        <ProgressSteps step={config.step} />
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl border mb-4 font-medium text-sm",
          config.color,
        )}
      >
        {config.icon}
        <div className="flex-1">
          <p className="font-semibold">{config.label}</p>
          <p className="text-xs font-normal opacity-80">{config.description}</p>
        </div>
        {route && (
          <div className="text-right shrink-0">
            <p className="text-xs font-bold">
              {route.distanceKm.toFixed(1)} km
            </p>
            <p className="text-[10px] opacity-70">~{route.durationMin} min</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border border-[--border] mb-4 relative"
        style={{ height: 360 }}
      >
        {routeLoading && (
          <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-[--text-muted] shadow-sm flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Calculating route…
          </div>
        )}

        <MapContainer
          center={driverPos ?? pickup}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Actual road route */}
          {route && (
            <Polyline
              positions={route.path}
              pathOptions={{
                color: delivery.status === "Assigned" ? "#f59e0b" : "#3b82f6",
                weight: 5,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}

          {/* Fallback straight line while route loads */}
          {!route && driverPos && destination && (
            <Polyline
              positions={[driverPos, destination]}
              pathOptions={{ color: "#9ca3af", weight: 3, dashArray: "6 8" }}
            />
          )}

          <Marker position={pickup} icon={pickupIcon}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {delivery.pickupAddress ?? "Chef location"}
            </Popup>
          </Marker>

          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup>
              <strong>Dropoff</strong>
              <br />
              {delivery.dropoffAddress ?? "Customer location"}
            </Popup>
          </Marker>

          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          <FitBounds points={boundsPoints} />
        </MapContainer>
      </div>

      {/* Location cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[--border] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
              <MapPin size={13} className="text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
              Pickup
            </span>
          </div>
          <p className="text-sm text-[--text-primary] leading-snug line-clamp-2">
            {delivery.pickupAddress ??
              `${pickup[0].toFixed(4)}, ${pickup[1].toFixed(4)}`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[--border] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <MapPin size={13} className="text-red-500" />
            </div>
            <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wide">
              Dropoff
            </span>
          </div>
          <p className="text-sm text-[--text-primary] leading-snug line-clamp-2">
            {delivery.dropoffAddress ??
              `${dropoff[0].toFixed(4)}, ${dropoff[1].toFixed(4)}`}
          </p>
        </div>
      </div>

      {/* Timing */}
      <div className="bg-white rounded-xl border border-[--border] p-3 mb-6 flex items-center gap-3">
        <Clock size={16} className="text-[--text-muted] shrink-0" />
        <div className="flex gap-4 text-sm">
          <span className="text-[--text-muted]">
            Accepted{" "}
            <strong className="text-[--text-primary]">
              {new Date(delivery.acceptedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </span>
          {delivery.pickedUpAt && (
            <span className="text-[--text-muted]">
              Picked up{" "}
              <strong className="text-[--text-primary]">
                {new Date(delivery.pickedUpAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      {config.actionLabel && (
        <div>
          {confirmStep === "confirm" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-amber-800">
              <strong>Are you sure?</strong> {config.actionDescription}
            </div>
          )}

          <div
            className={cn(
              "flex gap-2",
              confirmStep === "confirm" && "flex-col",
            )}
          >
            <button
              onClick={handleAction}
              disabled={isActing}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-all shadow-sm",
                config.actionColor,
                isActing && "opacity-60 cursor-not-allowed",
              )}
            >
              {isActing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Updating…
                </>
              ) : confirmStep === "confirm" ? (
                <>Yes, confirm</>
              ) : (
                <>
                  {config.actionLabel} <ChevronRight size={16} />
                </>
              )}
            </button>

            {confirmStep === "confirm" && (
              <button
                onClick={() => setConfirmStep("idle")}
                className="flex-1 py-3.5 rounded-xl border border-[--border] text-[--text-muted] font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delivered success */}
      {delivery.status === "Delivered" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold mb-1">
            🎉 Order delivered successfully!
          </p>
          <p className="text-green-600 text-sm">
            Great job. Head back to browse more orders.
          </p>
          <button
            onClick={() => navigate("/delivery")}
            className="mt-3 btn-primary text-sm py-2.5 px-6"
          >
            Browse More Orders
          </button>
        </div>
      )}
    </div>
  );
}
