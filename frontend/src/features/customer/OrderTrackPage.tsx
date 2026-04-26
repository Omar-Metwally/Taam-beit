import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Phone, MessageSquare, DollarSign, ChevronRight, MapPin, Clock, FileText, X } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@/api/client'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'ReadyForPickup'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected'

interface OrderDetail {
  orderId: string
  status: OrderStatus
  chefId: string
  deliveryManId: string | null
  deliveryLocation: { latitude: number; longitude: number; addressLine: string | null }
  createdAt: string
  items: Array<{
    mealName: string
    variantName: string
    quantity: number
    lineTotal: number
    currency: string
    mealImageUrl: string | null
  }>
  total: number
  currency: string
}

interface DriverPosition {
  latitude: number
  longitude: number
  heading: number | null
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  title: string
  subtitle: string
  illustration: string
  showMap: boolean
  showCancel: boolean
  progressFill: number // 0-100
}> = {
  Pending: {
    title: "Awaiting chef's approval...",
    subtitle: 'Approval Est. time · 15 - 20 minutes',
    illustration: '👩‍💻',
    showMap: false,
    showCancel: true,
    progressFill: 20,
  },
  Confirmed: {
    title: 'Order confirmed!',
    subtitle: 'The chef will start preparing your order shortly',
    illustration: '✅',
    showMap: false,
    showCancel: true,
    progressFill: 35,
  },
  Preparing: {
    title: 'Preparing your order...',
    subtitle: 'Arriving at 5:00 PM',
    illustration: '👨‍🍳',
    showMap: false,
    showCancel: false,
    progressFill: 55,
  },
  ReadyForPickup: {
    title: 'Picking up your order...',
    subtitle: 'A delivery man is on their way to the chef',
    illustration: '🛵',
    showMap: true,
    showCancel: false,
    progressFill: 70,
  },
  OutForDelivery: {
    title: 'Heading your way...',
    subtitle: 'Your order is on its way!',
    illustration: '🗺',
    showMap: true,
    showCancel: false,
    progressFill: 85,
  },
  Delivered: {
    title: 'Order Delivered!',
    subtitle: 'Enjoy your Meal!',
    illustration: '🎉',
    showMap: false,
    showCancel: false,
    progressFill: 100,
  },
  Cancelled: {
    title: 'Order Cancelled',
    subtitle: 'Your order has been cancelled',
    illustration: '❌',
    showMap: false,
    showCancel: false,
    progressFill: 0,
  },
  Rejected: {
    title: 'Order Rejected',
    subtitle: 'The chef was unable to accept your order',
    illustration: '😔',
    showMap: false,
    showCancel: false,
    progressFill: 0,
  },
}

// ── Fix Leaflet default icon ──────────────────────────────────────────────────

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#2D7A2D;border:3px solid white;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🛵</div>`,
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
})

const destIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#e53e3e;border:3px solid white;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>`,
  iconSize:   [36, 36],
  iconAnchor: [18, 36],
})

// ── Map component that tracks driver ─────────────────────────────────────────

function LiveMap({
  driverPos,
  destination,
}: {
  driverPos: DriverPosition | null
  destination: { latitude: number; longitude: number }
}) {
  return (
    <MapContainer
      center={[destination.latitude, destination.longitude]}
      zoom={14}
      className="w-full h-full rounded-2xl z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Destination marker */}
      <Marker
        position={[destination.latitude, destination.longitude]}
        icon={destIcon}
      >
        <Popup>Your delivery address</Popup>
      </Marker>

      {/* Driver marker — moves as SignalR pushes updates */}
      {driverPos && (
        <Marker
          position={[driverPos.latitude, driverPos.longitude]}
          icon={driverIcon}
        >
          <Popup>Your delivery man</Popup>
        </Marker>
      )}
    </MapContainer>
  )
}

// ── Status progress bar ───────────────────────────────────────────────────────

function ProgressBar({ fill }: { fill: number }) {
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-brand-500 rounded-full transition-all duration-1000"
        style={{ width: `${fill}%` }}
      />
    </div>
  )
}

// ── Illustration component ────────────────────────────────────────────────────

