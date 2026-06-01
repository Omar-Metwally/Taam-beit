import { lazy } from "react";
import ApplicationStatus from "./ApplicationStatus";
import ChefMenuDashboard from "./ChefMenuDashboard";
import ChefOrdersDashboard from "./ChefOrdersDashboard";
const CreateMealWizard = lazy(() => import("./CreateMealWizard"));
const EditMealForm = lazy(() => import("./EditMealForm"));

export const chefRoutes = [
  { index: true, element: <ApplicationStatus /> },
  {
    path: "profile",
    element: (
      <div className="p-8 text-[--text-muted]">Profile — coming soon</div>
    ),
  },
  { path: "menu", element: <ChefMenuDashboard /> },
  { path: "menu/create", element: <CreateMealWizard /> },
  {
    path: "menu/edit/:mealId",
    element: <EditMealForm />,
  },
  { path: "orders", element: <ChefOrdersDashboard /> },
  {
    path: "analytics",
    element: (
      <div className="p-8 text-[--text-muted]">Analytics — coming soon</div>
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
