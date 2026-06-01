import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import LandingPage from "@/features/customer/LandingPage";

// Lazy-loaded pages (stubs — filled in subsequent sections)
import { Suspense, lazy } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import { chefRoutes } from "./features/chef/chef.routes";
import { supervisorRoutes } from "./features/supervisor/supervisor.routes";
import { deliveryRoutes } from "./features/delivery/delivery.routes";

const MenuPage = lazy(() => import("@/features/customer/MenuPage"));
const ChefPage = lazy(() => import("@/features/customer/ChefPage"));
const MealDetailPage = lazy(() => import("@/features/customer/MealDetailPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const CartPage = lazy(() => import("@/features/customer/CartPage"));
const CheckoutPage = lazy(() => import("@/features/customer/CheckoutPage"));
const OrderTrackPage = lazy(() => import("@/features/customer/OrderTrackPage"));
const CustomerOrdersPage = lazy(
  () => import("@/features/customer/CustomerOrdersPage"),
);

const CustomerProfilePage = lazy(
  () => import("@/features/customer/CustomerProfilePage"),
);
const ChefRegisterPage = lazy(() => import("@/features/auth/ChefRegisterPage"));
const DeliveryRegisterPage = lazy(
  () => import("@/features/auth/DeliveryManRegisterPage"),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/menu", element: <MenuPage /> },
      { path: "/orders", element: <CustomerOrdersPage /> },
      { path: "/profile", element: <CustomerProfilePage /> },
      { path: "/chef/:id", element: <ChefPage /> },
      { path: "/meal/:id", element: <MealDetailPage /> },
      { path: "/cart", element: <CartPage /> },
      { path: "/orders/:id/track", element: <OrderTrackPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/chef-signup", element: <ChefRegisterPage /> },
      { path: "/delivery-signup", element: <DeliveryRegisterPage /> },
    ],
  },
  {
    path: "/chef",
    element: <DashboardLayout role="chef" />,
    children: chefRoutes,
  },
  {
    path: "/delivery",
    element: <DashboardLayout role="delivery" />,
    children: deliveryRoutes,
  },
  {
    path: "/supervisor",
    element: <DashboardLayout role="supervisor" />,
    children: supervisorRoutes,
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
