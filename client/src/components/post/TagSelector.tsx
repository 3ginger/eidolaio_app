import type { Tag } from '../../types/post'

interface TagSelectorProps {
  tags: Tag[]
  selected: string[]
  onChange: (selected: string[]) => void
  maxTags?: number
}

export default function TagSelector({
  tags,
  selected,
  onChange,
  maxTags = 5
}: TagSelectorProps) {
  const toggleTag = (tagName: string) => {
    if (selected.includes(tagName)) {
      onChange(selected.filter(t => t !== tagName))
    } else if (selected.length < maxTags) {
      onChange([...selected, tagName])
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="px-3 py-1 bg-eidola-orange text-white rounded-full text-sm flex items-center gap-1"
            >
              #{tag}
              <span className="ml-1">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Available tags */}
      <div className="flex flex-wrap gap-2">
        {tags
          .filter(t => !selected.includes(t.name))
          .map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              disabled={selected.length >= maxTags}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              #{tag.name}
            </button>
          ))}
      </div>

      {/* Counter */}
      <p className="text-xs text-gray-500">
        {selected.length}/{maxTags} tags selected
      </p>
    </div>
  )
}
