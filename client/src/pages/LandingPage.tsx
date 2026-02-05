import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react'
import {
  Camera,
  Pencil,
  Share2,
  Trophy,
  MapPin,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  Eye,
  Brain
} from 'lucide-react'
import { isNativePlatform } from '../utils/nativeAuth'
import NativeOAuthButtons from '../components/auth/NativeOAuthButtons'

const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// All 7 pareidolia images for the carousel
const pareidoliaImages = [
  { src: '/images/pareidolia/rock-face.png', caption: 'Rock statue', tag: '#nature' },
  { src: '/images/pareidolia/moon-face.png', caption: 'Moon face', tag: '#space' },
  { src: '/images/pareidolia/mountain-face.png', caption: 'Sleeping mountain', tag: '#nature' },
  { src: '/images/pareidolia/cloud-whale.png', caption: 'Cloud whale', tag: '#clouds' },
  { src: '/images/pareidolia/cloud-camel.png', caption: 'Cloud camel', tag: '#clouds' },
  { src: '/images/pareidolia/cloud-dog.png', caption: 'Cloud dog', tag: '#clouds' },
  { src: '/images/pareidolia/tree-face.png', caption: 'Scary tree face', tag: '#nature' },
  { src: '/images/pareidolia/house-face.png', caption: 'House face', tag: '#buildings' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-eidola-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-eidola-orange/20 via-eidola-magenta/20 to-eidola-teal/20" />

        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-eidola-orange/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-eidola-magenta/30 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-eidola-teal/30 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/logo-with-title.png"
              alt="Eidola"
              className="h-48 md:h-64 w-auto drop-shadow-xl"
            />
          </div>

          {/* Tagline */}
          <h1 className="text-4xl md:text-6xl font-bold text-center text-eidola-text mb-6">
            See faces everywhere?
            <br />
            <span className="bg-gradient-to-r from-eidola-orange to-eidola-magenta bg-clip-text text-transparent">
              Share them.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-center text-gray-600 max-w-2xl mx-auto mb-10">
            The social platform for sharing pareidolia discoveries — faces and patterns spotted in everyday objects.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {hasClerk ? (
              <>
                <SignedOut>
                  {isNativePlatform() ? (
                    // Native app: use system browser OAuth
                    <NativeOAuthButtons />
                  ) : (
                    // Web: use Clerk modals
                    <>
                      <SignUpButton mode="modal">
                        <button className="px-8 py-4 btn-gradient rounded-full text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
                          Start Discovering
                          <ChevronRight className="w-5 h-5 inline ml-2" />
                        </button>
                      </SignUpButton>
                      <SignInButton mode="modal">
                        <button className="px-8 py-4 bg-white rounded-full text-eidola-text text-lg font-semibold shadow-md hover:shadow-lg transition-shadow">
                          Sign In
                        </button>
                      </SignInButton>
                    </>
                  )}
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/feed"
                    className="px-8 py-4 btn-gradient rounded-full text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Go to Feed
                    <ChevronRight className="w-5 h-5 inline ml-2" />
                  </Link>
                </SignedIn>
              </>
            ) : (
              <Link
                to="/feed"
                className="px-8 py-4 btn-gradient rounded-full text-white text-lg font-semibold shadow-lg"
              >
                Explore Now
                <ChevronRight className="w-5 h-5 inline ml-2" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Pareidolia Images Carousel */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            What will you discover?
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-xl mx-auto">
            From surprised outlets to faces in the clouds, pareidolia is everywhere once you start looking.
          </p>
        </div>

        {/* Carousel container with gradient masks on edges */}
        <div className="relative overflow-hidden">
          {/* Left gradient fade */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-eidola-bg to-transparent z-10 pointer-events-none" />

          {/* Right gradient fade */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-eidola-bg to-transparent z-10 pointer-events-none" />

          {/* Sliding track - duplicate images for seamless loop */}
          <div className="flex gap-4 animate-carousel">
            {[...pareidoliaImages, ...pareidoliaImages].map((img, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 w-64 aspect-square rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={img.src}
                  alt={img.caption}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-medium">{img.caption}</p>
                    <p className="text-white/80 text-sm">{img.tag}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-600 text-center mb-12">
            Share your pareidolia discoveries in three simple steps
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-eidola-orange to-eidola-magenta rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Spot it</h3>
              <p className="text-gray-600">
                Find a face or pattern in everyday objects, nature, or clouds
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-eidola-magenta to-eidola-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Pencil className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Draw it</h3>
              <p className="text-gray-600">
                Sketch what you see on the photo using our drawing tools
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-eidola-teal to-eidola-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Share it</h3>
              <p className="text-gray-600">
                Post your discovery and challenge others to see what you see
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Location Pins"
              description="Mark persistent pareidolia spots on the map for others to visit and add to the photo chain"
              color="from-eidola-teal to-emerald-500"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Temporary Posts"
              description="Share fleeting moments like cloud formations that disappear after a set time"
              color="from-eidola-orange to-amber-500"
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Challenges"
              description="Create drawing or guessing challenges and compete on leaderboards"
              color="from-eidola-magenta to-purple-500"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Photo Chains"
              description="Join chains at locations and earn badges for being an early visitor"
              color="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<Pencil className="w-6 h-6" />}
              title="Drawing Tools"
              description="Full-featured drawing editor with brushes, colors, and opacity controls"
              color="from-pink-500 to-rose-500"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Scoring"
              description="Our AI compares drawings and guesses to score challenge submissions"
              color="from-violet-500 to-purple-500"
            />
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <Brain className="w-10 h-10 text-eidola-orange" />
            <h2 className="text-3xl font-bold">The Science of Pareidolia</h2>
          </div>

          <blockquote className="text-xl md:text-2xl text-center italic text-gray-300 mb-8">
            "The brain is so carefully wired to process face information that it's evoked into play as soon as anything even vaguely face-shaped is present."
          </blockquote>
          <p className="text-center text-gray-400 mb-12">
            — Ed Connor, Director of Krieger Mind/Brain Institute, Johns Hopkins University
          </p>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <Eye className="w-8 h-8 text-eidola-teal flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-3">
                  Pareidolia
                  <span className="text-gray-400 font-normal ml-2">/ˌpærɪˈdoʊliə/</span>
                </h3>
                <p className="text-gray-300 mb-4">
                  From Greek: <em>para</em> (beside) + <em>eidōlon</em> (image, form)
                </p>
                <p className="text-gray-400">
                  The tendency to perceive meaningful patterns, especially faces, where none exist.
                  This is a normal human phenomenon that helped our ancestors identify faces quickly
                  for survival. Today, it brings us joy in spotting a "face" on a toaster or
                  a "dog" in the clouds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="font-semibold text-eidola-orange mb-2">Famous Example</h4>
              <p className="text-gray-400">
                The "Face on Mars" photographed by Viking 1 in 1976 sparked decades of speculation
                before higher resolution images revealed it was just a natural rock formation.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6">
              <h4 className="font-semibold text-eidola-teal mb-2">Artistic Use</h4>
              <p className="text-gray-400">
                Leonardo da Vinci wrote about intentionally looking for faces in random patterns
                to spark creativity and imagination in his artwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to see what you've been missing?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of people discovering and sharing pareidolia every day.
          </p>

          {hasClerk ? (
            <SignedOut>
              {isNativePlatform() ? (
                <NativeOAuthButtons />
              ) : (
                <SignUpButton mode="modal">
                  <button className="px-10 py-5 btn-gradient rounded-full text-white text-xl font-semibold shadow-lg hover:shadow-xl transition-shadow">
                    Get Started — It's Free
                  </button>
                </SignUpButton>
              )}
            </SignedOut>
          ) : (
            <Link
              to="/feed"
              className="inline-block px-10 py-5 btn-gradient rounded-full text-white text-xl font-semibold shadow-lg"
            >
              Explore Now
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Eidola" className="h-8 w-auto" />
            <span className="text-gray-500">© 2026 Eidola</span>
          </div>

          <div className="flex gap-6 text-gray-500">
            <a href="#" className="hover:text-eidola-orange transition-colors">About</a>
            <a href="#" className="hover:text-eidola-orange transition-colors">Privacy</a>
            <a href="#" className="hover:text-eidola-orange transition-colors">Terms</a>
            <a href="#" className="hover:text-eidola-orange transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}
