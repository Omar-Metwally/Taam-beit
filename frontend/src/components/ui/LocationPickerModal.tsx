import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Locate, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Alexandria, Egypt — default center
const DEFAULT_LAT = 31.2001
const DEFAULT_LNG = 29.9187
const DEFAULT_ZOOM = 13

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (lat: number, lng: number, label?: string) => void
}

// Lazy-load Leaflet only when the modal opens
async function loadLeaflet() {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  // Fix the broken default icon paths that Vite/webpack break
  // @ts-ignore
  delete L.default.Icon.Default.prototype._getIconUrl
  L.default.Icon.Default.mergeOptions({
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })

  return L.default
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    // Return neighbourhood / suburb / road — whatever is most specific
    const a = data.address ?? {}
    return (
      a.neighbourhood ?? a.suburb ?? a.quarter ?? a.road ?? a.city_district ?? 'Selected location'
    )
  } catch {
    return 'Selected location'
  }
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef   = useRef<any>(null)

  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [label,    setLabel]    = useState<string>('')
  const [locating, setLocating] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // ── Init map when modal opens ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    let destroyed = false

    const init = async () => {
      // Wait one tick for the DOM node to be in the document
      await new Promise(r => setTimeout(r, 50))
      if (destroyed || !mapContainerRef.current) return

      const L = await loadLeaflet()
      if (destroyed || !mapContainerRef.current) return

      const map = L.map(mapContainerRef.current, {
        center:  [DEFAULT_LAT, DEFAULT_LNG],
        zoom:    DEFAULT_ZOOM,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Draggable marker — starts at center
      const marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], { draggable: true }).addTo(map)
      markerRef.current = marker
      mapRef.current    = map

      const updateFromMarker = async (lat: number, lng: number) => {
        setCoords({ lat, lng })
        setGeocoding(true)
        const lbl = await reverseGeocode(lat, lng)
        if (!destroyed) {
          setLabel(lbl)
          setGeocoding(false)
        }
      }

      // Set initial coords from default center
      updateFromMarker(DEFAULT_LAT, DEFAULT_LNG)

      // Click anywhere on map moves marker
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng])
        updateFromMarker(e.latlng.lat, e.latlng.lng)
      })

      // Drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        updateFromMarker(pos.lat, pos.lng)
      })

      setMapReady(true)
    }

    init()

    return () => {
      destroyed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current  = null
        markerRef.current = null
        setMapReady(false)
        setCoords(null)
        setLabel('')
      }
    }
  }, [isOpen])

  // ── GPS detect ─────────────────────────────────────────────────────────────
  const handleDetect = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocating(false)
        setCoords({ lat, lng })

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 16, { animate: true })
          markerRef.current.setLatLng([lat, lng])
        }

        setGeocoding(true)
        const lbl = await reverseGeocode(lat, lng)
        setLabel(lbl)
        setGeocoding(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }, [])

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!coords) return
    onConfirm(coords.lat, coords.lng, label)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-[fadeIn_0.2s_ease]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[--text-primary]">
                Where should we deliver?
              </h2>
              <p className="text-sm text-[--text-muted] mt-0.5">
                Drop the pin on your location or use GPS
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[--text-muted]"
            >
              <X size={16} />
            </button>
          </div>

          {/* GPS button */}
          <div className="px-6 pb-3">
            <button
              onClick={handleDetect}
              disabled={locating}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-semibold',
                locating
                  ? 'border-brand-300 bg-brand-50 text-brand-400 cursor-wait'
                  : 'border-brand-500 text-brand-600 hover:bg-brand-50 active:bg-brand-100'
              )}
            >
              <Locate size={18} className={cn('shrink-0', locating && 'animate-spin')} />
              {locating ? 'Detecting your location…' : 'Use my current location (GPS)'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-6 pb-3">
            <div className="flex-1 h-px bg-[--border]" />
            <span className="text-xs text-[--text-muted] font-medium">or drop a pin</span>
            <div className="flex-1 h-px bg-[--border]" />
          </div>

          {/* Map */}
          <div className="px-6 pb-4">
            <div className="relative rounded-2xl overflow-hidden border border-[--border]" style={{ height: 280 }}>
              <div ref={mapContainerRef} className="w-full h-full" />
              {!mapReady && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-[--text-muted] mt-2 text-center">
              Tap the map or drag the pin to adjust your location
            </p>
          </div>

          {/* Selected location label */}
          {coords && (
            <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 bg-brand-50 border border-brand-100 rounded-2xl">
              <MapPin size={16} className="text-brand-500 shrink-0" />
              <span className="text-sm text-[--text-primary] font-medium flex-1 truncate">
                {geocoding ? (
                  <span className="text-[--text-muted]">Looking up address…</span>
                ) : (
                  label || 'Selected location'
                )}
              </span>
              <CheckCircle size={16} className="text-brand-500 shrink-0" />
            </div>
          )}

          {/* Confirm */}
          <div className="px-6 pb-6">
            <button
              onClick={handleConfirm}
              disabled={!coords || geocoding}
              className="btn-primary w-full py-3.5 text-base disabled:opacity-40"
            >
              Find Chefs Near Me
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>,
    document.body
  )
}
