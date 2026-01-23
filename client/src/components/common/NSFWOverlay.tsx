import { AlertTriangle, Eye } from 'lucide-react'

interface NSFWOverlayProps {
  children: React.ReactNode
  onReveal: () => void
}

export default function NSFWOverlay({ children, onReveal }: NSFWOverlayProps) {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="nsfw-blur">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center">
        <div className="bg-white/90 rounded-2xl p-6 text-center max-w-xs mx-4 shadow-lg">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            18+ Content
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            This content has been marked as sensitive or adult material
          </p>
          <button
            onClick={onReveal}
            className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            Tap to reveal
          </button>
        </div>
      </div>
    </div>
  )
}
