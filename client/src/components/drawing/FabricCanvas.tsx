import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, PencilBrush, FabricImage } from 'fabric'
import {
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Palette,
  Minus,
  Plus
} from 'lucide-react'

interface FabricCanvasProps {
  imageUrl: string
  onSave: (data: object) => void
  initialData?: object
  imageTransform?: ImageTransform
}

export interface ImageTransform {
  x: number
  y: number
  scale: number
  rotation: number
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF8C42', '#FFEB3B',
  '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#795548'
]

export default function FabricCanvas({ imageUrl, onSave, initialData, imageTransform }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [brushColor, setBrushColor] = useState('#FF0000')
  const [brushSize, setBrushSize] = useState(8)
  const [isEraser, setIsEraser] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Use refs for history to avoid stale closures
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)

  // State for UI updates (disabled states)
  const [historyLength, setHistoryLength] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Save to history using refs to avoid stale closures
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current || !fabricRef.current) return

    const json = JSON.stringify(fabricRef.current.toJSON())
    const newHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), json]
    historyRef.current = newHistory
    historyIndexRef.current = newHistory.length - 1

    // Update state for UI (disabled states)
    setHistoryLength(newHistory.length)
    setCurrentIndex(historyIndexRef.current)
  }, [])

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: window.innerWidth,
      height: window.innerWidth, // Square canvas
    })

    fabricRef.current = canvas

    // Set up brush
    const brush = new PencilBrush(canvas)
    brush.width = brushSize
    brush.color = brushColor
    canvas.freeDrawingBrush = brush

    // Load background image
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Apply transform if provided (from ImagePositioner)
      let scale: number
      let left: number
      let top: number
      let angle = 0

      if (imageTransform) {
        scale = imageTransform.scale
        left = imageTransform.x + (canvas.width! / 2) - (img.width! * scale / 2)
        top = imageTransform.y + (canvas.height! / 2) - (img.height! * scale / 2)
        angle = imageTransform.rotation
      } else {
        // Default: fit to canvas
        scale = Math.min(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        )
        left = (canvas.width! - img.width! * scale) / 2
        top = (canvas.height! - img.height! * scale) / 2
      }

      img.scale(scale)
      img.set({
        left,
        top,
        angle,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      })
      canvas.backgroundImage = img
      canvas.renderAll()

      // Load initial data if provided
      if (initialData) {
        canvas.loadFromJSON(initialData, () => {
          canvas.renderAll()
        })
      }

      // Save initial state
      saveToHistory()
    })

    // Handle path creation for history
    canvas.on('path:created', () => {
      saveToHistory()
    })

    return () => {
      canvas.dispose()
    }
  }, [imageUrl, imageTransform, saveToHistory])

  // Update brush settings
  useEffect(() => {
    if (!fabricRef.current) return
    const brush = fabricRef.current.freeDrawingBrush as PencilBrush
    if (brush) {
      brush.width = brushSize
      brush.color = isEraser ? '#FFFFFF' : brushColor
    }
  }, [brushColor, brushSize, isEraser])

  // Save to parent on change
  useEffect(() => {
    if (!fabricRef.current) return

    const saveData = () => {
      const data = fabricRef.current?.toJSON()
      if (data) {
        // Also save as data URL for comparison
        const dataUrl = fabricRef.current?.toDataURL()
        onSave({ ...data, dataUrl })
      }
    }

    fabricRef.current.on('mouse:up', saveData)
    fabricRef.current.on('object:modified', saveData)

    return () => {
      fabricRef.current?.off('mouse:up', saveData)
      fabricRef.current?.off('object:modified', saveData)
    }
  }, [onSave])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !fabricRef.current) return

    isUndoRedoRef.current = true
    const newIndex = historyIndexRef.current - 1

    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[newIndex]), () => {
      fabricRef.current?.renderAll()
      historyIndexRef.current = newIndex
      setCurrentIndex(newIndex)
      // Delay resetting flag to ensure no intermediate events are captured
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 50)
    })
  }, [])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return

    isUndoRedoRef.current = true
    const newIndex = historyIndexRef.current + 1

    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[newIndex]), () => {
      fabricRef.current?.renderAll()
      historyIndexRef.current = newIndex
      setCurrentIndex(newIndex)
      // Delay resetting flag to ensure no intermediate events are captured
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 50)
    })
  }, [])

  const toggleEraser = () => {
    setIsEraser(!isEraser)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="drawing-canvas" />
      </div>

      {/* Toolbar */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t">
        {/* Left tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEraser(false)}
            className={`p-2 rounded-lg ${!isEraser ? 'bg-eidola-orange text-white' : 'bg-gray-100'}`}
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={toggleEraser}
            className={`p-2 rounded-lg ${isEraser ? 'bg-eidola-orange text-white' : 'bg-gray-100'}`}
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBrushSize(Math.max(1, brushSize - 4))}
            className="p-2 bg-gray-100 rounded-lg"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="w-16 text-center text-sm font-medium">
            {brushSize}px
          </div>
          <button
            onClick={() => setBrushSize(Math.min(50, brushSize + 4))}
            className="p-2 bg-gray-100 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg bg-gray-100"
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-inner"
              style={{ backgroundColor: brushColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg p-3 grid grid-cols-5 gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    setBrushColor(color)
                    setIsEraser(false)
                    setShowColorPicker(false)
                  }}
                  className={`w-8 h-8 rounded-full border-2 ${
                    brushColor === color ? 'border-eidola-orange' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {/* Custom color input */}
              <label className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center">
                <Palette className="w-4 h-4 text-white" />
                <input
                  type="color"
                  value={brushColor}
                  onChange={e => {
                    setBrushColor(e.target.value)
                    setIsEraser(false)
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={currentIndex <= 0}
            className="p-2 bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={currentIndex >= historyLength - 1}
            className="p-2 bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
