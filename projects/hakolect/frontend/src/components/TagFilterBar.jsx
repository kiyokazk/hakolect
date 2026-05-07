import { useState } from 'react'
import { Tag } from 'lucide-react'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { getTags } from '../api/tags'

export default function TagFilterBar({ activeTag, onTagClick }) {
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  if (!tags || tags.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <Tag size={14} className="text-gray-400 shrink-0" />
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagClick(tag.name === activeTag ? null : tag.name)}
          className={clsx(
            'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors',
            tag.name === activeTag
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
          )}
        >
          {tag.name}
          <span className={clsx('opacity-60', tag.name === activeTag ? 'text-blue-100' : '')}>
            {tag.usage_count}
          </span>
        </button>
      ))}
    </div>
  )
}
