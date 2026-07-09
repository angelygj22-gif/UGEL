import { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle, ChevronRight, Lock, Mail, User, Sparkles, FileSpreadsheet, ArrowLeft, Building2, ScrollText, Clock } from 'lucide-react'
import api from '../services/api'
import { useSearchParams } from 'react-router-dom'

function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full mix-blend-overlay animate-float"
          style={{
            width: `${120 + i * 80}px`,
            height: `${120 + i * 80}px`,
            left: `${10 + i * 15}%`,
            top: `${5 + i * 12}%`,
            background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.08)'}, transparent 70%)`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${8 + i * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

const inputBase = "w-full pl-14 pr-5 py-4 bg-white/80 backdrop-blur-sm border-2 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-300 text-base"
const inputNormal = "border-gray-200 hover:border-gray-300"
const inputFocus = "border-red-400 bg-white shadow-lg shadow-red-100"
const inputError = "border-red-300 bg-red-50/80"

export default function Auth() {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token')
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recordar, setRecordar] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    if (!formData.email.trim()) errors.email = 'El correo es requerido'
    else if (!validateEmail(formData.email)) errors.email = 'Correo inválido'
    if (!formData.password) errors.password = 'La contraseña es requerida'
    else if (formData.password.length < 4) errors.password = 'Mínimo 4 caracteres'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return
    setStep('loading')
    setIsLoading(true)
    try {
      const response = await api.post('/api/usuarios/login', {
        email: formData.email, password: formData.password, remember_me: recordar
      })
      if (response.data.access_token) {
        setStep('success')
        setTimeout(() => login(response.data.access_token, response.data.refresh_token, response.data.user), 1200)
      }
    } catch (err: any) {
      setStep('form')
      setError(err.response?.data?.error || 'Credenciales incorrectas. Intenta de nuevo.')
    } finally { setIsLoading(false) }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    if (!forgotEmail.trim()) { setError('Ingresa tu correo electrónico'); return }
    if (!validateEmail(forgotEmail)) { setError('Correo inválido'); return }
    setIsLoading(true)
    try {
      const response = await api.post('/api/usuarios/forgot-password', { email: forgotEmail })
      setSuccessMsg(response.data.message || 'Revisa tu correo para restablecer tu contraseña')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar el correo')
    } finally { setIsLoading(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    if (!resetPassword || resetPassword.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return }
    if (resetPassword !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
    setIsLoading(true)
    try {
      await api.post('/api/usuarios/reset-password', { token: resetToken, new_password: resetPassword })
      setSuccessMsg('Contraseña restablecida correctamente. Redirigiendo al inicio de sesión...')
      setTimeout(() => { setView('login'); setResetPassword(''); setConfirmPassword(''); setSuccessMsg('') }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña')
    } finally { setIsLoading(false) }
  }

  const handleDemoLogin = () => {
    setFormData({ email: 'admin@planillas.su', password: 'admin123' })
    setError('')
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="relative text-center max-w-md w-full px-6">
          <div className="absolute inset-0 bg-red-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="relative">
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-2xl shadow-red-600/30 mx-auto mb-8 animate-bounce-subtle">
              <FileSpreadsheet className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Verificando acceso</h2>
            <p className="text-gray-500 mb-8">Validando credenciales de usuario</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="relative text-center max-w-md w-full px-6">
          <div className="absolute inset-0 bg-green-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="relative">
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-2xl shadow-green-500/30 mx-auto mb-8 animate-bounce-subtle">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">¡Bienvenido!</h2>
            <p className="text-green-400 font-medium">Acceso concedido. Redirigiendo...</p>
          </div>
        </div>
      </div>
    )
  }

  const iconBox = (field: string) => (
    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${focusedField === field ? 'bg-red-600 shadow-lg shadow-red-200 scale-110' : 'bg-gray-100'}`}>
      {field === 'email' ? <Mail className={`w-4.5 h-4.5 transition-colors ${focusedField === 'email' ? 'text-white' : 'text-gray-400'}`} /> :
       <Lock className={`w-4.5 h-4.5 transition-colors ${focusedField === 'password' ? 'text-white' : 'text-gray-400'}`} />}
    </div>
  )

  const getInputClass = (field: string) => {
    const err = field === 'email' ? fieldErrors.email : fieldErrors.password
    if (err) return `${inputBase} ${inputError}`
    if (focusedField === field) return `${inputBase} ${inputFocus}`
    return `${inputBase} ${inputNormal}`
  }

  const loginView = (
    <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-5">
          <FileSpreadsheet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenido de nuevo</h2>
        <p className="text-gray-500">Ingresa tus credenciales para acceder al sistema</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slideDown">
          <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-red-700 text-sm font-medium flex-1 pt-1">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Correo electrónico</label>
          <div className="relative">
            {iconBox('email')}
            <input
              type="email"
              className={getInputClass('email')}
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFieldErrors({ ...fieldErrors, email: undefined }); setError('') }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          {fieldErrors.email && <p className="mt-1.5 text-sm text-red-600 font-medium ml-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Contraseña</label>
          <div className="relative">
            {iconBox('password')}
            <input
              type={showPassword ? 'text' : 'password'}
              className={getInputClass('password')}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setFieldErrors({ ...fieldErrors, password: undefined }); setError('') }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1.5 text-sm text-red-600 font-medium ml-1">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="sr-only peer" />
              <div className="w-5 h-5 border-2 border-gray-300 rounded-lg peer-checked:bg-red-600 peer-checked:border-red-600 transition-all group-hover:border-red-400 flex items-center justify-center">
                {recordar && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">Recordar sesión</span>
          </label>
          <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccessMsg('') }} className="text-sm text-red-600 hover:text-red-700 font-semibold hover:underline transition-all">
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-2xl shadow-xl shadow-red-600/25 hover:shadow-red-600/40 transition-all duration-300 flex items-center justify-center gap-3 text-base disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Verificando...</span></> : <><span>Iniciar Sesión</span><ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
        </button>
      </form>

      <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100/80 rounded-2xl border border-gray-200/80">
        <p className="text-sm text-gray-500 font-medium text-center mb-3">¿No tienes acceso? Contacta al administrador</p>
        <button onClick={handleDemoLogin} className="w-full py-3.5 bg-white border-2 border-gray-200 hover:border-red-400 hover:bg-red-50/50 text-gray-700 font-semibold rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 group hover:shadow-lg">
          <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Credenciales de prueba</span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  )

  const forgotView = (
    <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <button type="button" onClick={() => setView('login')} className="flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors mb-5 mx-auto group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Volver</span>
        </button>
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-5">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Recuperar contraseña</h2>
        <p className="text-gray-500 text-sm">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-slideDown">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-green-700 text-sm font-medium flex-1 pt-1">{successMsg}</span>
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleForgotPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Correo electrónico</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5 text-gray-400" />
              </div>
              <input
                type="email"
                className="w-full pl-14 pr-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white focus:shadow-lg focus:shadow-red-100 transition-all duration-300 text-base"
                placeholder="correo@ejemplo.com"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setError('') }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-2xl shadow-xl shadow-red-600/25 hover:shadow-red-600/40 transition-all duration-300 flex items-center justify-center gap-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Enviando...</span></> : <span>Enviar enlace</span>}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slideDown">
          <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-red-700 text-sm font-medium flex-1 pt-1">{error}</span>
        </div>
      )}
    </div>
  )

  const resetView = (
    <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        {!successMsg && (
          <button type="button" onClick={() => { setView('login'); setError('') }} className="flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors mb-5 mx-auto group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Volver</span>
          </button>
        )}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-5">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Nueva contraseña</h2>
        <p className="text-gray-500 text-sm">Ingresa tu nueva contraseña para acceder al sistema</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-slideDown">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-green-700 text-sm font-medium flex-1 pt-1">{successMsg}</span>
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Nueva contraseña</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Lock className="w-4.5 h-4.5 text-gray-400" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full pl-14 pr-14 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white focus:shadow-lg focus:shadow-red-100 transition-all duration-300 text-base"
                placeholder="Nueva contraseña"
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setError('') }}
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Confirmar contraseña</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Lock className="w-4.5 h-4.5 text-gray-400" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full pl-14 pr-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white focus:shadow-lg focus:shadow-red-100 transition-all duration-300 text-base"
                placeholder="Confirma tu contraseña"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-2xl shadow-xl shadow-red-600/25 hover:shadow-red-600/40 transition-all duration-300 flex items-center justify-center gap-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Restableciendo...</span></> : <span>Restablecer contraseña</span>}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slideDown">
          <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-red-700 text-sm font-medium flex-1 pt-1">{error}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <FloatingShapes />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.12),transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,rgba(220,38,38,0.08),transparent_50%)]" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-16 w-full max-w-2xl mx-auto">
          <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-16">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-red-600/30 ring-2 ring-red-500/20">
                  <FileSpreadsheet className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-6xl font-bold text-white tracking-tight leading-none">esPlanillas<span className="text-red-500">SU</span></h1>
                  <p className="text-lg text-gray-400 font-light mt-2">UGEL 08 Cañete — Registro Histórico</p>
                </div>
              </div>
              <p className="text-gray-400/80 text-lg leading-relaxed max-w-md">
                Sistema de gestión y registro histórico de planillas — UGEL 08 Cañete
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Building2, title: 'UGEL 08 Cañete', desc: 'Gestión educativa y administrativa regional', color: 'from-red-600 to-red-700' },
                { icon: ScrollText, title: 'Registro de Planillas', desc: 'Historial completo de nóminas y pagos', color: 'from-gray-700 to-gray-800' },
                { icon: Clock, title: 'Control Histórico', desc: 'Accede a planillas de períodos anteriores', color: 'from-gray-600 to-gray-700' },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-5 p-5 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.06] hover:bg-white/[0.07] transition-all duration-500 group cursor-default`}
                     style={{ transitionDelay: `${400 + i * 150}ms` }}>
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-gray-400/80 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-gray-800 bg-gradient-to-br ${i===1?'from-red-500 to-red-600':i===2?'from-gray-600 to-gray-700':'from-gray-500 to-gray-600'} flex items-center justify-center shadow-lg`}>
                    <span className="text-white text-xs font-bold">{['UG','EL','08'][i-1]}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm">+150 usuarios confían en esPlanillasSU</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 relative">
        <div className={`absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-red-600/5 pointer-events-none`} />

        <div className={`relative z-10 w-full max-w-md transition-all duration-1000 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">esPlanillas<span className="text-red-600">SU</span></h1>
            <p className="text-gray-500 mt-1 text-sm">UGEL 08 Cañete — Registro Histórico</p>
          </div>

          {view === 'login' && loginView}
          {view === 'forgot' && forgotView}
          {view === 'reset' && resetView}

          <div className="mt-8 pt-6 border-t border-gray-200/60">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Sparkles className="w-3.5 h-3.5" />
              <p className="text-center text-xs">© {new Date().getFullYear()} esPlanillasSU — UGEL 08 Cañete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
