import api from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Rejected"
  | "Preparing"
  | "ReadyForPickup"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled";

export interface SelectedSideDishSnapshot {
  name: string;
  price: number;
  currency: string;
}

export interface SelectedToppingSnapshot {
  name: string;
  price: number;
  currency: string;
}

export interface OrderItemResponse {
  orderItemId: string;
  mealId: string;
  mealName: string;
  variantName: string;
  variantPrice: number;
  currency: string;
  quantity: number;
  lineTotal: number;
  sideDishes: SelectedSideDishSnapshot[];
  toppings: SelectedToppingSnapshot[];
}

export interface ChefOrderResponse {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  items: OrderItemResponse[];
}

export interface PlaceOrderItem {
  mealId: string;
  mealVariantId: string;
  quantity: number;
  selectedSideDishIds: string[];
  selectedToppingOptionIds: string[];
}

export interface PlaceOrderPayload {
  chefId: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddressLine: string;
  /** 0 = Card, 1 = CashOnDelivery */
  paymentMethod: 0 | 1;
  items: PlaceOrderItem[];
}

// ── API ───────────────────────────────────────────────────────────────────────

export const ordersApi = {
  // Chef order management
  getChefOrders: (status?: OrderStatus, page = 1) =>
    api
      .get<ChefOrderResponse[]>("/chef/orders", {
        params: { status, page, pageSize: 30 },
      })
      .then((r) => r.data),

  confirm: (orderId: string) => api.put(`/chef/orders/${orderId}/confirm`),

  reject: (orderId: string, reason: string) =>
    api.put(`/chef/orders/${orderId}/reject`, reason, {
      headers: { "Content-Type": "application/json" },
    }),

  startPreparing: (orderId: string) =>
    api.put(`/chef/orders/${orderId}/start-preparing`),

  markReadyForPickup: (orderId: string) =>
    api.put(`/chef/orders/${orderId}/ready-for-pickup`),

  // Customer order placement
  place: (payload: PlaceOrderPayload) =>
    api
      .post<{ orderId: string }>("/customer/orders", payload)
      .then((r) => r.data),
};
