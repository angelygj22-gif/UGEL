import { useState, useCallback } from 'react'
import { personalApi } from '../services/api'
import { Search, Download, FileSpreadsheet, User, X, Printer, Hash, CheckCircle, RefreshCw, CalendarDays, Trash2 } from 'lucide-react'

interface Personal {
  id: number
  dni: string
  nombres: string
  apellidos: string
  puesto?: string
  rd?: string
  uu?: string
  colegio?: string
  distrito?: string
}

interface Ingreso { id: number; tipo: string; monto: number }
interface Descuento { id: number; tipo: string; monto: number }

interface Planilla {
  id: number
  personal_id: number
  mes: number
  anio: number
  total_haberes: number
  total_descuentos: number
  total_liquido: number
  ingresos?: Ingreso[]
  descuentos?: Descuento[]
}

interface PlanillaResponse {
  personal: Personal
  planillas: Planilla[]
  total_haberes: number
  total_descuentos: number
  total_liquido: number
  cantidad: number
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Exportar() {
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<Personal[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Personal | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [exportAll, setExportAll] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [planillasData, setPlanillasData] = useState<Planilla[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [, setSelectedPlanilla] = useState<Planilla | null>(null)
  const [allPlanillas, setAllPlanillas] = useState<Planilla[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [periodosData, setPeriodosData] = useState<{años: number[], meses: Record<number, number[]>, total: number} | null>(null)
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [selectedMeses, setSelectedMeses] = useState<number[]>([])
  const [selectedAnio, setSelectedAnio] = useState<number>(0)

  const loadPeriodos = useCallback(async (personalId: number) => {
    setLoadingPeriodos(true)
    try {
      const res = await personalApi.getPeriodos(personalId)
      setPeriodosData(res.data)
    } catch (e) { console.error(e); setPeriodosData(null) }
    setLoadingPeriodos(false)
  }, [])

  const loadAllPlanillas = useCallback(async (personalId: number, mes?: number, anio?: number) => {
    setLoadingAll(true)
    setPlanillasData([])
    setShowPreview(false)
    if (!mes && !anio) setAllPlanillas([])
    try {
      const res = await personalApi.exportar(personalId, mes, anio)
      const data: PlanillaResponse = res.data
      if (data.planillas) {
        if (!mes && !anio) setAllPlanillas(data.planillas)
        setPlanillasData(data.planillas)
        setShowPreview(true)
      }
    } catch (e) { console.error(e) }
    setLoadingAll(false)
  }, [])

  const searchEmpleados = async (query: string) => {
    if (!query || query.length < 2) return
    setSearching(true)
    try {
      const res = await personalApi.buscar(query, 10)
      setSearchResults(res.data.data || [])
    } catch (e) { console.error(e) }
    setSearching(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (value.length >= 2) {
      setTimeout(() => searchEmpleados(value), 300)
    } else { setSearchResults([]) }
  }

  const selectPerson = (p: Personal) => {
    setSelectedPerson(p)
    setSearchInput(`${p.apellidos} ${p.nombres}`)
    setShowSearchResults(false)
    setSearchResults([])
    setPlanillasData([])
    setAllPlanillas([])
    setShowPreview(false)
    setSelectedPlanilla(null)
    setPeriodosData(null)
    setSelectedMeses([])
    setSelectedAnio(0)
    setExportAll(true)
    loadPeriodos(p.id)
    loadAllPlanillas(p.id)
  }

  const loadMesesPlanillas = async (personalId: number, anio: number, meses: number[]) => {
    setLoadingAll(true)
    setPlanillasData([])
    setShowPreview(false)
    try {
      const res = await personalApi.exportar(personalId, undefined, anio)
      const data: PlanillaResponse = res.data
      if (data.planillas) {
        const filtered = data.planillas.filter(p => meses.includes(p.mes)).sort((a, b) => a.mes - b.mes)
        setPlanillasData(filtered)
        setShowPreview(true)
      }
    } catch (e) { console.error(e) }
    setLoadingAll(false)
  }

  const loadPeriodPlanillas = () => {
    if (!selectedPerson || selectedMeses.length === 0 || !selectedAnio) return
    setExportAll(false)
    loadMesesPlanillas(selectedPerson.id, selectedAnio, selectedMeses)
  }

  const clearSelection = () => {
    setSelectedPerson(null)
    setSearchInput('')
    setPlanillasData([])
    setAllPlanillas([])
    setShowPreview(false)
    setSelectedPlanilla(null)
    setPeriodosData(null)
  }

  const generateExcel = async () => {
    if (!selectedPerson || planillasData.length === 0) return
    setExporting(true)
    const htmlContent = generateHTML()
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Planilla_${selectedPerson.apellidos}_${selectedPerson.nombres}_${new Date().toISOString().split('T')[0]}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const handlePrint = () => {
    if (!selectedPerson || planillasData.length === 0) return
    const htmlContent = generateHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
    }
  }

  const generateHTML = () => {
    if (!selectedPerson) return ''
    const sorted = [...planillasData].sort((a, b) => a.anio - b.anio || a.mes - b.mes)
    const totalHaberes = sorted.reduce((s, p) => s + (p.total_haberes || 0), 0)
    const totalDescuentos = sorted.reduce((s, p) => s + (p.total_descuentos || 0), 0)
    const totalLiquido = sorted.reduce((s, p) => s + (p.total_liquido || 0), 0)

    const origin = window.location.origin
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 10px; }
      table { border-collapse: collapse; width: 100%; margin: 0; font-size: 10px; }
      th, td { border: 1px solid #ddd; padding: 3px 5px; text-align: left; }
      th { background-color: #dc2626; color: white; }
      .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 12px 16px; display: flex; align-items: center; gap: 16px; }
      .header-logo { height: 60px; width: auto; }
      .header h1 { margin: 0; font-size: 18px; }
      .header p { margin: 2px 0 0; font-size: 12px; opacity: .8; }
      h2 { font-size: 13px; margin: 6px 0; }
      .section-title { background: #fef2f2; padding: 4px 8px; font-weight: bold; color: #dc2626; }
      .total-row { background: #f0fdf4; font-weight: bold; }
      .negative { color: #dc2626; }
      .positive { color: #16a34a; }
      .blue { color: #2563eb; }
      .planilla-grid { display: flex; flex-flow: row wrap; gap: 8px; align-items: flex-start; }
      .planilla-item { flex: 0 1 auto; min-width: 200px; }
      @media print {
        @page { size: landscape; margin: 5mm; }
        body { font-size: 8pt; padding: 0; }
        table { font-size: 7pt; }
        th, td { padding: 2px 3px; }
        .planilla-item { min-width: 150px; }
        .header { padding: 6px 10px; }
        .header-logo { height: 40px; }
        .header h1 { font-size: 12pt; }
        .header p { font-size: 8pt; }
        h2 { font-size: 9pt; margin: 4px 0; }
      }
    </style></head><body>
    <div class="header"><img class="header-logo" src="${origin}/img/logo_minedu.png" alt="MINEDU" /><div><h1>CONSTANCIA DE PAGOS DE HABERES Y DESCUENTOS</h1><p>Sistema de Gestión Planillas</p></div></div>
    <h2>DATOS DEL EMPLEADO</h2>
    <table><tr><th>Apellidos</th><td>${selectedPerson.apellidos}</td></tr>
    <tr><th>Nombres</th><td>${selectedPerson.nombres}</td></tr>
    <tr><th>DNI</th><td>${selectedPerson.dni || 'N/A'}</td></tr>
    <tr><th>Colegio</th><td>${selectedPerson.colegio || 'N/A'}</td></tr>
    <tr><th>Distrito</th><td>${selectedPerson.distrito || 'N/A'}</td></tr>
    <tr><th>Puesto</th><td>${selectedPerson.puesto || 'N/A'}</td></tr>
    <tr><th>RD</th><td>${selectedPerson.rd || 'N/A'}</td></tr>
    <tr><th>UU</th><td>${selectedPerson.uu || 'N/A'}</td></tr></table>
    <h2>RESUMEN GENERAL</h2>
    <table><tr><th>Total Períodos</th><td>${sorted.length}</td></tr>
    <tr><th>Total Haberes</th><td class="positive">S/ ${totalHaberes.toFixed(2)}</td></tr>
    <tr><th>Total Descuentos</th><td class="negative">S/ ${totalDescuentos.toFixed(2)}</td></tr>
    <tr><th>Líquido Total</th><td class="positive"><strong>S/ ${totalLiquido.toFixed(2)}</strong></td></tr></table>
    <h2>DETALLE DE PLANILLAS</h2>
    <div class="planilla-grid">`

    sorted.forEach((planilla) => {
      const mesNombre = MESES[planilla.mes - 1]
      html += `<div class="planilla-item"><table><tr class="section-title"><th colspan="3">${mesNombre} - ${planilla.anio}</th></tr>
      <tr><th colspan="3" style="background:#fef2f2">INGRESOS Y HABERES</th></tr>
      <tr><th>Concepto</th><th>Tipo</th><th>Monto</th></tr>`
      if (planilla.ingresos) planilla.ingresos.forEach(ing => { html += `<tr><td>${ing.tipo}</td><td>Ingreso</td><td class="blue">S/ ${ing.monto.toFixed(2)}</td></tr>` })
      html += `<tr class="total-row"><td colspan="2">Subtotal Haberes</td><td class="positive">S/ ${planilla.total_haberes.toFixed(2)}</td></tr>`
      html += `<tr><th colspan="3" style="background:#fef2f2">DESCUENTOS Y DEDUCCIONES</th></tr>
      <tr><th>Concepto</th><th>Tipo</th><th>Monto</th></tr>`
      if (planilla.descuentos) planilla.descuentos.forEach(desc => { html += `<tr><td>${desc.tipo}</td><td>Descuento</td><td class="negative">S/ ${desc.monto.toFixed(2)}</td></tr>` })
      html += `<tr class="total-row"><td colspan="2">Subtotal Descuentos</td><td class="negative">S/ ${planilla.total_descuentos.toFixed(2)}</td></tr>
      <tr class="total-row"><td colspan="2"><strong>Líquido del Período</strong></td><td class="positive"><strong>S/ ${planilla.total_liquido.toFixed(2)}</strong></td></tr></table></div>`
    })
    html += `</div><p style="margin-top:20px;color:#666;font-size:12px">Exportado el: ${new Date().toLocaleString('es-PE')} | Sistema Planillas</p></body></html>`
    return html
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Exportación de Datos</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Exportar Planillas</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Exporta las planillas de un empleado en formato Excel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">1. Seleccionar Empleado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Busca por nombre o número de DNI</p>
              </div>
              {selectedPerson && (
                <button onClick={clearSelection} className="ml-auto text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                {searching ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : <Search className="w-5 h-5 text-gray-400" />}
              </div>
              <input
                type="text"
                className={`w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-700 border-2 ${selectedPerson ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600'} rounded-xl focus:outline-none focus:border-red-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-base`}
                placeholder="Buscar empleados por nombre o DNI..."
                value={searchInput}
                onChange={e => { handleSearchChange(e.target.value); setShowSearchResults(true); if (!e.target.value) setSelectedPerson(null) }}
                onFocus={() => setShowSearchResults(true)}
                disabled={!!selectedPerson}
              />
              {selectedPerson && (
                <button onClick={clearSelection} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-1.5">
                  <X className="w-5 h-5" />
                </button>
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button key={p.id} type="button" className="w-full text-left px-5 py-4 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-4" onClick={() => selectPerson(p)}>
                      <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {p.nombres?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white">{p.apellidos} {p.nombres}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Hash className="w-3 h-3" /> {p.dni || 'Sin DNI'}</span>
                        </div>
                      </div>
                      
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPerson && (
              <div className="mt-5 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                    {selectedPerson.nombres?.charAt(0) || '?'}
                  </div>
                    <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white text-xl">{selectedPerson.apellidos}, {selectedPerson.nombres}</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"><Hash className="w-4 h-4 text-red-500" /> {selectedPerson.dni || 'Sin DNI'}</span>
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">{selectedPerson.colegio || 'Sin colegio'}</span>
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">{selectedPerson.distrito || 'Sin distrito'}</span>
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">{selectedPerson.puesto || 'Sin puesto'}</span>
                    </div>
                  </div>
                  
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Seleccionar Período</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{periodosData ? `${periodosData.total} planilla${periodosData.total !== 1 ? 's' : ''}` : 'Elige el rango de tiempo a exportar'}</p>
              </div>
            </div>

            {loadingPeriodos ? (
              <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div><span className="ml-3 text-gray-500">Cargando...</span></div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => { setExportAll(true); setPlanillasData(allPlanillas); setSelectedMeses([]); setSelectedAnio(0); }} className={`px-4 py-2 rounded-lg font-medium transition-all ${exportAll ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>Todos</button>
                  <button onClick={() => { setExportAll(false); if (periodosData?.años?.length) { setSelectedAnio(periodosData.años[0]); setSelectedMeses([]); } }} className={`px-4 py-2 rounded-lg font-medium transition-all ${!exportAll ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>Período(s)</button>
                </div>
                {!exportAll && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Año</label>
                      <select className="input py-2" value={selectedAnio} onChange={e => { const a = Number(e.target.value); setSelectedAnio(a); setSelectedMeses([]); }}>
                        {periodosData?.años?.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Meses {selectedMeses.length > 0 && <span className="text-red-600">({selectedMeses.length} seleccionado{selectedMeses.length !== 1 ? 's' : ''})</span>}</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {MESES.map((m, i) => {
                          const mesNum = i + 1
                          const hasData = periodosData?.meses[selectedAnio]?.includes(mesNum)
                          const isSelected = selectedMeses.includes(mesNum)
                          return (
                            <button key={mesNum} type="button" onClick={() => { setSelectedMeses(prev => { if (prev.includes(mesNum)) return prev.filter(x => x !== mesNum); return [...prev, mesNum].sort((a, b) => a - b) }) }} className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border ${isSelected ? 'bg-red-600 text-white border-red-600' : hasData ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700'}`}>
                              {m}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <button onClick={loadPeriodPlanillas} disabled={selectedMeses.length === 0 || !selectedAnio} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-all">
                      Ver
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {selectedPerson && <button onClick={() => exportAll ? loadAllPlanillas(selectedPerson.id) : loadPeriodPlanillas()} disabled={loadingAll} className="btn-primary flex items-center gap-2 disabled:opacity-50">{loadingAll ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <RefreshCw className="w-4 h-4" />}<span>Actualizar</span></button>}
            <button onClick={handlePrint} disabled={!selectedPerson || planillasData.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button onClick={generateExcel} disabled={!selectedPerson || planillasData.length === 0 || exporting} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              {exporting ? <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
              <span>Exportar Excel</span>
            </button>
          </div>

          {showPreview && planillasData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-white" /></div>
                  <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Resultados</h3><p className="text-sm text-gray-500 dark:text-gray-400">{planillasData.length} planilla{planillasData.length > 1 ? 's' : ''}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl"><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Haberes</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(planillasData.reduce((s, p) => s + (p.total_haberes || 0), 0))}</p></div>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl"><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Descuentos</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(planillasData.reduce((s, p) => s + (p.total_descuentos || 0), 0))}</p></div>
                  <div className="px-4 py-2 bg-red-600 text-white rounded-xl"><p className="text-xs text-white/80 font-medium">Líquido Total</p><p className="text-lg font-bold">{formatCurrency(planillasData.reduce((s, p) => s + (p.total_liquido || 0), 0))}</p></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-white" /></div>
              <div><h3 className="font-bold text-lg">Excel Completo</h3><p className="text-white/70 text-sm">Formato profesional</p></div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-white/70 mt-0.5" /><p className="text-white/80">Datos completos del empleado</p></div>
              <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-white/70 mt-0.5" /><p className="text-white/80">Detalle de cada período</p></div>
              <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-white/70 mt-0.5" /><p className="text-white/80">Totales y resumen general</p></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Printer className="w-4 h-4 text-red-600" />Guía rápida</h3>
            <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-start gap-2"><div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-red-600 dark:text-red-400 font-bold">1</span></div><p>Busca al empleado por nombre o DNI</p></div>
              <div className="flex items-start gap-2"><div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-red-600 dark:text-red-400 font-bold">2</span></div><p>Selecciona el período a exportar</p></div>
              <div className="flex items-start gap-2"><div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-red-600 dark:text-red-400 font-bold">3</span></div><p>Usa "Exportar Excel" para descargar</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}