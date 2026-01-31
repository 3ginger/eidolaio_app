interface AvatarProps {
  user: {
    avatarUrl?: string
    username?: string
  }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-20 h-20',
}

export default function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  const src = user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'default'}`

  return (
    <img
      src={src}
      alt={user.username || 'User avatar'}
      className={`${sizeClasses[size]} rounded-full ${className}`}
    />
  )
}
