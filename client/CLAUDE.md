# Frontend Development Guide

This guide documents all reusable UI components and hooks for the Eidola frontend.

## Reusable UI Components (components/ui/)

### LoadingSpinner
Full-screen or inline loading indicator.

```tsx
import LoadingSpinner from '../components/ui/LoadingSpinner'

<LoadingSpinner />                           // Default
<LoadingSpinner fullHeight />                // Centers in full viewport height
<LoadingSpinner color="orange" />            // Orange color (default)
<LoadingSpinner color="teal" />              // Teal color
<LoadingSpinner className="py-12" />         // Custom styling
```

### EmptyState
Empty content placeholder with optional icon and action.

```tsx
import EmptyState from '../components/ui/EmptyState'

<EmptyState title="No items" />
<EmptyState
  icon={<MapPin className="w-12 h-12" />}
  title="No discoveries nearby"
  description="Try searching a different area"
  action={<Link to="/create">Create One</Link>}
/>
<EmptyState emoji="📸" title="No posts yet" />
```

### Avatar
User avatar with fallback to initials.

```tsx
import Avatar from '../components/ui/Avatar'

<Avatar user={user} />                       // Default (md)
<Avatar user={user} size="sm" />             // Small (32px)
<Avatar user={user} size="md" />             // Medium (40px)
<Avatar user={user} size="lg" />             // Large (48px)
<Avatar user={user} size="xl" />             // Extra large (64px)
```

### Alert
Dismissible alert messages.

```tsx
import Alert from '../components/ui/Alert'

<Alert type="error" message="Something went wrong" />
<Alert type="success" message="Saved successfully!" />
<Alert type="warning" message="Check your input" />
<Alert type="info" message="New features available" />
<Alert type="error" message="Error" onDismiss={() => setError(null)} />
```

### TabGroup
Tab navigation with pills or underline variants.

```tsx
import TabGroup from '../components/ui/TabGroup'

<TabGroup
  tabs={[
    { value: 'posts', label: 'Posts' },
    { value: 'likes', label: 'Likes', icon: <Heart /> },
  ]}
  value={activeTab}
  onChange={setActiveTab}
/>
<TabGroup tabs={tabs} value={val} onChange={fn} variant="underline" />
```

### Modal
Accessible modal dialog.

```tsx
import Modal from '../components/ui/Modal'

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm">
  <p>Are you sure?</p>
  <button onClick={handleConfirm}>Yes</button>
</Modal>
<Modal isOpen={bool} onClose={fn} title="..." maxWidth="sm">...</Modal>
<Modal isOpen={bool} onClose={fn} title="..." maxWidth="lg">...</Modal>
```

### DrawingToggleButton
Toggle between photo and drawing overlay views.

```tsx
import DrawingToggleButton from '../components/ui/DrawingToggleButton'

<DrawingToggleButton
  showDrawing={showDrawing}
  onToggle={() => setShowDrawing(prev => !prev)}
  className="absolute bottom-3 right-3"
/>
```

### PageHeader
Consistent page header with back navigation.

```tsx
import PageHeader from '../components/ui/PageHeader'

<PageHeader title="Settings" />                              // Uses navigate(-1)
<PageHeader title="Post" backTo="/feed" />                   // Link to specific route
<PageHeader title="Edit" onBack={() => setSection('main')} /> // Custom back handler
<PageHeader
  title="Admin Dashboard"
  backTo="/feed"
  icon={<Shield className="w-6 h-6" />}
  subtitle="Manage reports"
  rightContent={<button>Action</button>}
  sticky
/>
```

### StatCard
Stat display card with icon and label.

```tsx
import StatCard from '../components/ui/StatCard'

<StatCard icon={<Users className="w-4 h-4" />} label="Users" value={1234} />
<StatCard icon={<Flag />} label="Reports" value={5} color="orange" />
<StatCard icon={<AlertTriangle />} label="Flagged" value={2} color="red" />
```

## Reusable Hooks (hooks/)

### usePaginatedData
Paginated API data with load more and refresh.

```tsx
import { usePaginatedData } from '../hooks/usePaginatedData'

const { data, isLoading, hasMore, loadMore, refresh } = usePaginatedData({
  fetcher: (cursor) => get('/posts', { cursor }),
  getNextCursor: (data) => data.nextCursor,
  getItems: (data) => data.posts,
})
```

### useAsyncData
Single async data fetch with loading/error states.

```tsx
import { useAsyncData } from '../hooks/useAsyncData'

const { data, isLoading, error, refetch } = useAsyncData({
  fetcher: async () => {
    const token = await getToken()
    return get('/api/data', undefined, token)
  },
  deps: [filter],           // Re-fetch when dependencies change
  enabled: !!userId,        // Conditionally enable fetching
  onError: (err) => {       // Optional error callback
    if (err.message.includes('unauthorized')) navigate('/login')
  },
})
```

### useFormSubmit
Form submission with loading/error handling.

```tsx
import { useFormSubmit } from '../hooks/useFormSubmit'

const { submit, isSubmitting, error, clearError } = useFormSubmit({
  onSubmit: async () => {
    const token = await getToken()
    return api.post('/save', formData, token)
  },
  onSuccess: (result) => {
    navigate(`/item/${result.id}`)
  },
  onError: (err) => {
    console.error('Save failed:', err)
  },
})

// In form:
<button onClick={submit} disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</button>
{error && <Alert type="error" message={error} />}
```

### useClickOutside
Detect clicks outside an element (e.g., for dropdown menus).

```tsx
import { useClickOutside } from '../hooks/useClickOutside'

const menuRef = useRef<HTMLDivElement>(null)
useClickOutside(menuRef, () => setShowMenu(false), showMenu)

// In JSX:
<div ref={menuRef}>
  {showMenu && <DropdownMenu />}
</div>
```

## Utilities (utils/)

### dateTime.ts
Date and time formatting utilities.

```tsx
import { getTimeRemaining, getTimeRemainingVerbose, formatRelativeDate } from '../utils/dateTime'

getTimeRemaining(expiresAt)        // "2h 30m" or "expired"
getTimeRemainingVerbose(expiresAt) // "2 hours, 30 minutes remaining"
formatRelativeDate(date)           // "2 hours ago", "yesterday", "Jan 15"
```

### badges.ts
Position badge formatting.

```tsx
import { getPositionBadge, getPositionBadgeColor } from '../utils/badges'

getPositionBadge(1, 'emoji')       // "🥇"
getPositionBadge(1, 'text')        // "1st"
getPositionBadgeColor(1)           // "bg-yellow-100 text-yellow-700"
```

### drawing.ts
Drawing data extraction.

```tsx
import { extractDrawingDataUrl, hasValidDrawing } from '../utils/drawing'

const drawingDataUrl = extractDrawingDataUrl(post.userDrawing)
if (hasValidDrawing(post.userDrawing)) {
  // Show drawing toggle
}
```

## Patterns

### When to create a new component
- Pattern appears 2+ times
- Has consistent props/behavior
- ~20+ lines that can be reduced

### When to create a new hook
- State management logic is duplicated
- useEffect pattern is repeated
- Async data fetching follows same pattern

### Naming conventions
- UI components: PascalCase in `components/ui/`
- Hooks: camelCase starting with "use" in `hooks/`
- Utils: camelCase functions in `utils/`

### API Authentication Pattern
See main CLAUDE.md for API authentication patterns with Clerk.
