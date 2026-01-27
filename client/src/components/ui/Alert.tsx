import { X } from 'lucide-react'

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
  onDismiss?: () => void
  className?: string
}

const styles = {
  error: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
}

export default function Alert({ type, message, onDismiss, className = '' }: AlertProps) {
  return (
    <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${styles[type]} ${className}`}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
