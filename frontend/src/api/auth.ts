import { UserRole } from "@/store/auth.store";
import api from "./client";

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  roles: UserRole[];
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", payload).then((r) => r.data),

  refresh: () => api.get<AuthResponse>("/auth/refresh").then((r) => r.data),

  logout: () => api.post("/auth/logout").catch(() => undefined),
};
