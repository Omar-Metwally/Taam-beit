import api from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileStatus = 'Pending' | 'Approved' | 'Rejected'

export type VehicleType = 'Bike' | 'Motorcycle' | 'Car'

export interface ChefApplication {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  operationLocationAddress: string
  latitude: number
  longitude: number
  status: ProfileStatus
  rejectionReason: string | null
  hasHealthCertificate: boolean
  hasPersonalId: boolean
  appliedAt: string
  reviewedAt: string | null
  reviewedByUserId: string | null
}

export interface DeliveryManApplication {
  userId: string
  fullName: string
  email: string
  personalIdNumber: string
  vehicleType: VehicleType
  latitude: number | null
  longitude: number | null
  status: ProfileStatus
  rejectionReason: string | null
  appliedAt: string
  reviewedAt: string | null
  reviewedByUserId: string | null
}

// ── API ───────────────────────────────────────────────────────────────────────

export const supervisorApi = {
  // Chef applications
  getChefs: (status?: ProfileStatus) =>
    api
      .get<ChefApplication[]>('/supervisor/chef-applications', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),

  getChefDocumentUrl: (userId: string, documentType: 0 | 1) =>
    api
      .get<string>(`/supervisor/chef-documents/${userId}`, {
        params: { documentType },
      })
      .then((r) => r.data),

  approveChef: (userId: string) =>
    api
      .put(`/supervisor/chef-applications/${userId}/approve`)
      .then((r) => r.data),

  rejectChef: (userId: string, reason: string) =>
    api
      .put(
        `/supervisor/chef-applications/${userId}/reject`,
        JSON.stringify(reason),
        { headers: { 'Content-Type': 'application/json' } },
      )
      .then((r) => r.data),

  // Delivery man applications
  getDeliveryMen: (status?: ProfileStatus) =>
    api
      .get<DeliveryManApplication[]>('/supervisor/delivery-man-applications', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),

  approveDeliveryMan: (userId: string) =>
    api
      .put(`/supervisor/delivery-man-applications/${userId}/approve`)
      .then((r) => r.data),

  rejectDeliveryMan: (userId: string, reason: string) =>
    api
      .put(
        `/supervisor/delivery-man-applications/${userId}/reject`,
        JSON.stringify(reason),
        { headers: { 'Content-Type': 'application/json' } },
      )
      .then((r) => r.data),
}
