import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useUserStore } from "./user.store";
import { authApi } from "@/api/auth";

export type UserRole = "Customer" | "Chef" | "DeliveryMan" | "Supervisor";

interface AuthState {
  userId: string | null;
  roles: UserRole[];
  isAuthenticated: boolean;

  /**
   * Called after a successful login or register.
   * Stores auth state and kicks off a profile fetch so the user store
   * is populated immediately without a separate round trip.
   */
  setAuth: (userId: string, roles: UserRole[]) => void;

  /** Clears both auth and user profile state on logout. */
  clearAuth: () => void;

  hasRole: (role: UserRole) => boolean;

  refreshAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      roles: [],
      isAuthenticated: false,

      setAuth: (userId, roles) => {
        set({ userId, roles, isAuthenticated: true });
        // Fetch full profile data right after auth succeeds
        useUserStore.getState().fetchProfile();
      },

      clearAuth: () => {
        set({ userId: null, roles: [], isAuthenticated: false });
        useUserStore.getState().clearProfile();
      },

      hasRole: (role) => get().roles.includes(role),

      refreshAuth: async () => {
        const res = await authApi.refresh();
        set({ userId: res.userId, roles: res.roles, isAuthenticated: true });
        useUserStore.getState().fetchProfile();
      },
    }),
    { name: "taambeit-auth" },
  ),
);
