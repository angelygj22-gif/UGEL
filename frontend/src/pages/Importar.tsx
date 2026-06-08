import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Calendar, Users, LayoutList, FileType, ArrowRight, HelpCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { PYTHON_URL } from '../services/api'

const MESES = [
  { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
  { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
  { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
  { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
]

const currentYear = new Date().getFullYear()
const ANIOS = Array.from({ length: currentYear - 1989 }, (_, i) => 1990 + i).reverse()

export default function Importar() {
  const [file, setFile] = useState<File | null>(null)
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio] = useState<number>(currentYear)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validacion, setValidacion] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) acceptFile(selected)
  }

  const acceptFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError('Solo archivos Excel (.xlsx, .xls)')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptFile(f)
  }

  const handleValidate = async () => {
    if (!file) return
    setUploading(true)
    setIsLoading(true)
    setError(null)
    setResult(null)
    setValidacion(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${PYTHON_URL}/validate-excel`, { method: 'POST', body: formData })
      const data = await response.json()
      if (response.ok) {
        setValidacion(data)
      } else {
        setError(data.error || `Error ${response.status}`)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setUploading(false)
      setIsLoading(false)
    }
  }

  const handleConfirmUpload = async () => {
    if (!file) return
    setUploading(true)
    setIsLoading(true)
    setValidacion(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mes', String(mes))
      formData.append('anio', String(anio))

      const response = await fetch(`${PYTHON_URL}/process-excel`, { method: 'POST', body: formData })
      const data = await response.json()
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || `Error ${response.status}`)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setUploading(false)
      setIsLoading(false)
    }
  }

  const handleCancelValidation = () => {
    setValidacion(null)
  }

  const resetForm = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setValidacion(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Importación de Datos</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Planilla</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Carga archivos Excel para importar nóminas masivamente</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="skeleton w-10 h-10 rounded-xl"></div>
                <div>
                  <div className="skeleton skeleton-text w-32"></div>
                  <div className="skeleton skeleton-text w-24"></div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="skeleton w-full h-12 rounded-xl"></div>
                <div className="skeleton w-full h-12 rounded-xl"></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="skeleton skeleton-card rounded-xl h-40"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const mesNombre = MESES.find(m => m.v === mes)?.l ?? ''

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-5 h-5 text-red-600" />
          <span className="text-sm font-medium text-red-600">Importación de Datos</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Planilla</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Carga archivos Excel para importar nóminas masivamente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-gray-600 rounded-xl">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">1. Seleccionar Período</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mes y año de la planilla</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Mes</label>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input">
                  {MESES.map(m => (<option key={m.v} value={m.v}>{m.l}</option>))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Año</label>
                <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="input">
                  {ANIOS.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-red-600 rounded-xl">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">2. Subir Archivo</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Arrastra el archivo o haz clic para seleccionar</p>
              </div>
            </div>

            <div
              className={`upload-zone ${dragging ? 'upload-zone-active' : file ? 'border-red-300 bg-red-50' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex items-center justify-center gap-5">
                  <div className="w-14 h-14 bg-gray-600 rounded-2xl flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB - {mesNombre} {anio}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Arrastra el archivo aquí</p>
                  <p className="text-sm text-gray-400">o haz clic para seleccionar - .xlsx, .xls</p>
                </div>
              )}
            </div>

            {error && (
              <div className="alert-error mt-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Importación Exitosa!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Período: {mesNombre} {anio}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Bloques', value: result.personal ?? result.personal_count ?? 0, icon: Users },
                  { label: 'Creados', value: result.personal_creados ?? 0, icon: CheckCircle },
                  { label: 'Planillas', value: result.planillas_creadas ?? 0, icon: FileSpreadsheet },
                  { label: 'Total', value: result.planillas ?? result.planillas_count ?? 0, icon: LayoutList },
                ].map(({ label, value, icon: Icon }, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 text-center">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
              
              {(result.monto_total || result.monto_total === 0) && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Monto Total Liquido</p>
                    <p className="text-xl font-bold text-green-800 dark:text-green-300">S/ {Number(result.monto_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}

              {(result.dnis_duplicados?.length > 0 || result.nombres_duplicados?.length > 0) && (
                <div className="mt-4 space-y-3">
                  {result.dnis_duplicados?.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <p className="font-medium text-amber-800 dark:text-amber-300">DNIs Duplicados ({result.dnis_duplicados.length})</p>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.dnis_duplicados.map((item: any, idx: number) => (
                          <div key={idx} className="border-b border-amber-200 dark:border-amber-700 pb-2 last:border-0">
                            <div className="flex justify-between text-sm font-medium text-amber-800 dark:text-amber-300">
                              <span>DNI: {item.dni}</span>
                              <span>x{item.count}</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {item.empleados?.map((emp: any, eidx: number) => (
                                <div key={eidx} className="text-xs text-amber-700 dark:text-amber-400 flex justify-between pl-2">
                                  <span>{emp.nombre || '-'}</span>
                                  <span className="font-medium">S/ {Number(emp.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {result.nombres_duplicados?.length > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <p className="font-medium text-orange-800 dark:text-orange-300">Nombres Duplicados ({result.nombres_duplicados.length})</p>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {result.nombres_duplicados.map((item: any, idx: number) => (
                          <div key={idx} className="border-b border-orange-200 dark:border-orange-700 pb-2 last:border-0">
                            <div className="flex justify-between text-sm font-medium text-orange-800 dark:text-orange-300">
                              <span>{item.nombre}</span>
                              <span>x{item.count}</span>
                            </div>
                            <div className="mt-1 space-y-1">
                              {item.empleados?.map((emp: any, eidx: number) => (
                                <div key={eidx} className="text-xs text-orange-700 dark:text-orange-400 flex justify-between pl-2">
                                  <span>DNI: {emp.dni || '-'}</span>
                                  <span className="font-medium">S/ {Number(emp.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {validacion && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-amber-300 dark:border-amber-600">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400">Advertencia - Datos Duplicados</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Se encontraron duplicados en el archivo. ¿Desea continuar?</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{validacion.total_empleados}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Registros</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{validacion.dnis_duplicados?.length || 0}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">DNIs Duplicados</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">S/ {Number(validacion.monto_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Monto Total</p>
                </div>
              </div>

              {(validacion.dnis_duplicados?.length > 0) && (
                <div className="mb-4">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">Detalle DNIs Duplicados:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {validacion.dnis_duplicados.map((item: any, idx: number) => (
                      <div key={idx} className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2 text-sm">
                        <div className="flex justify-between font-medium text-amber-800 dark:text-amber-300">
                          <span>DNI: {item.dni}</span>
                          <span>x{item.count}</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {item.empleados?.slice(0, 3).map((emp: any, eidx: number) => (
                            <div key={eidx} className="text-xs text-amber-700 dark:text-amber-400 flex justify-between pl-2">
                              <span>{emp.nombre || '-'}</span>
                              <span>S/ {Number(emp.monto || 0).toFixed(2)}</span>
                            </div>
                          ))}
                          {item.count > 3 && (
                            <div className="text-xs text-amber-600 dark:text-amber-500 pl-2">...y {item.count - 3} más</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={handleCancelValidation} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleConfirmUpload} disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" /> Confirmar e Importar
                </button>
              </div>
            </div>
          )}

          {!validacion && (
            <>
              {file && (
                <div className="flex gap-3 mt-4">
                  <button onClick={resetForm} className="btn-secondary">Limpiar</button>
                </div>
              )}
              <button onClick={handleValidate} disabled={!file || uploading} className="btn-primary flex items-center gap-2 mt-4 disabled:opacity-50">
                <Upload className="w-4 h-4" /> Importar - {mesNombre} {anio}
              </button>
            </>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-600 rounded-xl">
                <LayoutList className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Formato Excel</h3>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-gray-300 space-y-1">
              <div className="flex gap-2 text-gray-500 border-b border-gray-700 pb-2 mb-2">
                <span className="w-8">Col A</span>
                <span className="w-16">Col B</span>
                <span className="w-16">Col C</span>
                <span className="flex-1">Col D</span>
              </div>
              <p><span className="text-gray-500">|</span> <span className="text-yellow-400">COLEGIO</span> <span className="text-gray-500">|</span> DETALLE <span className="text-gray-500">|</span> MES</p>
              <p className="text-red-400">HABERES</p>
              <p><span className="text-gray-500">|</span> Apellidos Nomb. <span className="text-gray-500">|</span> BASICA <span className="text-gray-500">|</span> 0.03</p>
              <p><span className="text-gray-500">|</span> DISTRITO <span className="text-gray-500">|</span> ... <span className="text-gray-500">|</span> ...</p>
              <p><span className="text-gray-500">|</span> CARGO <span className="text-gray-500">|</span> ... <span className="text-gray-500">|</span> ...</p>
              <p><span className="text-gray-500">|</span> RD 150-93 <span className="text-gray-500">|</span></p>
              <p><span className="text-gray-500">|</span> uu-01-0-005 <span className="text-gray-500">|</span></p>
              <p><span className="text-gray-500">|</span> DNI XXXXX <span className="text-gray-500">|</span></p>
              <p className="text-gray-400 mt-2">DSCTOS</p>
              <p><span className="text-gray-500">|</span> DL20530 <span className="text-gray-500">|</span> 3.80</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-600 rounded-xl">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Estructura de Datos</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Colegio', desc: 'Columna B - arriba del nombre' },
                { label: 'Nombre', desc: 'Columna B - empleado' },
                { label: 'Distrito', desc: 'Columna B - abajo del nombre' },
                { label: 'Puesto', desc: 'Columna B - cargo' },
                { label: 'RD', desc: 'Columna B - resolución' },
                { label: 'UU', desc: 'Columna B - código' },
                { label: 'DNI', desc: 'Columna B - documento' },
                { label: 'Ingresos', desc: 'Sección HABERES' },
                { label: 'Descuentos', desc: 'Sección DSCTOS' },
              ].map(({ label, desc }, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white">
            <h3 className="font-bold text-white mb-2">¿Necesitas ayuda?</h3>
            <p className="text-sm text-white/80 mb-4">Descarga nuestra plantilla de ejemplo para facilitar la importación</p>
            <button className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
              <FileType className="w-4 h-4" />
              Descargar Plantilla
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}