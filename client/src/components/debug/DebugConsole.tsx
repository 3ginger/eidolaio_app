import { useState, useEffect, useRef } from 'react'
import { X, Copy, Trash2, Check } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useDebug, LogEntry } from '../../contexts/DebugContext'
import { isNativePlatform } from '../../utils/nativeAuth'

interface DebugConsoleProps {
  isOpen: boolean
  onClose: () => void
}

export default function DebugConsole({ isOpen, onClose }: DebugConsoleProps) {
  const { logs, clearLogs, isDebugEnabled } = useDebug()
  const [authState, setAuthState] = useState<{ isLoaded: boolean | null; isSignedIn: boolean | null; userId: string | null }>({
    isLoaded: null,
    isSignedIn: null,
    userId: null
  })
  const [copied, setCopied] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Try to get auth state safely
  useEffect(() => {
    try {
      // Check if Clerk is available by looking for the context
      const clerkState = (window as any).__clerk_frontend_api || (window as any).Clerk
      if (clerkState) {
        const session = clerkState.session
        setAuthState({
          isLoaded: true,
          isSignedIn: !!session,
          userId: session?.user?.id || null
        })
      }
    } catch {
      // Clerk not available
    }
  }, [isOpen])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen])

  if (!isOpen) return null

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-300'
    }
  }

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'ERR'
      case 'warn': return 'WRN'
      case 'info': return 'INF'
      default: return 'LOG'
    }
  }

  const copyLogs = async () => {
    const logText = [
      '=== EIDOLA DEBUG CONSOLE ===',
      '',
      '--- PLATFORM ---',
      `Native: ${isNativePlatform()}`,
      `API URL: ${import.meta.env.VITE_API_URL || 'not set'}`,
      '',
      '--- AUTH ---',
      `Clerk loaded: ${authState.isLoaded ?? 'unknown'}`,
      `Signed in: ${authState.isSignedIn ?? 'unknown'}`,
      `User ID: ${authState.userId ? `${authState.userId.slice(0, 8)}...` : '-'}`,
      '',
      '--- LOGS ---',
      ...logs.map(log => `${formatTime(log.timestamp)} [${getLevelBadge(log.level)}] ${log.message}`),
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(logText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const maskUserId = (id: string | undefined | null) => {
    if (!id) return '-'
    return `${id.slice(0, 8)}...`
  }

  // Check for specific Capacitor plugins
  const checkPlugin = (name: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(Capacitor as any).Plugins?.[name] ||
             !!(window as any).Capacitor?.Plugins?.[name]
    } catch {
      return false
    }
  }

  const renderAuthStatus = (value: boolean | null, trueText: string, falseText: string, loadingText: string) => {
    if (value === null) return <span className="text-gray-500">{loadingText}</span>
    return value
      ? <span className="text-green-400">{trueText}</span>
      : <span className="text-gray-400">{falseText}</span>
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 text-white font-mono text-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
        <h2 className="text-lg font-bold text-eidola-orange">DEBUG CONSOLE</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={copyLogs}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy logs"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Platform Section */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Platform</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Native:</span>
              <span className={isNativePlatform() ? 'text-green-400' : 'text-gray-400'}>
                {isNativePlatform() ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">API URL:</span>
              <span className="text-white truncate ml-2 max-w-[200px]">
                {import.meta.env.VITE_API_URL || 'not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Debug enabled:</span>
              <span className={isDebugEnabled ? 'text-green-400' : 'text-red-400'}>
                {isDebugEnabled ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Auth</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Clerk loaded:</span>
              {renderAuthStatus(authState.isLoaded, 'Yes', 'No', 'Unknown')}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Signed in:</span>
              {renderAuthStatus(authState.isSignedIn, 'Yes', 'No', 'Unknown')}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">User ID:</span>
              <span className="text-white">{maskUserId(authState.userId)}</span>
            </div>
          </div>
        </div>

        {/* Capacitor Plugins Section */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Capacitor Plugins</h3>
          <div className="grid grid-cols-2 gap-1 text-sm">
            {['NativeAuth', 'Camera', 'StatusBar', 'SplashScreen', 'Device', 'Geolocation'].map(plugin => (
              <div key={plugin} className="flex items-center gap-2">
                <span className={checkPlugin(plugin) ? 'text-green-400' : 'text-gray-600'}>
                  {checkPlugin(plugin) ? '✓' : '✗'}
                </span>
                <span className="text-gray-400">{plugin}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logs Section */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Logs ({logs.length})
          </h3>
          <div className="space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No logs captured yet</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex gap-2 text-xs">
                  <span className="text-gray-500 shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={`shrink-0 font-bold ${getLevelColor(log.level)}`}>
                    [{getLevelBadge(log.level)}]
                  </span>
                  <span className={`break-all ${getLevelColor(log.level)}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-500">
        Triple-tap top-left corner to open/close
      </div>
    </div>
  )
}
