/**
 * GeoGuard
 *
 * Wrap any page/section that requires the customer's location.
 * If the stored geo is missing or older than 30 minutes the modal opens
 * automatically. Children are rendered only once a valid location exists.
 *
 * Usage:
 *   <GeoGuard>
 *     <MenuPage />
 *   </GeoGuard>
 *
 * Or with a fallback while the user hasn't confirmed yet:
 *   <GeoGuard fallback={<FullPageSpinner />}>
 *     ...
 *   </GeoGuard>
 */

import { useEffect, useState } from 'react'
import { useGeoStore } from '@/store/geo.store'
import LocationPickerModal from '@/components/ui/LocationPickerModal'

interface GeoGuardProps {
  children: React.ReactNode
  /** Rendered while the picker modal is open and no valid location is stored. */
  fallback?: React.ReactNode
}

export default function GeoGuard({ children, fallback }: GeoGuardProps) {
  const { location, isExpired, setLocation } = useGeoStore()

  // Open the picker if location is absent / expired on first render.
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (isExpired()) {
      setPickerOpen(true)
    }
  // We intentionally run this only once on mount — if the user navigates back
  // after updating their location the store will reflect the fresh value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirm = (lat: number, lng: number, label?: string) => {
    setLocation(lat, lng, label)
    setPickerOpen(false)
  }

  const hasValidLocation = location && !isExpired()

  return (
    <>
      {/* Always mount the modal so it can animate in */}
      <LocationPickerModal
        isOpen={pickerOpen}
        onClose={() => {
          // If user dismisses without picking we keep the modal closed,
          // but children won't render until a valid location is stored.
          setPickerOpen(false)
        }}
        onConfirm={handleConfirm}
      />

      {/* Show children once we have a valid location; otherwise the fallback */}
      {hasValidLocation ? children : (fallback ?? null)}
    </>
  )
}
