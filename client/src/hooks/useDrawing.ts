import { useState, useCallback } from 'react'

interface DrawingState {
  canvasData: object | null
  dataUrl: string | null
  isModified: boolean
}

interface UseDrawingReturn {
  drawingState: DrawingState
  setCanvasData: (data: object) => void
  setDataUrl: (url: string) => void
  clear: () => void
  hasDrawing: boolean
}

export function useDrawing(): UseDrawingReturn {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    canvasData: null,
    dataUrl: null,
    isModified: false,
  })

  const setCanvasData = useCallback((data: object) => {
    setDrawingState(prev => ({
      ...prev,
      canvasData: data,
      isModified: true,
    }))
  }, [])

  const setDataUrl = useCallback((url: string) => {
    setDrawingState(prev => ({
      ...prev,
      dataUrl: url,
    }))
  }, [])

  const clear = useCallback(() => {
    setDrawingState({
      canvasData: null,
      dataUrl: null,
      isModified: false,
    })
  }, [])

  return {
    drawingState,
    setCanvasData,
    setDataUrl,
    clear,
    hasDrawing: drawingState.isModified && drawingState.canvasData !== null,
  }
}