function StatusIllustration({ status }: { status: OrderStatus }) {
  const illustrations: Record<string, string> = {
    Pending:        'https://illustrations.popsy.co/gray/remote-work.svg',
    Confirmed:      'https://illustrations.popsy.co/gray/success.svg',
    Preparing:      'https://illustrations.popsy.co/gray/chef.svg',
    ReadyForPickup: 'https://illustrations.popsy.co/gray/delivery.svg',
    Delivered:      'https://illustrations.popsy.co/gray/celebration.svg',
  }

  const emoji = STATUS_CONFIG[status]?.illustration ?? '📦'
  const img   = illustrations[status]

  if (img) {
    return (
      <img
        src={img}
        alt={status}
        className="w-full max-w-xs mx-auto h-48 object-contain mb-6"
        onError={() => {}} // fallback handled by alt emoji
      />
    )
  }

  return (
    <div className="text-8xl text-center mb-6">{emoji}</div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrderTrackPage() {
  const { id }   = useParams<{ id: string }>()
  const [status, setStatus] = useState<OrderStatus>('Pending')
  const [driverPos, setDriverPos] = useState<DriverPosition | null>(null)
  const [showItems, setShowItems] = useState(false)
  const hubRef = useRef<signalR.HubConnection | null>(null)

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => api.get<OrderDetail>(`/orders/${id}`).then(r => r.data),
    enabled:  !!id,
    refetchInterval: 15000, // poll every 15s as fallback
  })

  // Sync status from API
  useEffect(() => {
    if (order?.status) setStatus(order.status as OrderStatus)
  }, [order?.status])

  // SignalR — join order group + listen for status + driver location
  useEffect(() => {
    if (!id) return

    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/delivery')
      .withAutomaticReconnect()
      .build()

    hub.on('OrderStatusChanged', (payload: { orderId: string; newStatus: string }) => {
      if (payload.orderId === id)
        setStatus(payload.newStatus as OrderStatus)
    })

    hub.on('DriverLocationUpdated', (payload: {
      orderId: string; latitude: number; longitude: number; heading: number | null
    }) => {
      if (payload.orderId === id)
        setDriverPos({ latitude: payload.latitude, longitude: payload.longitude, heading: payload.heading })
    })

    hub.start().then(() => {
      hub.invoke('TrackOrder', id).catch(console.error)
    }).catch(console.error)

    hubRef.current = hub

    return () => {
      hub.invoke('StopTrackingOrder', id).catch(() => {})
      hub.stop()
    }
  }, [id])

  const config   = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending
  const showMap  = config.showMap
  const destination = order?.deliveryLocation ?? { latitude: 30.0444, longitude: 31.2357 }

  const handleCancel = async () => {
    if (!id) return
    await api.delete(`/orders/${id}`, { data: { reason: 'Cancelled by customer' } })
    setStatus('Cancelled')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/menu?lat=30.0444&lng=31.2357"
            className="text-[--text-muted] hover:text-brand-500 transition-colors">
            <X size={22} />
          </Link>
          <button className="text-sm font-medium text-[--text-primary] hover:text-brand-500 transition-colors">
            Help
          </button>
        </div>

        {/* Status title */}
        <h1 className="font-display text-2xl font-bold text-[--text-primary] mb-1">
          {config.title}
        </h1>
        <p className="text-sm text-[--text-muted] mb-4">{config.subtitle}</p>

        {/* Progress bar */}
        <ProgressBar fill={config.progressFill} />

        {/* Map or illustration */}
        <div className={cn(
          'rounded-2xl overflow-hidden mb-6',
          showMap ? 'h-64' : 'bg-white border border-[--border] p-4'
        )}>
          {showMap ? (
            <LiveMap driverPos={driverPos} destination={destination} />
          ) : (
            <StatusIllustration status={status} />
          )}
        </div>

        {/* Driver info (when map is shown) */}
        {showMap && order?.deliveryManId && (
          <div className="bg-white rounded-2xl border border-[--border] p-4 mb-4">
            <p className="font-semibold text-[--text-primary] mb-1">
              Ahmed is Delivering your order!
            </p>
            <button className="text-brand-500 text-sm font-medium hover:underline mb-3">
              View profile
            </button>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 border border-[--border] rounded-xl py-2.5 text-sm font-medium hover:border-brand-400 transition-colors">
                <Phone size={15} /> Call
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 border border-[--border] rounded-xl py-2.5 text-sm font-medium hover:border-brand-400 transition-colors">
                <MessageSquare size={15} /> Send a message
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 border border-[--border] rounded-xl py-2.5 text-sm font-medium hover:border-brand-400 transition-colors">
                <DollarSign size={15} /> Tip
              </button>
            </div>
          </div>
        )}

        {/* Delivery details */}
        <div className="bg-white rounded-2xl border border-[--border] p-4 mb-4">
          <h3 className="font-semibold text-[--text-primary] mb-3">Delivery Details</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-[--text-muted]">
              <Clock size={15} />
              <span>Today by 5:00 PM</span>
            </div>
            {order?.deliveryLocation?.addressLine && (
              <div className="flex items-center gap-2 text-[--text-muted]">
                <MapPin size={15} />
                <span>{order.deliveryLocation.addressLine}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[--text-muted]">
              <FileText size={15} />
              <span>Try to deliver urgently please</span>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-[--border] p-4 mb-4">
          <button
            onClick={() => setShowItems(s => !s)}
            className="w-full flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-[--text-primary] text-left">Order Details</h3>
              <p className="text-xs text-[--text-muted]">
                {order?.items.length ?? 0} items · View your items
              </p>
            </div>
            <ChevronRight size={18} className={cn('text-[--text-muted] transition-transform', showItems && 'rotate-90')} />
          </button>

          {/* Item thumbnails */}
          {order?.items && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {order.items.slice(0, 4).map((item, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                  <img
                    src={item.mealImageUrl
                      ? `${import.meta.env.VITE_MINIO_PUBLIC_URL}/${item.mealImageUrl}-sm.webp`
                      : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=80&h=80&fit=crop'}
                    alt={item.mealName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {(order.items.length > 4) && (
                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                  +{order.items.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Expanded items */}
          {showItems && order?.items && (
            <div className="mt-4 border-t border-[--border] pt-4 flex flex-col gap-2 text-sm">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[--text-muted]">
                    {item.mealName} ({item.variantName}) x{item.quantity}
                  </span>
                  <span className="font-medium">{item.lineTotal} {item.currency}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-4 pt-3 border-t border-[--border]">
            <span className="font-semibold text-[--text-primary]">Total</span>
            <span className="font-bold text-[--text-primary]">
              {order?.total ?? 0} {order?.currency ?? 'EGP'}
            </span>
          </div>
        </div>

        {/* Cancel order */}
        {config.showCancel && (
          <button
            onClick={handleCancel}
            className="w-full py-3 text-center text-red-500 font-semibold text-sm hover:text-red-600 transition-colors border border-red-200 rounded-2xl hover:bg-red-50"
          >
            Cancel Order
          </button>
        )}
      </div>
    </main>
  )
}
