import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { isNativePlatform } from '../utils/nativeAuth'

export type LogLevel = 'log' | 'warn' | 'error' | 'info'

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
}

interface DebugContextValue {
  logs: LogEntry[]
  addLog: (level: LogLevel, message: string) => void
  clearLogs: () => void
  isDebugEnabled: boolean
}

const DebugContext = createContext<DebugContextValue | null>(null)

export function useDebug() {
  const context = useContext(DebugContext)
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider')
  }
  return context
}

// Store logs before provider mounts
const earlyLogs: LogEntry[] = []
let earlyLogId = 0

// Intercept console methods early (before React renders)
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
}

function createLogEntry(level: LogLevel, args: unknown[]): LogEntry {
  const message = args
    .map(arg => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')

  return {
    id: `${Date.now()}-${earlyLogId++}`,
    timestamp: new Date(),
    level,
    message,
  }
}

// Only intercept in native platform or when debug param is present
const shouldCapture = isNativePlatform() ||
  (typeof window !== 'undefined' && window.location.search.includes('debug=true'))

if (shouldCapture) {
  console.log = (...args: unknown[]) => {
    earlyLogs.push(createLogEntry('log', args))
    if (earlyLogs.length > 100) earlyLogs.shift()
    originalConsole.log.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    earlyLogs.push(createLogEntry('warn', args))
    if (earlyLogs.length > 100) earlyLogs.shift()
    originalConsole.warn.apply(console, args)
  }

  console.error = (...args: unknown[]) => {
    earlyLogs.push(createLogEntry('error', args))
    if (earlyLogs.length > 100) earlyLogs.shift()
    originalConsole.error.apply(console, args)
  }

  console.info = (...args: unknown[]) => {
    earlyLogs.push(createLogEntry('info', args))
    if (earlyLogs.length > 100) earlyLogs.shift()
    originalConsole.info.apply(console, args)
  }
}

export function DebugProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const isDebugEnabled = shouldCapture

  // Initialize with early logs on mount
  useEffect(() => {
    if (earlyLogs.length > 0) {
      setLogs([...earlyLogs])
    }
  }, [])

  // Continue capturing logs after mount
  useEffect(() => {
    if (!isDebugEnabled) return

    const captureLog = (level: LogLevel) => (...args: unknown[]) => {
      const entry = createLogEntry(level, args)
      setLogs(prev => {
        const newLogs = [...prev, entry]
        if (newLogs.length > 100) newLogs.shift()
        return newLogs
      })
      originalConsole[level].apply(console, args)
    }

    console.log = captureLog('log')
    console.warn = captureLog('warn')
    console.error = captureLog('error')
    console.info = captureLog('info')

    return () => {
      // Restore original console on unmount
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.info = originalConsole.info
    }
  }, [isDebugEnabled])

  const addLog = useCallback((level: LogLevel, message: string) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
    }
    setLogs(prev => {
      const newLogs = [...prev, entry]
      if (newLogs.length > 100) newLogs.shift()
      return newLogs
    })
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <DebugContext.Provider value={{ logs, addLog, clearLogs, isDebugEnabled }}>
      {children}
    </DebugContext.Provider>
  )
}
