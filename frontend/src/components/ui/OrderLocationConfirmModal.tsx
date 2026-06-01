/**
 * OrderLocationConfirmModal
 *
 * Shown at order-placement time when the stored geo is older than 30 minutes.
 * The customer must re-confirm their current location before the order can be
 * submitted (they may have moved since they first browsed the menu).
 *
 * Props:
 *   isOpen      – controlled open state
 *   onConfirmed – called once the user successfully picks a (fresh) location
 *   onClose     – called if the user dismisses the modal without confirming
 */

import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useGeoStore } from '@/store/geo.store'
import LocationPickerModal from '@/components/ui/LocationPickerModal'
import { useState } from 'react'

interface OrderLocationConfirmModalProps {
  isOpen: boolean
  onConfirmed: () => void
  onClose: () => void
}

export default function OrderLocationConfirmModal({
  isOpen,
  onConfirmed,
  onClose,
}: OrderLocationConfirmModalProps) {
  const { setLocation } = useGeoStore()
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!isOpen) return null

  const handleConfirmLocation = (lat: number, lng: number, label?: string) => {
    setLocation(lat, lng, label)
    setPickerOpen(false)
    onConfirmed()
  }

  return createPortal(
    <>
      {/* Stale-location warning card */}
      {!pickerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-[fadeIn_0.2s_ease]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.25s_ease]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-[--text-primary]">
                      Confirm your location
                    </h2>
                    <p className="text-sm text-[--text-muted] mt-0.5 leading-snug">
                      It's been over 30 minutes since you set your delivery
                      location. Please confirm you're still in the same spot
                      before we place your order.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-[--text-muted] shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex flex-col gap-3">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  Update my location
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-sm font-medium text-[--text-muted] hover:text-[--text-primary] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
          `}</style>
        </>
      )}

      {/* Reuse the same LocationPickerModal the rest of the app uses */}
      <LocationPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleConfirmLocation}
      />
    </>,
    document.body
  )
}
