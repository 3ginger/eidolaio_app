import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { createPost } from '../hooks/usePosts'
import { useTags } from '../hooks/usePosts'
import FabricCanvas from '../components/drawing/FabricCanvas'
import ImagePositioner, { type ImageTransform } from '../components/drawing/ImagePositioner'
import LocationPicker from '../components/map/LocationPicker'
import TagSelector from '../components/post/TagSelector'
import {
  Camera,
  Upload,
  MapPin,
  Clock,
  Trophy,
  AlertTriangle,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react'

type PostType = 'persistent' | 'temporary' | 'challenge'
type Step = 'upload' | 'position' | 'draw' | 'details' | 'location'

const expirationOptions = [
  { label: '1 hour', value: 1 },
  { label: '6 hours', value: 6 },
  { label: '24 hours', value: 24 },
  { label: '3 days', value: 72 },
  { label: '1 week', value: 168 },
]

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { tags: availableTags } = useTags()

  // Form state
  const [step, setStep] = useState<Step>('upload')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageTransform, setImageTransform] = useState<ImageTransform | null>(null)
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setImageTransform(null) // Reset transform for new image
      setStep('position') // Go to position step first
    }
  }

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // For now, just open file picker with camera hint
      stream.getTracks().forEach(track => track.stop())
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment')
        fileInputRef.current.click()
      }
    } catch {
      // Fallback to file picker
      fileInputRef.current?.click()
    }
  }

  // Upload image to server via API (which uses Uploadthing)
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const token = await getToken()
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api-omega-opal-59.vercel.app/api'

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
  const handleSubmit = async () => {
    if (!imageFile || !imageUrl) {
      setError('Please select an image')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Upload image
      const uploadedUrl = await uploadImage(imageFile)

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
      })

      navigate(`/post/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
            <h1 className="text-2xl font-bold">What did you spot?</h1>
            <p className="text-gray-500 text-center">
              Take a photo or upload an image of a pareidolia you've discovered
            </p>

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
                onClick={() => fileInputRef.current?.click()}
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
          <ImagePositioner
            imageUrl={imageUrl!}
            onDone={(transform) => {
              setImageTransform(transform)
              setStep('draw')
            }}
            onCancel={() => {
              setImageUrl(null)
              setImageFile(null)
              setStep('upload')
            }}
          />
        )

      case 'draw':
        return (
          <div className="h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <button onClick={() => setStep('position')}>
                <X className="w-6 h-6" />
              </button>
              <h2 className="font-semibold">Draw what you see</h2>
              <button
                onClick={() => setStep('details')}
                className="text-eidola-orange font-medium"
              >
                Next
              </button>
            </div>

            <FabricCanvas
              imageUrl={imageUrl!}
              onSave={setDrawingData}
              imageTransform={imageTransform || undefined}
            />
          </div>
        )

      case 'details':
        return (
          <div className="px-4 py-4 pb-32">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setStep('draw')}>
                <X className="w-6 h-6" />
              </button>
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

            {/* Preview */}
            {imageUrl && (
              <div className="relative mb-6 rounded-xl overflow-hidden">
                <img src={imageUrl} alt="Preview" className="w-full" />
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
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
              />
            </div>

            {/* Post type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Post Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPostType('persistent')}
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
                  onClick={() => setPostType('temporary')}
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
                  onClick={() => setPostType('challenge')}
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

            {/* Challenge options */}
            {(postType === 'challenge' || isChallenge) && (
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

                {isChallenge && (
                  <>
                    <div className="mb-3">
                      <label className="text-sm text-gray-600 block mb-2">Type</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setChallengeType('draw')}
                          className={`flex-1 py-2 rounded-lg ${
                            challengeType === 'draw' ? 'bg-eidola-magenta text-white' : 'bg-white'
                          }`}
                        >
                          Draw
                        </button>
                        <button
                          onClick={() => setChallengeType('text')}
                          className={`flex-1 py-2 rounded-lg ${
                            challengeType === 'text' ? 'bg-eidola-magenta text-white' : 'bg-white'
                          }`}
                        >
                          Guess Text
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 block mb-2">Difficulty</label>
                      <div className="flex gap-2">
                        {(['easy', 'medium', 'hard'] as const).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setChallengeDifficulty(diff)}
                            className={`flex-1 py-2 rounded-lg capitalize ${
                              challengeDifficulty === diff ? 'bg-eidola-magenta text-white' : 'bg-white'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tags</label>
              <TagSelector
                tags={availableTags}
                selected={selectedTags}
                onChange={setSelectedTags}
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
          <LocationPicker
            onSelect={(loc, addr) => {
              setLocation(loc)
              setAddress(addr)
              setStep('details')
            }}
            onCancel={() => setStep('details')}
          />
        )
    }
  }

  return <div className="bg-white min-h-screen">{renderStep()}</div>
}
