import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // always send HttpOnly cookie
  headers: { 'Content-Type': 'application/json' },
})

// Global response interceptor — redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
