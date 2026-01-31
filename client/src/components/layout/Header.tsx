import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/clerk-react'
import { Search, Shield } from 'lucide-react'
import { get } from '../../utils/api'
import NotificationDropdown from '../notifications/NotificationDropdown'

const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function Header() {
  const { getToken, isSignedIn } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      if (!isSignedIn || !hasClerk) {
        setIsAdmin(false)
        return
      }
      try {
        const token = await getToken()
        const user = await get<{ isAdmin?: boolean }>('/user/me', undefined, token)
        setIsAdmin(user.isAdmin || false)
      } catch {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [isSignedIn, getToken])

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2">
          <img src="/logo.png" alt="Eidola" className="h-10 w-auto" />
        </Link>

        {/* Search (desktop) */}
        <div className="hidden md:flex flex-1 max-w-xs mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-eidola-orange/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link to="/admin" className="p-2 hover:bg-gray-100 rounded-full" title="Admin">
              <Shield className="w-5 h-5 text-eidola-orange" />
            </Link>
          )}
          <SignedIn>
            <NotificationDropdown />
          </SignedIn>

          {hasClerk ? (
            <>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <Link
                  to="/"
                  className="px-4 py-2 btn-gradient rounded-full text-sm font-medium"
                >
                  Sign In
                </Link>
              </SignedOut>
            </>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-eidola-orange to-eidola-magenta rounded-full" />
          )}
        </div>
      </div>
    </header>
  )
}
