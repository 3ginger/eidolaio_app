import { useState, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { createPost } from '../hooks/usePosts'
import { useTags } from '../hooks/usePosts'
import { useAsyncData } from '../hooks/useAsyncData'
import { useFormSubmit } from '../hooks/useFormSubmit'
import { get, post as apiPost } from '../utils/api'
import FabricCanvas from '../components/drawing/FabricCanvas'
import ImagePositioner, { type ImageTransform } from '../components/drawing/ImagePositioner'
import LocationPicker from '../components/map/LocationPicker'
import TagSelector from '../components/post/TagSelector'
import type { Post } from '../types/post'
import {
  Camera,
  Upload,
  MapPin,
  Clock,
  Trophy,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link2
} from 'lucide-react'

type PostType = 'persistent' | 'temporary' | 'challenge'
type Step = 'upload' | 'position' | 'draw' | 'details' | 'location'

// Generate transformed image from the original using canvas
async function generateTransformedImage(
  originalUrl: string,
  transform: ImageTransform,
  containerSize: { width: number; height: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Create a square canvas matching the container width (what user sees)
      const canvas = document.createElement('canvas')
      const size = containerSize.width
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      // Clear canvas with dark grey background (matches ImagePositioner)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, size, size)

      // Apply transforms: translate to center, then apply user transforms
      ctx.save()

      // Move to center of canvas, then apply user's x/y offset
      ctx.translate(size / 2 + transform.x, size / 2 + transform.y)

      // Apply rotation (convert degrees to radians)
      ctx.rotate(transform.rotation * Math.PI / 180)

      // Apply scale
      ctx.scale(transform.scale, transform.scale)

      // Draw image centered at origin
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      ctx.restore()

      // Export as blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to generate image'))
        }
      }, 'image/jpeg', 0.9)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = originalUrl
  })
}

const expirationOptions = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '24 hours', value: 24 },
  { label: '3 days', value: 72 },
  { label: '1 week', value: 168 },
]

// Extracted component for chain context display
function ChainContext({ post, label }: { post: Post; label: string }) {
  return (
    <div className="mb-6 p-4 bg-eidola-teal/10 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-5 h-5 text-eidola-teal" />
        <span className="font-medium text-eidola-teal">{label}</span>
      </div>
      <Link to={`/post/${post.id}`} className="flex items-center gap-3 text-sm">
        <img
          src={post.thumbnailUrl || post.imageUrl}
          alt="Parent post"
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">@{post.user?.username}'s post</p>
          {post.address && (
            <p className="text-gray-500 truncate text-xs">
              <MapPin className="w-3 h-3 inline mr-1" />
              {post.address}
            </p>
          )}
        </div>
      </Link>
    </div>
  )
}

