import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ChefProfileResponse,
  DeliveryManProfileResponse,
  MeResponse,
} from '@/api/me'
import { meApi } from '@/api/me'

// ── State shape ───────────────────────────────────────────────────────────────

interface UserProfileState {
  // Core identity
  userId: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null

  // Role profiles — null when not applied yet
  chefProfile: ChefProfileResponse | null
  deliveryManProfile: DeliveryManProfileResponse | null

  // Async state
  isLoading: boolean
  error: string | null

  // Actions
  fetchProfile: () => Promise<void>
  setProfile: (data: MeResponse) => void
  clearProfile: () => void

  // Convenience helpers
  isApprovedChef: () => boolean
  isApprovedDeliveryMan: () => boolean
  avatarSmallUrl: () => string | null
  avatarLargeUrl: () => string | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      firstName: null,
      lastName: null,
      fullName: null,
      chefProfile: null,
      deliveryManProfile: null,
      isLoading: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await meApi.getProfile()
          get().setProfile(data)
        } catch {
          set({ error: 'Failed to load profile', isLoading: false })
        }
      },

      setProfile: (data) =>
        set({
          userId: data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: data.fullName,
          chefProfile: data.chefProfile,
          deliveryManProfile: data.deliveryManProfile,
          isLoading: false,
          error: null,
        }),

      clearProfile: () =>
        set({
          userId: null,
          email: null,
          firstName: null,
          lastName: null,
          fullName: null,
          chefProfile: null,
          deliveryManProfile: null,
          isLoading: false,
          error: null,
        }),

      // Derived helpers
      isApprovedChef: () => get().chefProfile?.status === 'Approved',
      isApprovedDeliveryMan: () => get().deliveryManProfile?.status === 'Approved',
      avatarSmallUrl: () => get().chefProfile?.avatarSmallUrl ?? null,
      avatarLargeUrl: () => get().chefProfile?.avatarLargeUrl ?? null,
    }),
    {
      name: 'taambeit-user',
      // Don't persist loading/error state
      partialize: (s) => ({
        userId: s.userId,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: s.fullName,
        chefProfile: s.chefProfile,
        deliveryManProfile: s.deliveryManProfile,
      }),
    },
  ),
)
