import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from '@/components/layout/Navbar'
import LandingPage from '@/features/customer/LandingPage'

// Lazy-loaded pages (stubs — filled in subsequent sections)
import { Suspense, lazy } from 'react'

const MenuPage        = lazy(() => import('@/features/customer/MenuPage'))
const ChefPage        = lazy(() => import('@/features/customer/ChefPage'))
const MealDetailPage  = lazy(() => import('@/features/customer/MealDetailPage'))
const LoginPage       = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage    = lazy(() => import('@/features/auth/RegisterPage'))
const CartPage        = lazy(() => import('@/features/customer/CartPage'))
const CheckoutPage    = lazy(() => import('@/features/customer/CheckoutPage'))
const OrderTrackPage  = lazy(() => import('@/features/customer/OrderTrackPage'))
const ChefDashboard   = lazy(() => import('@/features/chef/ChefDashboard'))
const DeliveryDash    = lazy(() => import('@/features/delivery/DeliveryDashboard'))
const SupervisorDash  = lazy(() => import('@/features/supervisor/SupervisorDashboard'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
})

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
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
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes with Navbar */}
          <Route element={<PublicLayout />}>
            <Route path="/"             element={<LandingPage />} />
            <Route path="/menu"         element={<MenuPage />} />
            <Route path="/chef/:id"     element={<ChefPage />} />
            <Route path="/meal/:id"     element={<MealDetailPage />} />
            <Route path="/cart"         element={<CartPage />} />
            <Route path="/order/:id/track" element={<OrderTrackPage />} />
            <Route path="/checkout"         element={<CheckoutPage />} />
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/register"     element={<RegisterPage />} />
          </Route>

          {/* Dashboard routes (no public Navbar) */}
          <Route path="/chef/*"       element={<ChefDashboard />} />
          <Route path="/delivery/*"   element={<DeliveryDash />} />
          <Route path="/supervisor/*" element={<SupervisorDash />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
