import api from './client'

export interface RegisterPayload {
  email: string
  firstName: string
  lastName: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  userId: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/users/register', payload).then(r => r.data),

  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/users/login', payload).then(r => r.data),

  logout: () =>
    api.post('/users/logout'),
}
