import { lazy } from "react";

const SupervisorChefsPage = lazy(() => import("./ChefsPage"));
const SupervisorDeliverymanPage = lazy(
  () => import("./DeliveryManApplicationsPage"),
);

export const supervisorRoutes = [
  { index: true, element: <SupervisorChefsPage /> },
  { path: "deliverymen", element: <SupervisorDeliverymanPage /> },
  {
    path: "orders",
    element: (
      <div className="p-8 text-[--text-muted]">Orders — coming soon</div>
    ),
  },
  {
    path: "analytics",
    element: (
      <div className="p-8 text-[--text-muted]">Analytics — coming soon</div>
    ),
  },
  {
    path: "verification",
    element: (
      <div className="p-8 text-[--text-muted]">Verification — coming soon</div>
    ),
  },
  {
    path: "notifications",
    element: (
      <div className="p-8 text-[--text-muted]">Notifications — coming soon</div>
    ),
  },
  {
    path: "help",
    element: (
      <div className="p-8 text-[--text-muted]">Help Center — coming soon</div>
    ),
  },
];
