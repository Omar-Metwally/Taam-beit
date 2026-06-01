import api from './client'
import type { ProfileStatus, VehicleType } from './supervisor'

// ── Response shapes (mirrors backend DTOs) ───────────────────────────────────

export interface ChefProfileResponse {
  status: ProfileStatus
  avatarSmallUrl: string | null   // baseKey + '-sm.webp', resolved by the server
  avatarLargeUrl: string | null   // baseKey + '-lg.webp', resolved by the server
  operationLocationAddress: string
  latitude: number
  longitude: number
  hasHealthCertificate: boolean
  hasPersonalId: boolean
  rejectionReason: string | null
  appliedAt: string
  reviewedAt: string | null
}

export interface DeliveryManProfileResponse {
  status: ProfileStatus
  vehicleType: VehicleType
  personalIdNumber: string
  currentLatitude: number | null
  currentLongitude: number | null
  rejectionReason: string | null
  appliedAt: string
  reviewedAt: string | null
}

export interface MeResponse {
  userId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  chefProfile: ChefProfileResponse | null
  deliveryManProfile: DeliveryManProfileResponse | null
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const meApi = {
  /** Fetch the authenticated user's full profile. */
  getProfile: () =>
    api.get<MeResponse>('/me').then((r) => r.data),
}
