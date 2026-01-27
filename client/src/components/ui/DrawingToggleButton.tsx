import { MouseEvent } from 'react'
import { Pencil, Image } from 'lucide-react'

interface DrawingToggleButtonProps {
  showDrawing: boolean
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export default function DrawingToggleButton({
  showDrawing,
  onToggle,
  className = '',
}: DrawingToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-black/70 ${className}`}
      title={showDrawing ? 'Show original' : 'Show drawing'}
    >
      {showDrawing ? (
        <Image className="w-5 h-5 text-white" />
      ) : (
        <Pencil className="w-5 h-5 text-white" />
      )}
    </button>
  )
}
