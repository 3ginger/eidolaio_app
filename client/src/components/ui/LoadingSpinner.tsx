import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'orange' | 'teal' | 'default'
  fullHeight?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

const colorClasses = {
  orange: 'text-eidola-orange',
  teal: 'text-eidola-teal',
  default: 'text-gray-400',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'orange',
  fullHeight = false,
  className = '',
}: LoadingSpinnerProps) {
  const containerClass = fullHeight
    ? 'flex items-center justify-center min-h-[50vh]'
    : 'flex items-center justify-center'

  return (
    <div className={`${containerClass} ${className}`}>
      <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
    </div>
  )
}
