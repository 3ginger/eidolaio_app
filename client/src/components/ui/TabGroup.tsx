import { ReactNode } from 'react'

interface Tab<T extends string> {
  value: T
  label?: string
  icon?: ReactNode
}

interface TabGroupProps<T extends string> {
  tabs: Tab<T>[]
  value: T
  onChange: (value: T) => void
  variant?: 'pills' | 'underline'
}

export default function TabGroup<T extends string>({
  tabs,
  value,
  onChange,
  variant = 'pills',
}: TabGroupProps<T>) {
  if (variant === 'underline') {
    return (
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${
              value === tab.value
                ? 'border-b-2 border-eidola-orange text-eidola-orange'
                : 'text-gray-500'
            }`}
          >
            {tab.icon}
            {tab.label && <span>{tab.label}</span>}
          </button>
        ))}
      </div>
    )
  }

  // Pills variant (default)
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            value === tab.value
              ? 'bg-eidola-orange text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.icon && <span className="inline mr-1">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
