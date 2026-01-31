import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  color?: 'default' | 'orange' | 'red'
  className?: string
}

const colorClasses = {
  default: {
    icon: 'text-gray-500',
    value: '',
  },
  orange: {
    icon: 'text-orange-500',
    value: 'text-orange-500',
  },
  red: {
    icon: 'text-red-500',
    value: 'text-red-500',
  },
}

export default function StatCard({
  icon,
  label,
  value,
  color = 'default',
  className = '',
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${className}`}>
      <div className={`flex items-center gap-2 mb-1 ${colors.icon}`}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors.value}`}>{value}</div>
    </div>
  )
}
