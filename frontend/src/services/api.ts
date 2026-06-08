import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

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

export const importarApi = {
  excel: (file: File, mes: number, anio: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mes', String(mes))
    formData.append('anio', String(anio))
    return api.post('/api/importar/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

export default api