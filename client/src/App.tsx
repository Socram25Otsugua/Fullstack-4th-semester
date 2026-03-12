import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { StateleSSEClient } from 'statele-sse'
import {
  type Alert,
  type OperatorCommand,
  type SendTurbineCommandRequest,
  type TurbineMetric,
  type WindTurbine,
  ApiException,
  AuthClient,
  TurbineStatus,
  WebClientClient,
} from './generated-ts-client'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const baseUrl = ''
const sse = new StateleSSEClient(baseUrl ? `${baseUrl}/sse` : '/sse')

function createAuthFetch(getToken: () => string | null, on401?: () => void) {
  return {
    fetch: async (url: RequestInfo, init?: RequestInit) => {
      const token = getToken()
      const headers = new Headers(init?.headers as HeadersInit)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const res = await window.fetch(url, { ...init, headers })
      if (res.status === 401 && on401) on401()
      return res
    },
  }
}

const TOKEN_KEY = 'windmill-inspector-token'

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const authClient = new AuthClient(baseUrl)
const restClient = new WebClientClient(baseUrl, createAuthFetch(getStoredToken))

const STATUS_LABELS: Record<TurbineStatus, string> = {
  [TurbineStatus.Running]: 'OPERATIONAL',
  [TurbineStatus.Stopped]: 'STOPPED',
  [TurbineStatus.Maintenance]: 'MAINTENANCE',
  [TurbineStatus.Fault]: 'FAULT',
}

const STATUS_BADGE_COLORS: Record<TurbineStatus, string> = {
  [TurbineStatus.Running]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  [TurbineStatus.Stopped]: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  [TurbineStatus.Maintenance]: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  [TurbineStatus.Fault]: 'bg-red-500/20 text-red-400 border-red-500/40',
}

function formatTime(ts?: string) {
  if (!ts) return '-'
  return new Date(ts).toLocaleTimeString()
}

function WindIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 3v2M12 3v2M15 3v2M9 12v2M12 12v2M15 12v2M9 21v2M12 21v2M15 21v2M3 9h18M3 12h18M3 15h18" strokeLinecap="round" />
    </svg>
  )
}

function RotorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M7.05 7.05l2.83 2.83M14.12 14.12l2.83 2.83M7.05 16.95l2.83-2.83M14.12 9.88l2.83-2.83" strokeLinecap="round" />
    </svg>
  )
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThermometerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.24 7.76l-2.12 4.24-4.24 2.12 2.12-4.24 4.24-2.12z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
    </svg>
  )
}

function BladeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v20M12 2l4 6h-8l4-6M12 22l-4-6h8l-4 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h16" strokeLinecap="round" />
    </svg>
  )
}

function VibrationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12h2M5 8v8M9 10v4M13 8v8M17 10v4M19 12h2M21 8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="14" x2="4" y2="10" strokeLinecap="round" />
      <line x1="4" y1="20" x2="4" y2="14" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12" y2="4" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="8" strokeLinecap="round" />
      <line x1="20" y1="14" x2="20" y2="4" strokeLinecap="round" />
      <line x1="20" y1="20" x2="20" y2="14" strokeLinecap="round" />
      <line x1="2" y1="14" x2="6" y2="14" strokeLinecap="round" />
      <line x1="10" y1="8" x2="14" y2="8" strokeLinecap="round" />
      <line x1="18" y1="14" x2="22" y2="14" strokeLinecap="round" />
    </svg>
  )
}

