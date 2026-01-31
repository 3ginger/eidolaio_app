import { useState, useCallback } from 'react'

interface UseFormSubmitOptions<T> {
  onSubmit: () => Promise<T>
  onSuccess?: (result: T) => void
  onError?: (error: Error) => void
}

interface UseFormSubmitResult<T> {
  submit: () => Promise<T | undefined>
  isSubmitting: boolean
  error: string | null
  clearError: () => void
}

export function useFormSubmit<T>({
  onSubmit,
  onSuccess,
  onError,
}: UseFormSubmitOptions<T>): UseFormSubmitResult<T> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const submit = useCallback(async (): Promise<T | undefined> => {
    try {
      setIsSubmitting(true)
      setError(null)
      const result = await onSubmit()
      if (onSuccess) {
        onSuccess(result)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      if (onError && err instanceof Error) {
        onError(err)
      }
      return undefined
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit, onSuccess, onError])

  return { submit, isSubmitting, error, clearError }
}

export default useFormSubmit
