import api from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveDeliveryResponse {
  deliveryTrackingId: string;
  orderId: string;
  status: "Assigned" | "PickedUp" | "Delivered";
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string | null;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffAddress: string | null;
  acceptedAt: string;
  pickedUpAt: string | null;
}

export interface AvailableOrderItem {
  mealName: string;
  variantName: string;
  quantity: number;
  lineTotal: number;
  currency: string;
  mealImageUrl: string | null;
}

export interface AvailableOrder {
  orderId: string;
  chefName: string;
  pickupAddress: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string | null;
  dropoffLatitude: number;
  dropoffLongitude: number;
  total: number;
  currency: string;
  items: AvailableOrderItem[];
  readyAt: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const deliveryApi = {
  getActive: () =>
    api
      .get<ActiveDeliveryResponse>("/delivery/jobs/active")
      .then((r) => r.data),

  getAvailable: (lat: number, lng: number) =>
    api
      .get<AvailableOrder[]>("/delivery/jobs/available", {
        params: { latitude: lat, longitude: lng },
      })
      .then((r) => r.data),

  accept: (orderId: string) =>
    api.post(`/delivery/jobs/${orderId}/accept`).then((r) => r.data),

  markPickedUp: (deliveryTrackingId: string) =>
    api
      .put(`/delivery/jobs/${deliveryTrackingId}/picked-up`)
      .then((r) => r.data),

  markDelivered: (deliveryTrackingId: string) =>
    api
      .put(`/delivery/jobs/${deliveryTrackingId}/delivered`)
      .then((r) => r.data),
};
