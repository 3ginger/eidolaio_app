import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 px-4 ${className}`}>
      {emoji && <div className="text-6xl">{emoji}</div>}
      {icon && <div className="text-gray-300">{icon}</div>}
      <h2 className="text-xl font-semibold text-eidola-text">{title}</h2>
      {description && (
        <p className="text-gray-500 text-center max-w-sm">{description}</p>
      )}
      {action}
    </div>
  )
}
