import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'https://ugel-1bb.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('user_data')
        window.location.href = '/auth'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_URL}/api/usuarios/refresh`, {
          refresh_token: refreshToken
        })
        const { access_token, refresh_token } = response.data
        localStorage.setItem('access_token', access_token)
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token)
        }
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('user_data')
        window.location.href = '/auth'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export const personalApi = {
  list: (search?: string, page = 1, limit = 20, sortBy = 'apellidos', sortOrder = 'asc') => 
    api.get('/api/personal', { params: { search, page, limit, sort_by: sortBy, sort_order: sortOrder } }),
  buscar: (q: string, limit = 10) => api.get('/api/personal/buscar', { params: { q, limit } }),
  get: (id: number) => api.get(`/api/personal/${id}`),
  create: (data: any) => api.post('/api/personal', data),
  update: (id: number, data: any) => api.put(`/api/personal/${id}`, data),
  delete: (id: number) => api.delete(`/api/personal/${id}`),
  getPeriodos: (id: number) => api.get(`/api/personal/${id}/periodos`),
  exportar: (id: number, mes?: number, anio?: number) => 
    api.get(`/api/personal/${id}/exportar`, { params: { mes, anio } }),
}

export const planillasApi = {
  list: (mes?: number, anio?: number, page = 1, limit = 20, search?: string, sortBy = 'anio', sortOrder = 'desc') => 
    api.get('/api/planillas', { params: { mes, anio, page, limit, search, sort_by: sortBy, sort_order: sortOrder } }),
  get: (id: number) => api.get(`/api/planillas/${id}`),
  create: (data: any) => api.post('/api/planillas', data),
  update: (id: number, data: any) => api.put(`/api/planillas/${id}`, data),
  delete: (id: number) => api.delete(`/api/planillas/${id}`),
}

export const ingresosApi = {
  create: (data: any) => api.post('/api/ingresos', data),
  update: (id: number, data: any) => api.put(`/api/ingresos/${id}`, data),
  delete: (id: number) => api.delete(`/api/ingresos/${id}`),
}

export const descuentosApi = {
  create: (data: any) => api.post('/api/descuentos', data),
  update: (id: number, data: any) => api.put(`/api/descuentos/${id}`, data),
  delete: (id: number) => api.delete(`/api/descuentos/${id}`),
}

export const dashboardApi = {
  getResumen: () => api.get('/api/dashboard/resumen'),
}

export const PYTHON_URL = import.meta.env.VITE_PYTHON_URL || 'https://ugel-1a.onrender.com'

export const importarApi = {
  excel: (file: File, mes: number, anio: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mes', String(mes))
    formData.append('anio', String(anio))
    return fetch(`${PYTHON_URL}/process-excel`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json())
  },
}

export default api
