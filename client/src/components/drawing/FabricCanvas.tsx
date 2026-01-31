import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, PencilBrush, FabricImage, util, FabricObject } from 'fabric'
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
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF8C42', '#FFEB3B',
  '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#795548'
]

export default function FabricCanvas({ imageUrl, onSave, initialData }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [brushColor, setBrushColor] = useState('#FF0000')
  const [brushSize, setBrushSize] = useState(8)
  const [isEraser, setIsEraser] = useState(false)
  const isEraserRef = useRef(false) // Ref for event handlers
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Use refs for history to avoid stale closures
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  const backgroundImageRef = useRef<FabricImage | null>(null)

  // State for UI updates (disabled states)
  const [historyLength, setHistoryLength] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Save to history using refs to avoid stale closures
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current || !fabricRef.current) return

    // Only save the drawing objects, not the entire canvas (which includes background)
    const objects = fabricRef.current.getObjects()
    const json = JSON.stringify(objects.map(obj => obj.toObject()))

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
      backgroundColor: '#1f2937', // Match ImagePositioner background
    })

    fabricRef.current = canvas

    // Set up brush
    const brush = new PencilBrush(canvas)
    brush.width = brushSize
    brush.color = brushColor
    canvas.freeDrawingBrush = brush

    // Load background image (already transformed from ImagePositioner)
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Fit image to canvas (image is already transformed, just need to scale to fit)
      const scale = Math.min(
        canvas.width! / img.width!,
        canvas.height! / img.height!
      )
      const left = (canvas.width! - img.width! * scale) / 2
      const top = (canvas.height! - img.height! * scale) / 2

      img.scale(scale)
      img.set({
        left,
        top,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      })
      canvas.backgroundImage = img
      backgroundImageRef.current = img // Store reference for undo/redo
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

    // Handle path creation for history and eraser mode
    canvas.on('path:created', (e) => {
      // If in eraser mode, remove paths that intersect with the eraser stroke
      if (isEraserRef.current && e.path) {
        const eraserPath = e.path
        const eraserBounds = eraserPath.getBoundingRect()
        
        // Find all paths that intersect with eraser bounds
        const objectsToRemove: FabricObject[] = []
        canvas.getObjects().forEach((obj) => {
          if (obj === eraserPath) return // Skip the eraser path itself
          const objBounds = obj.getBoundingRect()
          // Check if bounding boxes intersect
          if (
            eraserBounds.left < objBounds.left + objBounds.width &&
            eraserBounds.left + eraserBounds.width > objBounds.left &&
            eraserBounds.top < objBounds.top + objBounds.height &&
            eraserBounds.top + eraserBounds.height > objBounds.top
          ) {
            objectsToRemove.push(obj)
          }
        })
        
        // Remove intersecting objects
        objectsToRemove.forEach((obj) => canvas.remove(obj))
        
        // Remove the eraser path itself (we don't want to see it)
        canvas.remove(eraserPath)
        canvas.renderAll()
      }
      saveToHistory()
    })

    return () => {
      canvas.dispose()
    }
  }, [imageUrl, saveToHistory])

  // Update brush settings and eraser ref
  useEffect(() => {
    isEraserRef.current = isEraser
    if (!fabricRef.current) return
    const brush = fabricRef.current.freeDrawingBrush as PencilBrush
    if (brush) {
      brush.width = brushSize
      // In eraser mode, use semi-transparent red to show what will be erased
      brush.color = isEraser ? 'rgba(255, 100, 100, 0.5)' : brushColor
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
    const canvas = fabricRef.current

    // Remove all drawing objects (background stays)
    canvas.getObjects().forEach(obj => canvas.remove(obj))

    // Restore objects from history
    const objectsJson = JSON.parse(historyRef.current[newIndex])
    if (objectsJson.length > 0) {
      util.enlivenObjects(objectsJson).then((enlivenedObjects) => {
        (enlivenedObjects as FabricObject[]).forEach(obj => canvas.add(obj))
        canvas.renderAll()
      })
    } else {
      canvas.renderAll()
    }

    historyIndexRef.current = newIndex
    setCurrentIndex(newIndex)
    setTimeout(() => { isUndoRedoRef.current = false }, 50)
  }, [])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return

    isUndoRedoRef.current = true
    const newIndex = historyIndexRef.current + 1
    const canvas = fabricRef.current

    // Remove all drawing objects (background stays)
    canvas.getObjects().forEach(obj => canvas.remove(obj))

    // Restore objects from history
    const objectsJson = JSON.parse(historyRef.current[newIndex])
    if (objectsJson.length > 0) {
      util.enlivenObjects(objectsJson).then((enlivenedObjects) => {
        (enlivenedObjects as FabricObject[]).forEach(obj => canvas.add(obj))
        canvas.renderAll()
      })
    } else {
      canvas.renderAll()
    }

    historyIndexRef.current = newIndex
    setCurrentIndex(newIndex)
    setTimeout(() => { isUndoRedoRef.current = false }, 50)
  }, [])

  const toggleEraser = () => {
    setIsEraser(!isEraser)
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-900 overflow-hidden">
      {/* Canvas - takes remaining space */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <canvas ref={canvasRef} className="drawing-canvas" />
      </div>

      {/* Toolbar - fixed height */}
      <div className="flex-shrink-0 bg-white px-4 py-3 flex items-center justify-between border-t">
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
