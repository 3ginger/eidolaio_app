import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  backTo?: string
  onBack?: () => void
  rightContent?: ReactNode
  subtitle?: string
  icon?: ReactNode
  sticky?: boolean
  className?: string
}

export default function PageHeader({
  title,
  backTo,
  onBack,
  rightContent,
  subtitle,
  icon,
  sticky = false,
  className = '',
}: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  const BackButton = backTo ? (
    <Link to={backTo} className="p-1 hover:bg-gray-100 rounded-full -ml-1">
      <ChevronLeft className="w-6 h-6" />
    </Link>
  ) : (
    <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-full -ml-1">
      <ChevronLeft className="w-6 h-6" />
    </button>
  )

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-white border-b ${
        sticky ? 'sticky top-0 z-10' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {BackButton}
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h1 className="font-semibold">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  )
}
