import { Link, useLocation } from 'react-router-dom'
import { Home, Map, Trophy, PlusSquare, User } from 'lucide-react'

export default function MobileNav() {
  const location = useLocation()
  const path = location.pathname

  const navItems = [
    { to: '/feed', icon: Home, label: 'Feed' },
    { to: '/explore', icon: Map, label: 'Explore' },
    { to: '/create', icon: PlusSquare, label: 'Create' },
    { to: '/challenges', icon: Trophy, label: 'Challenges' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100" style={{ transform: 'translateZ(0)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon }) => {
          const isActive = path === to || (to === '/profile' && path.startsWith('/profile'))
          const isCreate = to === '/create'

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-center flex-1 h-full ${
                isActive ? 'text-eidola-orange' : 'text-gray-500'
              }`}
            >
              {isCreate ? (
                <div className="w-10 h-10 btn-gradient rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              ) : (
                <Icon className="w-7 h-7" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
