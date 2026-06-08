import { useEffect, useState } from 'react'
import { planillasApi, personalApi, API_URL } from '../services/api'
import { Plus, Trash2, X, Eye, FileSpreadsheet, DollarSign, ArrowDownToLine, ArrowUpFromLine, User, Calendar, ChevronLeft, ChevronRight, Search, Loader2, Pencil, AlertCircle, Check, Filter, TrendingUp, Receipt } from 'lucide-react'

interface Personal {
  id: number
  dni: string
  nombres: string
  apellidos: string
  puesto?: string
  colegio?: string
  distrito?: string
}

interface Planilla {
  id: number
  personal_id: number
  personal: Personal
  mes: number
  anio: number
  total_haberes: number
  total_descuentos: number
  total_liquido: number
}

interface Ingreso {
  id: number
  tipo: string
  monto: number
}

interface Descuento {
  id: number
  tipo: string
  monto: number
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const ANIOS = Array.from({ length: new Date().getFullYear() - 1990 }, (_, i) => 1991 + i).reverse()

export default function Planillas() {
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio] = useState<number>(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [detailPlanilla, setDetailPlanilla] = useState<any>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editPlanilla, setEditPlanilla] = useState<any>(null)
  const [form, setForm] = useState({ personal_id: 0, mes: mes, anio: anio })
  const [ingresoForm, setIngresoForm] = useState({ tipo: '', monto: '' })
  const [descuentoForm, setDescuentoForm] = useState({ tipo: '', monto: '' })
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [searchEmpleado, setSearchEmpleado] = useState('')
  const [searchResults, setSearchResults] = useState<Personal[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNewEmpleado, setShowNewEmpleado] = useState(false)
  const [newEmpleadoForm, setNewEmpleadoForm] = useState({ dni: '', nombres: '', apellidos: '' })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    loadData()
  }, [mes, anio, page, debouncedSearch])

  const loadData = () => {
    setLoading(true)
    const searchMode = searchTerm.trim().length > 0
    planillasApi.list(
      searchMode ? undefined : mes,
      searchMode ? undefined : anio,
      page,
      20,
      searchTerm || undefined,
      'anio',
      'desc'
    )
      .then((res: { data: { data: Planilla[], total: number, total_pages: number } }) => {
        setPlanillas(res.data.data)
        setTotal(res.data.total)
        setTotalPages(res.data.total_pages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const searchEmpleados = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await personalApi.buscar(query)
      setSearchResults(res.data.data || [])
    } catch (e) {
      console.error(e)
    }
    setSearching(false)
  }

  const selectEmpleado = (p: Personal) => {
    setForm({ ...form, personal_id: p.id })
    setSearchEmpleado(`${p.apellidos} ${p.nombres} ${p.dni ? `(${p.dni})` : ''}`)
    setShowSearchResults(false)
  }

  const createAndSelectEmpleado = async () => {
    if (!newEmpleadoForm.nombres.trim() || !newEmpleadoForm.apellidos.trim()) {
      return
    }
    try {
      const res = await personalApi.create(newEmpleadoForm)
      const created = res.data
      setForm({ ...form, personal_id: created.id })
      setSearchEmpleado(`${created.apellidos} ${created.nombres} ${created.dni ? `(${created.dni})` : ''}`)
      setShowNewEmpleado(false)
      setNewEmpleadoForm({ dni: '', nombres: '', apellidos: '' })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.personal_id) {
      setError('Selecciona un empleado')
      return
    }

    try {
      await planillasApi.create(form)
      setShowModal(false)
      setForm({ personal_id: 0, mes, anio })
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta planilla?')) {
      await planillasApi.delete(id)
      loadData()
    }
  }

  const handleEdit = async (id: number) => {
    const res = await planillasApi.get(id)
    setEditPlanilla(res.data)
    setShowEdit(true)
  }

  const saveEdit = async () => {
    if (!editPlanilla) return
    try {
      await fetch(`${API_URL}/api/planillas/${editPlanilla.id}/editar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal_id: editPlanilla.personal_id,
          mes: editPlanilla.mes,
          anio: editPlanilla.anio,
          ingresos: editPlanilla.ingresos,
          descuentos: editPlanilla.descuentos
        })
      })
      setShowEdit(false)
      setEditPlanilla(null)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar')
    }
  }

  const deleteIngresoEdit = (id: number) => {
    if (!editPlanilla) return
    setEditPlanilla({
      ...editPlanilla,
      ingresos: editPlanilla.ingresos.filter((i: any) => i.id !== id)
    })
  }

  const deleteDescuentoEdit = (id: number) => {
    if (!editPlanilla) return
    setEditPlanilla({
      ...editPlanilla,
      descuentos: editPlanilla.descuentos.filter((d: any) => d.id !== id)
    })
  }

  const addIngresoEdit = () => {
    if (!editPlanilla) return
    setEditPlanilla({
      ...editPlanilla,
      ingresos: [...editPlanilla.ingresos, { id: 0, tipo: '', monto: 0 }]
    })
  }

  const addDescuentoEdit = () => {
    if (!editPlanilla) return
    setEditPlanilla({
      ...editPlanilla,
      descuentos: [...editPlanilla.descuentos, { id: 0, tipo: '', monto: 0 }]
    })
  }

  const viewDetail = async (id: number) => {
    const res = await planillasApi.get(id)
    setDetailPlanilla(res.data)
    setShowDetail(true)
  }

  const addIngreso = async () => {
    if (!detailPlanilla || !ingresoForm.tipo || !ingresoForm.monto) return
    const monto = parseFloat(ingresoForm.monto)
    if (isNaN(monto) || monto <= 0) return

    await fetch(`${API_URL}/api/ingresos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planilla_id: detailPlanilla.id, tipo: ingresoForm.tipo, monto })
    })
    const res = await planillasApi.get(detailPlanilla.id)
    setDetailPlanilla(res.data)
    setIngresoForm({ tipo: '', monto: '' })
  }

  const addDescuento = async () => {
    if (!detailPlanilla || !descuentoForm.tipo || !descuentoForm.monto) return
    const monto = parseFloat(descuentoForm.monto)
    if (isNaN(monto) || monto <= 0) return

    await fetch(`${API_URL}/api/descuentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planilla_id: detailPlanilla.id, tipo: descuentoForm.tipo, monto })
    })
    const res = await planillasApi.get(detailPlanilla.id)
    setDetailPlanilla(res.data)
    setDescuentoForm({ tipo: '', monto: '' })
  }

  const deleteIngreso = async (id: number) => {
    await fetch(`${API_URL}/api/ingresos/${id}`, { method: 'DELETE' })
    const res = await planillasApi.get(detailPlanilla.id)
    setDetailPlanilla(res.data)
  }

  const deleteDescuento = async (id: number) => {
    await fetch(`${API_URL}/api/descuentos/${id}`, { method: 'DELETE' })
    const res = await planillasApi.get(detailPlanilla.id)
    setDetailPlanilla(res.data)
  }

  const totalHaberes = planillas.reduce((acc, p) => acc + p.total_haberes, 0)
  const totalDescuentos = planillas.reduce((acc, p) => acc + p.total_descuentos, 0)
  const totalLiquido = planillas.reduce((acc, p) => acc + p.total_liquido, 0)

  const currentPeriod = `${MESES[mes - 1]} ${anio}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Gestión de Nóminas</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Planillas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Administra las nóminas de tu personal</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Planilla
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Haberes</span>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ArrowDownToLine className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalHaberes)}</p>
          <p className="text-xs text-gray-500 mt-2">{planillas.length} planillas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Descuentos</span>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ArrowUpFromLine className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalDescuentos)}</p>
          <p className="text-xs text-gray-500 mt-2">DL20530, AFP, Otros</p>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-100">Pago Líquido</span>
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalLiquido)}</p>
          <p className="text-xs text-red-100 mt-2">Total a pagar</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-1.5 border border-gray-200 dark:border-gray-600">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select 
                  className="py-1.5 px-2 w-28 bg-transparent border-0 text-sm font-medium text-gray-700 dark:text-gray-200" 
                  value={mes} 
                  onChange={e => { setMes(Number(e.target.value)); setPage(1) }}
                >
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <span className="text-gray-400">|</span>
                <select 
                  className="py-1.5 px-2 w-20 bg-transparent border-0 text-sm font-medium text-gray-700 dark:text-gray-200" 
                  value={anio} 
                  onChange={e => { setAnio(Number(e.target.value)); setPage(1) }}
                >
                  {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar empleado..."
                  className="pl-10 pr-10 py-2.5 w-56 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-red-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setPage(1) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{total} planillas</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : planillas.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sin planillas</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-5">
              {searchTerm.trim() ? `No se encontraron planillas para "${searchTerm}"` : `No hay planillas registradas para ${currentPeriod}`}
            </p>
            {!searchTerm.trim() && <button onClick={() => setShowModal(true)} className="btn-primary">Crear Planilla</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-4 px-5">Empleado</th>
                  <th>DNI</th>
                  <th className="text-right">Haberes</th>
                  <th className="text-right">Descuentos</th>
                  <th className="text-right">Líquido</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {planillas.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {p.personal?.nombres?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{p.personal?.apellidos} {p.personal?.nombres}</p>
                          <p className="text-xs text-gray-500">{p.personal?.puesto || '-'}</p>
                          <p className="text-xs text-gray-400">
                            {p.personal?.colegio && `${p.personal.colegio}`}{p.personal?.distrito && ` - ${p.personal.distrito}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">{p.personal?.dni || '-'}</span>
                    </td>
                    <td className="text-right py-4 px-4">
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{formatCurrency(p.total_haberes)}</span>
                    </td>
                    <td className="text-right py-4 px-4">
                      <span className="font-medium text-gray-500 dark:text-gray-400 text-sm">{formatCurrency(p.total_descuentos)}</span>
                    </td>
                    <td className="text-right py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold text-sm">
                        {formatCurrency(p.total_liquido)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEdit(p.id)} 
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all" 
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => viewDetail(p.id)} 
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all" 
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all" 
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando <span className="font-semibold text-gray-700 dark:text-gray-300">{(page - 1) * 20 + 1}</span> - <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.min(page * 20, total)}</span> de <span className="font-semibold text-red-600 dark:text-red-400">{total}</span> planillas
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400">
                    <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-3 h-3 -ml-2" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, page - Math.floor(5/2))
                    const pageNum = start + i
                    if (pageNum > totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          page === pageNum ? 'bg-red-600 text-white shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 bg-gradient-to-r from-red-600 to-red-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Nueva Planilla</h3>
                    <p className="text-white/70 text-sm">Selecciona el empleado</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                <div className="alert-error">
                  <X className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="relative">
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4 text-red-600" /> Empleado *
                </label>
                {form.personal_id > 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{searchEmpleado}</span>
                    <button type="button" onClick={() => { setForm({ ...form, personal_id: 0 }); setSearchEmpleado('') }} className="text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </div>
                      <input
                        type="text"
                        className="input pl-10"
                        placeholder="Buscar por nombre o DNI..."
                        value={searchEmpleado}
                        onChange={e => {
                          setSearchEmpleado(e.target.value)
                          searchEmpleados(e.target.value)
                          setShowSearchResults(true)
                        }}
                        onFocus={() => setShowSearchResults(true)}
                      />
                    </div>
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                            onClick={() => selectEmpleado(p)}
                          >
                            <span className="text-sm font-medium text-gray-800 dark:text-white">{p.apellidos} {p.nombres}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{p.dni}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showSearchResults && searchEmpleado.length >= 2 && searchResults.length === 0 && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">No se encontró ningún empleado</p>
                        <button
                          type="button"
                          onClick={() => { setShowNewEmpleado(true); setShowSearchResults(false) }}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          + Crear nuevo empleado
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {showNewEmpleado && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Nuevo empleado</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      className="input text-xs py-2"
                      placeholder="DNI"
                      value={newEmpleadoForm.dni}
                      onChange={e => setNewEmpleadoForm({ ...newEmpleadoForm, dni: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input text-xs py-2"
                      placeholder="Nombres *"
                      value={newEmpleadoForm.nombres}
                      onChange={e => setNewEmpleadoForm({ ...newEmpleadoForm, nombres: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input text-xs py-2"
                      placeholder="Apellidos *"
                      value={newEmpleadoForm.apellidos}
                      onChange={e => setNewEmpleadoForm({ ...newEmpleadoForm, apellidos: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={createAndSelectEmpleado}
                      disabled={!newEmpleadoForm.nombres.trim() || !newEmpleadoForm.apellidos.trim()}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                    >
                      Crear y usar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewEmpleado(false); setNewEmpleadoForm({ dni: '', nombres: '', apellidos: '' }) }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600" /> Mes *
                  </label>
                  <select className="input" value={form.mes} onChange={e => setForm({ ...form, mes: Number(e.target.value) })}>
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600" /> Año *
                  </label>
                  <select className="input" value={form.anio} onChange={e => setForm({ ...form, anio: Number(e.target.value) })}>
                    {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Planilla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && detailPlanilla && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {detailPlanilla.personal?.nombres?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {detailPlanilla.personal?.apellidos} {detailPlanilla.personal?.nombres}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/10 px-2.5 py-1 rounded-lg">
                        {detailPlanilla.personal?.dni || 'Sin DNI'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/10 px-2.5 py-1 rounded-lg">
                        {detailPlanilla.personal?.colegio || 'Sin colegio'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/10 px-2.5 py-1 rounded-lg">
                        {detailPlanilla.personal?.distrito || 'Sin distrito'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/10 px-2.5 py-1 rounded-lg">
                        {MESES[detailPlanilla.mes - 1]} {detailPlanilla.anio}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShowDetail(false); handleEdit(detailPlanilla.id) }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                    title="Editar planilla"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowDetail(false)} className="p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownToLine className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Total Haberes</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(detailPlanilla.total_haberes)}</p>
                  <p className="text-xs text-gray-500 mt-1">{detailPlanilla.ingresos?.length || 0} conceptos</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpFromLine className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Total Descuentos</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(detailPlanilla.total_descuentos)}</p>
                  <p className="text-xs text-gray-500 mt-1">{detailPlanilla.descuentos?.length || 0} deducciones</p>
                </div>
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-red-100" />
                    <span className="text-xs font-semibold uppercase text-red-100">Pago Líquido</span>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(detailPlanilla.total_liquido)}</p>
                  <p className="text-xs text-red-100 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Listo para pagar
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-600 rounded-lg">
                        <ArrowDownToLine className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Ingresos y Haberes</h4>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                        {detailPlanilla.ingresos?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                    {detailPlanilla.ingresos?.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Sin ingresos registrados</p>
                      </div>
                    ) : (
                      detailPlanilla.ingresos?.map((i: Ingreso) => (
                        <div key={i.id} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{i.tipo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{formatCurrency(i.monto)}</span>
                            <button 
                              onClick={() => deleteIngreso(i.id)} 
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Concepto (ej: Sueldo Base)"
                        className="input text-xs py-2 flex-1"
                        value={ingresoForm.tipo}
                        onChange={e => setIngresoForm({ ...ingresoForm, tipo: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Monto"
                        className="input text-xs py-2 w-24"
                        value={ingresoForm.monto}
                        onChange={e => setIngresoForm({ ...ingresoForm, monto: e.target.value })}
                      />
                      <button
                        onClick={addIngreso}
                        disabled={!ingresoForm.tipo || !ingresoForm.monto}
                        className="px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-600 rounded-lg">
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Descuentos y Deducciones</h4>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                        {detailPlanilla.descuentos?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                    {detailPlanilla.descuentos?.length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Sin descuentos registrados</p>
                      </div>
                    ) : (
                      detailPlanilla.descuentos?.map((d: Descuento) => (
                        <div key={d.id} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                              <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.tipo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{formatCurrency(d.monto)}</span>
                            <button 
                              onClick={() => deleteDescuento(d.id)} 
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Concepto (ej: AFP)"
                        className="input text-xs py-2 flex-1"
                        value={descuentoForm.tipo}
                        onChange={e => setDescuentoForm({ ...descuentoForm, tipo: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Monto"
                        className="input text-xs py-2 w-24"
                        value={descuentoForm.monto}
                        onChange={e => setDescuentoForm({ ...descuentoForm, monto: e.target.value })}
                      />
                      <button
                        onClick={addDescuento}
                        disabled={!descuentoForm.tipo || !descuentoForm.monto}
                        className="px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {detailPlanilla.ingresos?.length === 0 && detailPlanilla.descuentos?.length === 0 && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Planilla sin movimientos</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Agrega ingresos y descuentos para calcular el líquido</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEdit && editPlanilla && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-gray-700 to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Editar Planilla</h3>
                    <p className="text-white/70 text-xs">{editPlanilla.personal?.apellidos} {editPlanilla.personal?.nombres} • {MESES[editPlanilla.mes - 1]} {editPlanilla.anio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 px-3 py-1.5 rounded-lg text-white text-xs font-semibold">
                    Líquido: {formatCurrency((editPlanilla.ingresos?.reduce((s: number, i: any) => s + (i.monto || 0), 0) || 0) - (editPlanilla.descuentos?.reduce((s: number, d: any) => s + (d.monto || 0), 0) || 0))}
                  </div>
                  <button onClick={() => setShowEdit(false)} className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" /> Período de la Planilla
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Mes</label>
                  <select 
                    className="input text-sm py-2.5"
                    value={editPlanilla.mes}
                    onChange={e => setEditPlanilla({...editPlanilla, mes: Number(e.target.value)})}
                  >
                    {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Año</label>
                  <select 
                    className="input text-sm py-2.5"
                    value={editPlanilla.anio}
                    onChange={e => setEditPlanilla({...editPlanilla, anio: Number(e.target.value)})}
                  >
                    {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-600 rounded-lg">
                        <ArrowDownToLine className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-700 text-sm">Ingresos</h4>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                        {editPlanilla.ingresos?.length || 0}
                      </span>
                    </div>
                    <button 
                      onClick={addIngresoEdit} 
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-semibold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                    {editPlanilla.ingresos?.length === 0 ? (
                      <div className="text-center py-6">
                        <TrendingUp className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-gray-400 text-xs">Sin ingresos</p>
                      </div>
                    ) : (
                      editPlanilla.ingresos?.map((ing: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                          <input
                            type="text"
                            className="input text-xs py-1.5 flex-1"
                            value={ing.tipo}
                            onChange={e => {
                              const newIng = [...editPlanilla.ingresos]
                              newIng[idx].tipo = e.target.value
                              setEditPlanilla({...editPlanilla, ingresos: newIng})
                            }}
                            placeholder="Concepto"
                          />
                          <input
                            type="number"
                            className="input text-xs py-1.5 w-24"
                            value={ing.monto}
                            onChange={e => {
                              const newIng = [...editPlanilla.ingresos]
                              newIng[idx].monto = parseFloat(e.target.value) || 0
                              setEditPlanilla({...editPlanilla, ingresos: newIng})
                            }}
                            placeholder="Monto"
                          />
                          <button 
                            onClick={() => {
                              if (ing.id > 0) {
                                deleteIngresoEdit(ing.id)
                              } else {
                                setEditPlanilla({...editPlanilla, ingresos: editPlanilla.ingresos.filter((_: any, i: number) => i !== idx)})
                              }
                            }} 
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-600">Total Haberes:</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(editPlanilla.ingresos?.reduce((s: number, i: any) => s + (i.monto || 0), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-600 rounded-lg">
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-bold text-gray-700 text-sm">Descuentos</h4>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                        {editPlanilla.descuentos?.length || 0}
                      </span>
                    </div>
                    <button 
                      onClick={addDescuentoEdit} 
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-semibold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                    {editPlanilla.descuentos?.length === 0 ? (
                      <div className="text-center py-6">
                        <Receipt className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-gray-400 text-xs">Sin descuentos</p>
                      </div>
                    ) : (
                      editPlanilla.descuentos?.map((desc: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                          <input
                            type="text"
                            className="input text-xs py-1.5 flex-1"
                            value={desc.tipo}
                            onChange={e => {
                              const newDesc = [...editPlanilla.descuentos]
                              newDesc[idx].tipo = e.target.value
                              setEditPlanilla({...editPlanilla, descuentos: newDesc})
                            }}
                            placeholder="Concepto"
                          />
                          <input
                            type="number"
                            className="input text-xs py-1.5 w-24"
                            value={desc.monto}
                            onChange={e => {
                              const newDesc = [...editPlanilla.descuentos]
                              newDesc[idx].monto = parseFloat(e.target.value) || 0
                              setEditPlanilla({...editPlanilla, descuentos: newDesc})
                            }}
                            placeholder="Monto"
                          />
                          <button 
                            onClick={() => {
                              if (desc.id > 0) {
                                deleteDescuentoEdit(desc.id)
                              } else {
                                setEditPlanilla({...editPlanilla, descuentos: editPlanilla.descuentos.filter((_: any, i: number) => i !== idx)})
                              }
                            }} 
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-600">Total Descuentos:</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(editPlanilla.descuentos?.reduce((s: number, d: any) => s + (d.monto || 0), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Monto Líquido a Pagar</p>
                      <p className="text-xs text-gray-500">Haberes menos descuentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(
                        (editPlanilla.ingresos?.reduce((s: number, i: any) => s + (i.monto || 0), 0) || 0) - 
                        (editPlanilla.descuentos?.reduce((s: number, d: any) => s + (d.monto || 0), 0) || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
              <button 
                onClick={() => { setShowEdit(false); setEditPlanilla(null) }} 
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={saveEdit} className="btn-primary flex items-center gap-2">
                <Check className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
}