// Extracted component for challenge settings
function ChallengeSettings({ type, setType, difficulty, setDifficulty }: {
  type: 'draw' | 'text'
  setType: (t: 'draw' | 'text') => void
  difficulty: 'easy' | 'medium' | 'hard'
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void
}) {
  return (
    <>
      <div className="mb-3">
        <label className="text-sm text-gray-600 block mb-2">Type</label>
        <div className="flex gap-2">
          {(['draw', 'text'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg ${type === t ? 'bg-eidola-magenta text-white' : 'bg-white'}`}
            >
              {t === 'draw' ? 'Draw' : 'Guess Text'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-600 block mb-2">Difficulty</label>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-2 rounded-lg capitalize ${difficulty === d ? 'bg-eidola-magenta text-white' : 'bg-white'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default function CreatePostPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { tags: availableTags } = useTags()

  // Chain join mode
  const joinChainId = searchParams.get('joinChain')

  // Fetch parent post when joining a chain
  const { data: parentPost, isLoading: isLoadingParent, error: parentError } = useAsyncData({
    fetcher: async () => {
      const token = await getToken()
      return get<Post>(`/posts/${joinChainId}`, undefined, token)
    },
    deps: [joinChainId],
    enabled: !!joinChainId,
  })

  // Form state
  const [step, setStep] = useState<Step>('upload')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [transformedImageUrl, setTransformedImageUrl] = useState<string | null>(null) // The transformed image URL for FabricCanvas
  const [transformedBlob, setTransformedBlob] = useState<Blob | null>(null) // Blob to upload
  const [previewUrl, setPreviewUrl] = useState<string | null>(null) // Preview with drawing overlay
  const [postType, setPostType] = useState<PostType>('persistent')
  const [drawingData, setDrawingData] = useState<object | null>(null)
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isNsfw, setIsNsfw] = useState(false)
  const [isChallenge, setIsChallenge] = useState(false)
  const [challengeType, setChallengeType] = useState<'draw' | 'text'>('draw')
  const [challengeDifficulty, setChallengeDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [expirationHours, setExpirationHours] = useState(24)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Handle file selection - Bug 6: Clear error when selecting new file
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSubmitError(null) // Clear any previous error
      setImageFile(file)
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setPreviewUrl(null) // Reset preview
      setTransformedImageUrl(null) // Reset transformed image
      setTransformedBlob(null)
      setStep('position') // Go to position step first
    }
  }

  // Bug 1: Simpler camera capture - just use file input with capture attribute
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment')
      fileInputRef.current.click()
    }
  }

  // Handle gallery upload (remove capture attribute)
  const handleGalleryUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.click()
    }
  }

  // Bug 5: Handle post type change - auto-set isChallenge when selecting challenge type
  const handlePostTypeChange = (type: PostType) => {
    setPostType(type)
    // Reset isChallenge based on post type
    if (type === 'challenge') {
      setIsChallenge(true)
    } else {
      setIsChallenge(false)
    }
  }

  // Upload image to server via API (which uses Uploadthing)
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const token = await getToken()
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.eidola.io/api'

    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || 'Upload failed')
    }

    const data = await response.json()
    return data.url
  }

  // Handle form submission
  const { submit: handleSubmit, isSubmitting, error: formError } = useFormSubmit({
    onSubmit: async () => {
      if (!imageFile || !imageUrl) {
        throw new Error('Please select an image')
      }

      // Upload the transformed image if available, otherwise original
      const fileToUpload = transformedBlob
        ? new File([transformedBlob], imageFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        : imageFile
      const uploadedUrl = await uploadImage(fileToUpload)

      const token = await getToken()

      // Chain join mode - submit to chain API
      if (joinChainId && parentPost) {
        await apiPost<{ position: number; badge: string; entryId: number }>(`/chain/${joinChainId}/join`, {
          photoUrl: uploadedUrl,
          caption: caption || undefined,
          userDrawing: drawingData || undefined,
        }, token)

        return { redirectTo: `/post/${joinChainId}` }
      }

      // Calculate expiration if temporary
      let expiresAt: string | undefined
      if (postType === 'temporary') {
        const date = new Date()
        date.setHours(date.getHours() + expirationHours)
        expiresAt = date.toISOString()
      }

      // Create post
      const result = await createPost({
        type: postType,
        imageUrl: uploadedUrl,
        title: title || undefined,
        userMarkedNsfw: isNsfw,
        location: location || undefined,
        address: address || undefined,
        userDrawing: drawingData || undefined,
        userCaption: caption || undefined,
        isChallenge: isChallenge,
        challengeType: isChallenge ? challengeType : undefined,
        challengeDifficulty: isChallenge ? challengeDifficulty : undefined,
        expiresAt,
        tags: selectedTags,
      }, token)

      return { redirectTo: `/post/${result.id}` }
    },
    onSuccess: (result) => {
      if (result?.redirectTo) {
        navigate(result.redirectTo)
      }
    },
  })

  // Combine errors for display
  const error = formError || submitError || parentError

  // Check if there's any work to save
  const hasUnsavedWork = imageUrl || caption || title || drawingData

  // Handle exit with confirmation
  const handleExit = () => {
    if (hasUnsavedWork && step !== 'upload') {
      setShowExitDialog(true)
    } else {
      navigate(-1)
    }
  }

  // Save draft to localStorage
  const saveDraft = () => {
    const draft = {
      imageUrl,
      caption,
      title,
      selectedTags,
      postType,
      isNsfw,
      savedAt: Date.now(),
    }
    localStorage.setItem('eidola_draft', JSON.stringify(draft))
    navigate('/feed')
  }

  // Discard and exit
  const discardAndExit = () => {
    setShowExitDialog(false)
    navigate(-1)
  }

  // Exit confirmation dialog
  const ExitDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExitDialog(false)}>
      <div className="bg-white rounded-2xl mx-6 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Discard post?</h3>
          <p className="text-gray-500 text-sm">If you go back now, you will lose any changes you've made.</p>
        </div>
        <div className="border-t">
          <button
            onClick={discardAndExit}
            className="w-full py-4 text-red-500 font-medium border-b"
          >
            Discard
          </button>
          <button
            onClick={saveDraft}
            className="w-full py-4 font-medium border-b"
          >
            Save Draft
          </button>
          <button
            onClick={() => setShowExitDialog(false)}
            className="w-full py-4 text-gray-500"
          >
            Continue editing
          </button>
        </div>
      </div>
    </div>
  )

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'upload':
        // Show loading state while fetching parent post for chain join
        if (joinChainId && isLoadingParent) {
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-4">
              <Loader2 className="w-8 h-8 animate-spin text-eidola-teal mb-4" />
              <p className="text-gray-500">Loading chain...</p>
            </div>
          )
        }

        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-4" style={{ height: '100dvh' }}>
            {/* Close button to exit create flow */}
            <button
              onClick={handleExit}
              className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Chain join context */}
            {joinChainId && parentPost && (
              <div className="w-full max-w-sm">
                <ChainContext post={parentPost} label="Joining Photo Chain" />
              </div>
            )}

            <h1 className="text-2xl font-bold mb-2">
              {joinChainId ? 'Add your photo' : 'What did you spot?'}
            </h1>
            <p className="text-gray-500 text-center mb-8">
              {joinChainId
                ? 'Take a photo at this location to join the chain'
                : 'Take a photo or upload an image of a pareidolia you\'ve discovered'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm w-full max-w-sm">
                {error}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex gap-4">
              <button
                onClick={handleCameraCapture}
                className="flex flex-col items-center gap-2 p-6 bg-gradient-to-br from-eidola-orange to-eidola-magenta rounded-2xl text-white"
              >
                <Camera className="w-8 h-8" />
                <span className="font-medium">Camera</span>
              </button>

              <button
                onClick={handleGalleryUpload}
                className="flex flex-col items-center gap-2 p-6 bg-gray-100 rounded-2xl text-gray-700"
              >
                <Upload className="w-8 h-8" />
                <span className="font-medium">Gallery</span>
              </button>
            </div>
          </div>
        )

      case 'position':
        return (
          <div className="fixed inset-0 z-50 bg-gray-900" style={{ height: '100dvh' }}>
            <ImagePositioner
              imageUrl={imageUrl!}
              onExit={handleExit}
              onDone={async (transform) => {
                // Generate transformed image for FabricCanvas and upload
                if (transform.containerWidth && transform.containerHeight) {
                  try {
                    const blob = await generateTransformedImage(
                      imageUrl!,
                      transform,
                      { width: transform.containerWidth, height: transform.containerHeight }
                    )
                    setTransformedBlob(blob)
                    // Create object URL for FabricCanvas
                    const transformedUrl = URL.createObjectURL(blob)
                    setTransformedImageUrl(transformedUrl)
                  } catch (err) {
                    console.error('Failed to generate transformed image:', err)
                    // Fall back to original image
                    setTransformedImageUrl(imageUrl)
                  }
                } else {
                  // No container size - use original
                  setTransformedImageUrl(imageUrl)
                }

                setStep('draw')
              }}
              onCancel={() => {
                setImageUrl(null)
                setImageFile(null)
                setTransformedImageUrl(null)
                setTransformedBlob(null)
                setStep('upload')
              }}
            />
          </div>
        )

      case 'draw':
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-900" style={{ height: '100dvh' }}>
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-3 bg-white border-b">
              <div className="flex items-center gap-2">
                <button onClick={handleExit} className="p-1">
                  <X className="w-6 h-6" />
                </button>
                <button onClick={() => setStep('position')} className="p-1">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <h2 className="font-semibold">Draw what you see</h2>
              <button
                onClick={() => setStep('details')}
                className="text-eidola-orange font-medium"
              >
                Next
              </button>
            </div>

            <FabricCanvas
              imageUrl={transformedImageUrl || imageUrl!}
              onSave={(data) => {
                setDrawingData(data)
                // Bug 4: Save the dataUrl for preview with drawing overlay
                if (data && typeof data === 'object' && 'dataUrl' in data) {
                  setPreviewUrl((data as { dataUrl: string }).dataUrl)
                }
              }}
            />
          </div>
        )

      case 'details':
        // Simplified UI for chain join mode
        if (joinChainId && parentPost) {
          return (
            <div className="fixed inset-0 z-50 px-4 pt-4 pb-8 overflow-y-auto bg-white" style={{ height: '100dvh' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button onClick={handleExit} className="p-1">
                    <X className="w-6 h-6" />
                  </button>
                  <button onClick={() => setStep('draw')} className="p-1">
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <h2 className="font-semibold">Join Chain</h2>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="text-eidola-orange font-medium disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join'}
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Chain context */}
              <ChainContext post={parentPost} label="Adding to chain" />

              {/* Preview with drawing overlay */}
              {(previewUrl || imageUrl) && (
                <div className="relative mb-6 rounded-xl overflow-hidden">
                  <img src={previewUrl || imageUrl!} alt="Preview" className="w-full" />
                </div>
              )}

              {/* Caption */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  What do you see? 👀
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="I see a face in this cloud..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
                  rows={3}
                />
              </div>
            </div>
          )
        }

        // Regular post creation UI
        return (
          <div className="fixed inset-0 z-50 px-4 pt-4 pb-8 overflow-y-auto bg-white" style={{ height: '100dvh' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button onClick={handleExit} className="p-1">
                  <X className="w-6 h-6" />
                </button>
                <button onClick={() => setStep('draw')} className="p-1">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <h2 className="font-semibold">Post Details</h2>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="text-eidola-orange font-medium disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Bug 4: Preview with drawing overlay */}
            {(previewUrl || imageUrl) && (
              <div className="relative mb-6 rounded-xl overflow-hidden">
                <img src={previewUrl || imageUrl!} alt="Preview" className="w-full" />
              </div>
            )}

            {/* Caption */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                What do you see? 👀
              </label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="I see a face in this cloud..."
                className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-eidola-orange/50 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Title (optional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give your discovery a name"
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-eidola-orange/50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              />
            </div>

            {/* Post type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Post Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePostTypeChange('persistent')}
                  className={`p-3 rounded-xl text-center ${
                    postType === 'persistent'
                      ? 'bg-eidola-teal text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <MapPin className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Persistent</span>
                </button>
                <button
                  onClick={() => handlePostTypeChange('temporary')}
                  className={`p-3 rounded-xl text-center ${
                    postType === 'temporary'
                      ? 'bg-eidola-orange text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Temporary</span>
                </button>
                <button
                  onClick={() => handlePostTypeChange('challenge')}
                  className={`p-3 rounded-xl text-center ${
                    postType === 'challenge'
                      ? 'bg-eidola-magenta text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <Trophy className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">Challenge</span>
                </button>
              </div>
            </div>

            {/* Temporary options */}
            {postType === 'temporary' && (
              <div className="mb-6 p-4 bg-orange-50 rounded-xl">
                <label className="block text-sm font-medium mb-2">
                  Expires in
                </label>
                <div className="flex flex-wrap gap-2">
                  {expirationOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExpirationHours(opt.value)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        expirationHours === opt.value
                          ? 'bg-eidola-orange text-white'
                          : 'bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location (for persistent) */}
            {postType === 'persistent' && (
              <button
                onClick={() => setStep('location')}
                className="w-full mb-6 p-4 bg-gray-100 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-eidola-teal" />
                  <div className="text-left">
                    <div className="font-medium">Add Location</div>
                    {address ? (
                      <div className="text-sm text-gray-500">{address}</div>
                    ) : (
                      <div className="text-sm text-gray-500">Let others find this spot</div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}

            {/* Bug 5: Challenge options - no redundant checkbox when postType is 'challenge' */}
            {postType === 'challenge' ? (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                <label className="font-medium mb-3 block">Challenge Settings</label>
                <ChallengeSettings
                  type={challengeType}
                  setType={setChallengeType}
                  difficulty={challengeDifficulty}
                  setDifficulty={setChallengeDifficulty}
                />
              </div>
            ) : isChallenge ? (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium">Challenge Mode</label>
                  <input
                    type="checkbox"
                    checked={isChallenge}
                    onChange={e => setIsChallenge(e.target.checked)}
                    className="w-5 h-5 text-eidola-magenta rounded"
                  />
                </div>
                <ChallengeSettings
                  type={challengeType}
                  setType={setChallengeType}
                  difficulty={challengeDifficulty}
                  setDifficulty={setChallengeDifficulty}
                />
              </div>
            ) : null}

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tags</label>
              <TagSelector
                tags={availableTags}
                selected={selectedTags}
                onChange={setSelectedTags}
                disabled={isSubmitting}
              />
            </div>

            {/* NSFW */}
            <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="font-medium">Mark as 18+</div>
                  <div className="text-sm text-gray-500">Adult or sensitive content</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isNsfw}
                onChange={e => setIsNsfw(e.target.checked)}
                className="w-5 h-5 text-eidola-orange rounded"
              />
            </div>
          </div>
        )

      case 'location':
        return (
          <div className="fixed inset-0 z-50 bg-white" style={{ height: '100dvh' }}>
            <LocationPicker
              onSelect={(loc, addr) => {
                setLocation(loc)
                setAddress(addr)
                setStep('details')
              }}
              onCancel={() => setStep('details')}
              initialLocation={location}
              initialAddress={address}
            />
          </div>
        )
    }
  }

  return (
    <div className="flex-1 bg-white overflow-hidden relative">
      {renderStep()}
      {showExitDialog && <ExitDialog />}
    </div>
  )
}
