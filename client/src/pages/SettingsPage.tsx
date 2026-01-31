import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useTags } from '../hooks/usePosts'
import { useFormSubmit } from '../hooks/useFormSubmit'
import { SignOutButton } from '@clerk/clerk-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Avatar from '../components/ui/Avatar'
import Alert from '../components/ui/Alert'
import PageHeader from '../components/ui/PageHeader'
import { User, Tag, LogOut, Loader2 } from 'lucide-react'

const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, isLoading, updateProfile, updateInterests } = useUser()
  const { tags: availableTags } = useTags()

  const [activeSection, setActiveSection] = useState<'main' | 'profile' | 'interests'>('main')
  const [username, setUsername] = useState(user?.username || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  // Sync state when user loads
  useState(() => {
    if (user) {
      setUsername(user.username || '')
      setDisplayName(user.displayName || '')
      setBio(user.bio || '')
    }
  })

  // Profile save handler
  const { submit: saveProfile, isSubmitting: isSavingProfile, error: profileError, clearError: clearProfileError } = useFormSubmit({
    onSubmit: async () => {
      await updateProfile({
        username: username !== user?.username ? username : undefined,
        displayName,
        bio,
      })
    },
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    },
  })

  // Interests save handler
  const { submit: saveInterests, isSubmitting: isSavingInterests, error: interestsError, clearError: clearInterestsError } = useFormSubmit({
    onSubmit: () => updateInterests(selectedInterests),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    },
  })

  if (isLoading) {
    return <LoadingSpinner fullHeight />
  }

  const toggleInterest = (tagName: string) => {
    setSelectedInterests(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="px-4 py-4">
            <PageHeader
              title="Edit Profile"
              onBack={() => { setActiveSection('main'); clearProfileError() }}
              className="border-none px-0 mb-6"
            />

            {profileError && <Alert type="error" message={profileError} className="mb-4" />}
            {success && <Alert type="success" message="Saved successfully!" className="mb-4" />}

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Avatar user={{ avatarUrl: user?.avatarUrl, username: user?.username }} size="xl" className="w-24 h-24" />
                <button className="absolute bottom-0 right-0 p-2 bg-eidola-orange rounded-full text-white">
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
              />
            </div>

            {/* Display name */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
              />
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
                rows={4}
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={isSavingProfile}
              className="w-full btn-gradient py-3 rounded-xl text-white font-medium disabled:opacity-50"
            >
              {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
            </button>
          </div>
        )

      case 'interests':
        return (
          <div className="px-4 py-4">
            <PageHeader
              title="Interests"
              onBack={() => { setActiveSection('main'); clearInterestsError() }}
              className="border-none px-0 mb-6"
            />

            <p className="text-gray-500 mb-6">
              Select topics you're interested in to personalize your feed
            </p>

            {interestsError && <Alert type="error" message={interestsError} className="mb-4" />}
            {success && <Alert type="success" message="Saved successfully!" className="mb-4" />}

            <div className="flex flex-wrap gap-2 mb-6">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleInterest(tag.name)}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    selectedInterests.includes(tag.name)
                      ? 'bg-eidola-orange text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>

            <button
              onClick={saveInterests}
              disabled={isSavingInterests}
              className="w-full btn-gradient py-3 rounded-xl text-white font-medium disabled:opacity-50"
            >
              {isSavingInterests ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Interests'}
            </button>
          </div>
        )

      default:
        return (
          <div className="px-4 py-4">
            <PageHeader
              title="Settings"
              onBack={() => navigate(-1)}
              className="border-none px-0 mb-6"
            />

            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('profile')}
                className="w-full flex items-center gap-4 p-4 bg-gray-100 rounded-xl"
              >
                <User className="w-5 h-5" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setActiveSection('interests')}
                className="w-full flex items-center gap-4 p-4 bg-gray-100 rounded-xl"
              >
                <Tag className="w-5 h-5" />
                <span>Interests</span>
              </button>

              {hasClerk && (
                <SignOutButton>
                  <button className="w-full flex items-center gap-4 p-4 bg-red-50 text-red-600 rounded-xl">
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </SignOutButton>
              )}
            </div>
          </div>
        )
    }
  }

  return <div className="max-w-lg mx-auto bg-white min-h-screen">{renderSection()}</div>
}