function App() {
  const [turbines, setTurbines] = useState<WindTurbine[]>([])
  const [metrics, setMetrics] = useState<TurbineMetric[]>([])
  const [operatorCommands, setOperatorCommands] = useState<OperatorCommand[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedTurbineId, setSelectedTurbineId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bladeAngleValue, setBladeAngleValue] = useState('')
  const [yawAngleValue, setYawAngleValue] = useState('')
  const [intervalValue, setIntervalValue] = useState('10')

  const [stopReason, setStopReason] = useState('')

  const restClient = useMemo(
    () =>
      new WebClientClient(
        baseUrl,
        createAuthFetch(getStoredToken, () => {
          setStoredToken(null)
          setToken(null)
        })
      ),
    []
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await authClient.login({ username: loginUser, password: loginPass })
      if (res?.token) {
        setStoredToken(res.token)
        setToken(res.token)
      }
    } catch {
      setLoginError('Invalid username or password')
    }
  }

  const handleLogout = () => {
    setStoredToken(null)
    setToken(null)
  }

  const [commandError, setCommandError] = useState('')
  const sendCommand = async (commandType: string, parameters?: string) => {
    if (!selectedTurbineId || !token) return
    setCommandError('')
    const req: SendTurbineCommandRequest = {
      turbineId: selectedTurbineId,
      commandType,
      parameters,
    }
    try {
      await restClient.sendTurbineCommand(req)
    } catch (e) {
      if (ApiException.isApiException(e) && e.status === 401) {
        setStoredToken(null)
        setToken(null)
        return
      }
      setCommandError(e instanceof Error ? e.message : 'Command failed')
      return
    }
    if (commandType === 'Start') {
      setTurbines((prev) =>
        prev.map((t) =>
          t.id === selectedTurbineId ? { ...t, status: TurbineStatus.Running } : t
        )
      )
    } else if (commandType === 'Stop' || commandType === 'EmergencyStop') {
      setTurbines((prev) =>
        prev.map((t) =>
          t.id === selectedTurbineId ? { ...t, status: TurbineStatus.Stopped } : t
        )
      )
    }
    if (commandType === 'Stop') setStopReason('')
  }

  useEffect(() => {
    const unsubTurbines = sse.listen<WindTurbine[]>(
      (id) => restClient.getTurbines(id),
      (data) => setTurbines(data ?? [])
    )
    const unsubCommands = sse.listen<OperatorCommand[]>(
      (id) => restClient.getOperatorCommands(id, selectedTurbineId ?? undefined),
      (data) => setOperatorCommands(data ?? [])
    )
    const unsubAlerts = sse.listen<Alert[]>(
      (id) => restClient.getAlerts(id),
      (data) => setAlerts(data ?? [])
    )
    return () => {
      unsubTurbines()
      unsubCommands()
      unsubAlerts()
    }
  }, [selectedTurbineId])

  useEffect(() => {
    if (!selectedTurbineId) {
      setMetrics([])
      return
    }
    const unsub = sse.listen<TurbineMetric[]>(
      (id) => restClient.getTurbineMetrics(id, selectedTurbineId),
      (data) => setMetrics(data ?? [])
    )
    return unsub
  }, [selectedTurbineId])

  const chartData = [...(metrics ?? [])].reverse().map((m) => ({
    time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '',
    power: m.powerOutputKw,
    wind: m.windSpeedMs,
    temp: m.temperature,
    bladeAngle: m.bladeAngleDeg,
    vibration: m.vibration,
  }))

  const selectedTurbine = turbines.find((t) => t.id === selectedTurbineId)
  const latestMetric = metrics[0]

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Wind Turbine Inspector</h1>
            <p className="text-white/60 text-sm mt-2">Sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 placeholder-white/40"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 placeholder-white/40"
              />
            </div>
            {loginError && (
              <p className="text-red-400 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Wind Turbine Inspector</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
        >
          Log out
        </button>
      </header>

      <main className="p-6">
        {!selectedTurbineId ? (
          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <h2 className="text-lg font-semibold text-white/80 col-span-full mb-2">Select a turbine</h2>
              {turbines.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTurbineId(t.id ?? null)}
                  className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.status === TurbineStatus.Running ? 'bg-emerald-500' : t.status === TurbineStatus.Fault ? 'bg-red-500' : 'bg-slate-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-sm text-white/60 truncate">{t.location}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
                <AlertIcon className="w-5 h-5 text-amber-400" />
                Alerts
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(alerts ?? []).map((a) => (
                  <div
                    key={a.id}
                    className={`p-2 rounded-lg text-sm flex flex-wrap items-center gap-2 border ${
                      a.severity === 2 ? 'bg-red-500/10 border-red-500/40' : a.severity === 1 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <span className="text-white/80">{a.message}</span>
                    <span className="text-white/50 text-xs">{a.turbineId}</span>
                    <span className="text-white/40 text-xs">{formatTime(a.timestamp)}</span>
                  </div>
                ))}
                {(!alerts || alerts.length === 0) && (
                  <p className="text-white/40 text-sm">No alerts</p>
                )}
              </div>
            </div>
          </div>
        ) : selectedTurbine ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTurbineId(null)}
                  className="text-white/60 hover:text-white text-sm"
                >
                  ← Back
                </button>
                <div>
                  <h2 className="text-2xl font-bold">{selectedTurbine.name}</h2>
                  <p className="text-sm text-white/60">{selectedTurbine.id} • {selectedTurbine.location}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE_COLORS[selectedTurbine.status ?? 0]}`}>
                {STATUS_LABELS[selectedTurbine.status ?? 0]}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <WindIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Wind Speed</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.windSpeedMs?.toFixed(2) ?? '-'} m/s</div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <RotorIcon className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Rotor Speed</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.rpm?.toFixed(2) ?? '-'} RPM</div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <ZapIcon className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Power Output</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.powerOutputKw?.toFixed(2) ?? '-'} kW</div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <ThermometerIcon className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Temperature</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.temperature?.toFixed(2) ?? '-'} °C</div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <BladeIcon className="w-8 h-8 text-violet-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Blade Angle</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.bladeAngleDeg != null ? `${latestMetric.bladeAngleDeg.toFixed(2)}°` : '-'}</div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <VibrationIcon className="w-8 h-8 text-orange-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/50">Vibration</div>
                  <div className="text-xl font-mono font-semibold">{latestMetric?.vibration != null ? latestMetric.vibration.toFixed(2) : '-'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-medium text-white/70 mb-4">Power Performance</h3>
                  <div className="w-full relative min-w-0" style={{ width: '100%', minHeight: 220, height: 220 }}>
                    <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1} initialDimension={{ width: 400, height: 220 }}>
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <defs>
                          <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }} />
                        <Area type="monotone" dataKey="power" stroke="#22c55e" fill="url(#powerGradient)" strokeWidth={2} name="Power (kW)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    {chartData.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                        Waiting for metrics…
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-medium text-white/70 mb-4">Wind Performance</h3>
                  <div className="w-full relative min-w-0" style={{ width: '100%', minHeight: 220, height: 220 }}>
                    <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1} initialDimension={{ width: 400, height: 220 }}>
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <defs>
                          <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }} />
                        <Area type="monotone" dataKey="wind" stroke="#3b82f6" fill="url(#windGradient)" strokeWidth={2} name="Wind (m/s)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    {chartData.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                        Waiting for metrics…
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-medium text-white/70 mb-4">Temperature, Blade Angle & Vibration</h3>
                  <div className="w-full relative min-w-0" style={{ width: '100%', minHeight: 180, height: 180 }}>
                    <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={1} debounce={50} initialDimension={{ width: 400, height: 180 }}>
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} stroke="rgba(255,255,255,0.3)" />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)' }} />
                        <Line type="monotone" dataKey="temp" stroke="#ef4444" dot={false} strokeWidth={2} name="Temperature (°C)" />
                        <Line type="monotone" dataKey="bladeAngle" stroke="#a855f7" dot={false} strokeWidth={2} name="Blade angle (°)" />
                        <Line type="monotone" dataKey="vibration" stroke="#f97316" dot={false} strokeWidth={2} name="Vibration" />
                      </LineChart>
                    </ResponsiveContainer>
                    {chartData.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                        Waiting for metrics…
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {token && (
                  <div className="rounded-xl bg-white/[0.07] border border-white/10 p-6 space-y-6 shadow-lg">
                    <h3 className="text-base font-semibold text-white/90 flex items-center gap-2">
                      <SlidersIcon className="w-5 h-5 text-cyan-400" />
                      Unit Controls
                    </h3>
                    {commandError && (
                      <p className="text-red-400 text-sm">{commandError}</p>
                    )}
                    <div className="space-y-4 p-4 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Blade pitch</label>
                        <span className="text-xs text-white/50">Current: {bladeAngleValue ? `${bladeAngleValue}°` : latestMetric?.bladeAngleDeg != null ? `${latestMetric.bladeAngleDeg}°` : '—'} · 0°–30°</span>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        {[0, 10, 15, 20, 30].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setBladeAngleValue(String(v))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${bladeAngleValue === String(v) ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                          >
                            {v}°
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={bladeAngleValue !== '' ? Number(bladeAngleValue) : (latestMetric?.bladeAngleDeg != null ? Math.min(30, Math.max(0, latestMetric.bladeAngleDeg)) : 0)}
                          onChange={(e) => setBladeAngleValue(e.target.value)}
                          className="flex-1 h-3 rounded-lg appearance-none bg-white/10 accent-violet-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          placeholder="°"
                          min={0}
                          max={30}
                          value={bladeAngleValue}
                          onChange={(e) => setBladeAngleValue(e.target.value)}
                          className="w-14 px-2 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                      </div>
                      <button
                        onClick={() => sendCommand('SetBladeAngle', bladeAngleValue)}
                        disabled={!bladeAngleValue.trim()}
                        className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        Apply blade pitch
                      </button>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Reporting interval</label>
                        <span className="text-xs text-white/50">Current: {intervalValue ? `${intervalValue}s` : '—'} · 1–60s</span>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        {[5, 10, 30, 60].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setIntervalValue(String(v))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${intervalValue === String(v) ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                          >
                            {v}s
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="10"
                          min={1}
                          max={60}
                          value={intervalValue}
                          onChange={(e) => setIntervalValue(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <button
                          onClick={() => sendCommand('SetInterval', intervalValue)}
                          disabled={!intervalValue.trim()}
                          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Yaw angle</label>
                        <span className="text-xs text-white/50">Current: {yawAngleValue ? `${yawAngleValue}°` : '—'} · 0°–360° N=0° E=90°</span>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        {([0, 90, 180, 270] as const).map((v) => {
                          const dir = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[v]
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setYawAngleValue(String(v))}
                              title={`${v}° (${dir})`}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${yawAngleValue === String(v) ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                            >
                              {v}° <span className="text-white/50 text-xs ml-0.5">{dir}</span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={yawAngleValue !== '' ? Number(yawAngleValue) : 180}
                          onChange={(e) => setYawAngleValue(e.target.value)}
                          className="flex-1 h-3 rounded-lg appearance-none bg-white/10 accent-amber-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          placeholder="180"
                          min={0}
                          max={360}
                          value={yawAngleValue}
                          onChange={(e) => setYawAngleValue(e.target.value)}
                          className="w-14 px-2 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <button
                        onClick={() => sendCommand('SetYawAngle', yawAngleValue)}
                        disabled={!yawAngleValue.trim()}
                        className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        Apply yaw angle
                      </button>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-4">
                      <label className="text-sm font-medium text-white/80 block">Power control</label>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => sendCommand('Start', stopReason || undefined)}
                          className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors shadow-sm"
                        >
                          <RefreshIcon className="w-4 h-4" />
                          Start
                        </button>
                        <button
                          onClick={() => sendCommand('Stop', stopReason || undefined)}
                          className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium transition-colors shadow-sm"
                        >
                          Stop
                        </button>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Optional: message for start/stop (audit log)"
                          value={stopReason}
                          onChange={(e) => setStopReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder-white/40"
                        />
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => sendCommand('EmergencyStop', stopReason || undefined)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600/90 hover:bg-red-500 text-sm font-semibold transition-colors border-2 border-red-500/60 shadow-lg shadow-red-900/20"
                        >
                          <AlertIcon className="w-4 h-4" />
                          Emergency stop
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
                <AlertIcon className="w-5 h-5 text-amber-400" />
                Alerts
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto mb-6">
                {(alerts ?? []).filter((a) => !selectedTurbineId || a.turbineId === selectedTurbineId).map((a) => (
                  <div
                    key={a.id}
                    className={`p-2 rounded-lg text-sm flex flex-wrap items-center gap-2 border ${
                      a.severity === 2 ? 'bg-red-500/10 border-red-500/40' : a.severity === 1 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <span className="text-white/80">{a.message}</span>
                    <span className="text-white/50 text-xs">{a.turbineId}</span>
                    <span className="text-white/40 text-xs">{formatTime(a.timestamp)}</span>
                  </div>
                ))}
                {(!alerts || alerts.length === 0) && (
                  <p className="text-white/40 text-sm">No alerts</p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-sm font-medium text-white/70 mb-4">Audit Log</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(operatorCommands ?? []).map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-white/5 text-sm flex flex-wrap items-center gap-2">
                    <span className="text-white/80">{c.commandType}</span>
                    {c.parameters && <span className="font-mono text-white/50">{c.parameters}</span>}
                    <span className="text-white/40 text-xs">{formatTime(c.timestamp)}</span>
                  </div>
                ))}
                {(!operatorCommands || operatorCommands.length === 0) && (
                  <p className="text-white/40 text-sm">No commands yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/50">Turbine not found</p>
        )}
      </main>
    </div>
  )
}

export default App
