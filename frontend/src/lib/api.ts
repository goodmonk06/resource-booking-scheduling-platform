import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// API client methods
export const apiClient = {
  // Resources
  getResources: (groupId?: string) =>
    api.get('/resources', { params: { groupId } }),
  getResource: (id: string) => api.get(`/resources/${id}`),

  // Resource Groups
  getResourceGroups: (tenantId?: string) =>
    api.get('/resource-groups', { params: { tenantId } }),

  // Availability
  getAvailableSlots: (
    resourceId: string,
    startDate: string,
    endDate: string,
    duration: number,
    interval?: number,
  ) =>
    api.get(`/availability/slots/${resourceId}`, {
      params: { startDate, endDate, duration, interval },
    }),

  checkAvailability: (
    resourceId: string,
    startsAt: string,
    endsAt: string,
  ) =>
    api.post('/availability/check', { resourceId, startsAt, endsAt }),

  // Reservations
  createReservation: (data: {
    resourceId: string
    userId?: string
    startsAt: string
    endsAt: string
    metaJson?: any
  }) => api.post('/reservations', data),

  getReservations: (params?: {
    resourceId?: string
    userId?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => api.get('/reservations', { params }),

  getReservation: (id: string) => api.get(`/reservations/${id}`),

  confirmReservation: (id: string, stripePaymentId?: string) =>
    api.post(`/reservations/${id}/confirm`, { stripePaymentId }),

  cancelReservation: (id: string, cancellationNote?: string) =>
    api.post(`/reservations/${id}/cancel`, { cancellationNote }),

  // Opening Hours
  getOpeningHours: (resourceId?: string, groupId?: string) =>
    api.get('/opening-hours', { params: { resourceId, groupId } }),

  getResourceOpeningHours: (resourceId: string) =>
    api.get(`/opening-hours/resource/${resourceId}`),

  createOpeningHours: (data: {
    resourceId?: string
    groupId?: string
    weekday: number
    startTime: string
    endTime: string
  }) => api.post('/opening-hours', data),

  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string
    password: string
    name: string
    tenantId: string
  }) => api.post('/auth/register', data),

  // Payments
  createPaymentIntent: (reservationId: string, amount: number) =>
    api.post('/payments/create-payment-intent', { reservationId, amount }),
}
