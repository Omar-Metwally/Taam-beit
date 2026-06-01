import { create } from "zustand";
import { persist } from "zustand/middleware";

const GEO_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string; // human-readable neighbourhood / road from reverse-geocode
  capturedAt: number; // Date.now() timestamp
}

interface GeoState {
  location: GeoLocation | null;

  /** Save a freshly picked location (resets the 30-min clock). */
  setLocation: (lat: number, lng: number, label?: string) => void;

  /** True when there is NO saved location, or the saved one is older than 30 min. */
  isExpired: () => boolean;

  /** Clear the stored location (e.g. on logout). */
  clearLocation: () => void;
}

export const useGeoStore = create<GeoState>()(
  persist(
    (set, get) => ({
      location: null,

      setLocation: (lat, lng, label = "Selected location") =>
        set({
          location: {
            lat,
            lng,
            label,
            capturedAt: Date.now(),
          },
        }),

      isExpired: () => {
        const { location } = get();
        if (!location) return true;
        return Date.now() - location.capturedAt > GEO_TTL_MS;
      },

      clearLocation: () => set({ location: null }),
    }),
    { name: "taambeit-geo" },
  ),
);
