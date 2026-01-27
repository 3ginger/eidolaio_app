export function getPositionBadge(position: number, format: 'emoji' | 'text' = 'emoji'): string {
  if (format === 'emoji') {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${position}`
    }
  }

  switch (position) {
    case 1: return '1st'
    case 2: return '2nd'
    case 3: return '3rd'
    default: return `${position}th`
  }
}

export function getPositionBadgeColor(position: number): string {
  switch (position) {
    case 1: return 'bg-yellow-100 text-yellow-700'
    case 2: return 'bg-gray-100 text-gray-700'
    case 3: return 'bg-orange-100 text-orange-700'
    default: return 'bg-eidola-teal/10 text-eidola-teal'
  }
}
