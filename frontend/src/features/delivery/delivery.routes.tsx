import { lazy } from 'react'

const AvailableOrdersPage = lazy(() => import('./AvailableOrdersPage'))
const ActiveDeliveryPage  = lazy(() => import('./ActiveDeliveryPage'))

export const deliveryRoutes = [
  { index: true,           element: <AvailableOrdersPage /> },
  { path: 'active',        element: <ActiveDeliveryPage /> },
  { path: 'notifications', element: <div className="p-8 text-[--text-muted]">Notifications — coming soon</div> },
  { path: 'help',          element: <div className="p-8 text-[--text-muted]">Help Center — coming soon</div> },
]
