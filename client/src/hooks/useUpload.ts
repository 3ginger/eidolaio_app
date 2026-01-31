import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

interface UploadProgress {
  percent: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

interface UseUploadReturn {
  uploadFile: (file: File) => Promise<string>
  uploadBase64: (base64: string, filename?: string) => Promise<string>
  progress: UploadProgress
  isUploading: boolean
  reset: () => void
}

export function useUpload(): UseUploadReturn {
  const [progress, setProgress] = useState<UploadProgress>({
    percent: 0,
    status: 'idle',
  })

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    try {
      setProgress({ percent: 0, status: 'uploading' })

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // For now, create object URL (in production would use Uploadthing)
      // Simulating upload progress
      setProgress({ percent: 50, status: 'uploading' })

      const url = URL.createObjectURL(file)

      setProgress({ percent: 100, status: 'success' })
      return url
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setProgress({ percent: 0, status: 'error', error: message })
      throw error
    }
  }, [])

  const uploadBase64 = useCallback(async (base64: string, _filename?: string): Promise<string> => {
    try {
      setProgress({ percent: 0, status: 'uploading' })

      // Convert base64 to blob
      const response = await fetch(base64)
      const blob = await response.blob()

      setProgress({ percent: 50, status: 'uploading' })

      const url = URL.createObjectURL(blob)

      setProgress({ percent: 100, status: 'success' })
      return url
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setProgress({ percent: 0, status: 'error', error: message })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setProgress({ percent: 0, status: 'idle' })
  }, [])

  return {
    uploadFile,
    uploadBase64,
    progress,
    isUploading: progress.status === 'uploading',
    reset,
  }
}

// Hook for camera capture - uses native Capacitor camera on iOS/Android
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if we're on native platform
  const isNative = Capacitor.isNativePlatform()

  // Native camera capture using Capacitor
  const capturePhotoNative = useCallback(async (source: 'camera' | 'photos' = 'camera'): Promise<string> => {
    try {
      setError(null)
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        correctOrientation: true,
      })
      return photo.dataUrl || ''
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied'
      setError(message)
      throw err
    }
  }, [])

  // Web camera - start stream
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(mediaStream)
      return mediaStream
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied'
      setError(message)
      throw err
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  // Web camera - capture from video element
  const capturePhoto = useCallback((videoElement: HTMLVideoElement): string => {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')

    ctx.drawImage(videoElement, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.9)
  }, [])

  return {
    stream,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoNative,
    hasCamera: !!stream,
    isNative,
  }
}
