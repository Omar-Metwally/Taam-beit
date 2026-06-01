import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Custom marker icon (avoids default icon import issues) ───────────────────
const customIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      background-color: #e11d48;
      width: 2rem;
      height: 2rem;
      display: block;
      left: -1rem;
      top: -1rem;
      position: relative;
      border-radius: 2rem 2rem 0;
      transform: rotate(45deg);
      border: 3px solid white;
      box-shadow: 0 0 12px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const DEFAULT_CENTER: [number, number] = [31.224, 29.79];

// ── Internal helpers ─────────────────────────────────────────────────────────

function MapClickHandler({
  onMapClick,
  disabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!disabled) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({
  center,
  zoom,
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? map.getZoom());
    }
  }, [center, map, zoom]);
  return null;
}

// ── Public component ─────────────────────────────────────────────────────────

interface MapPickerProps {
  position?: [number, number] | null; // controlled marker position
  onPositionChange: (lat: number, lng: number) => void;
  center?: [number, number]; // map view center (e.g. after geolocation)
  disabled?: boolean;
  height?: string;
}

export default function MapPicker({
  position,
  onPositionChange,
  center,
  disabled = false,
  height = "300px",
}: MapPickerProps) {
  const initialCenter = center || position || DEFAULT_CENTER;

  return (
    <div
      style={{ height }}
      className="rounded-xl overflow-hidden border border-[--border]"
    >
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Center update helper */}
        <MapController center={center} />

        {/* Click handler */}
        <MapClickHandler onMapClick={onPositionChange} disabled={disabled} />

        {/* Marker – only when position is set */}
        {position && (
          <Marker
            position={position}
            icon={customIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const latlng = marker.getLatLng();
                onPositionChange(latlng.lat, latlng.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
