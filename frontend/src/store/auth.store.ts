import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'Customer' | 'Chef' | 'DeliveryMan' | 'Supervisor'

interface AuthState {
  userId: string | null
  roles: UserRole[]
  isAuthenticated: boolean
  setAuth: (userId: string, roles: UserRole[]) => void
  clearAuth: () => void
  hasRole: (role: UserRole) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      roles: [],
      isAuthenticated: false,

      setAuth: (userId, roles) =>
        set({ userId, roles, isAuthenticated: true }),

      clearAuth: () =>
        set({ userId: null, roles: [], isAuthenticated: false }),

      hasRole: (role) => get().roles.includes(role),
    }),
    { name: 'taambeit-auth' }
  )
)
