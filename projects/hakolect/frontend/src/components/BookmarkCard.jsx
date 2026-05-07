import { useState } from 'react'
import { MoreHorizontal, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import CardMenu from './CardMenu'
import ConfirmDialog from './ConfirmDialog'
import { useDeleteBookmark } from '../hooks/useBookmarks'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function BookmarkCard({ bookmark, isSelected }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const openDetail = useAppStore((s) => s.openDetail)
  const deleteMutation = useDeleteBookmark()
  const { addToast } = useToast()

  function handleCardClick() {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }

  function handleMenuClick(e) {
    e.stopPropagation()
    setMenuOpen((v) => !v)
  }

  async function handleDelete() {
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(bookmark.id)
      addToast('Bookmark deleted', 'success')
    } catch {
      addToast('Failed to delete bookmark', 'error')
    }
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={clsx(
          'relative group bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden',
          isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-gray-200'
        )}
      >
        {/* OGP image area */}
        <div className="relative h-14 bg-gray-100 overflow-hidden">
          {bookmark.ogp_image_url ? (
            <img
              src={bookmark.ogp_image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {bookmark.favicon_url && (
                <img
                  src={bookmark.favicon_url}
                  alt=""
                  className="w-8 h-8 object-contain opacity-30"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </div>
          )}
          {/* Menu button */}
          <button
            onClick={handleMenuClick}
            className={clsx(
              'absolute right-1.5 top-1.5 p-1 rounded-md bg-white/90 text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-sm',
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0 max-md:opacity-100'
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <CardMenu
              onDetail={() => openDetail(bookmark.id)}
              onEdit={() => openDetail(bookmark.id)}
              onMove={() => openDetail(bookmark.id)}
              onDelete={() => setConfirmDelete(true)}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Favicon + title + external icon */}
          <div className="flex items-start gap-1.5 mb-1">
            {bookmark.favicon_url && (
              <img
                src={bookmark.favicon_url}
                alt=""
                className="w-4 h-4 mt-0.5 shrink-0 object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="text-sm font-medium text-gray-900 leading-snug line-clamp-1 flex-1">
              {bookmark.title || getDomain(bookmark.url)}
            </span>
            <ExternalLink size={12} className="text-gray-400 shrink-0 mt-0.5" />
          </div>

          {/* Domain */}
          <p className="text-xs text-gray-400 mb-1.5 truncate">{getDomain(bookmark.url)}</p>

          {/* Comment */}
          {bookmark.comment && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-1.5">{bookmark.comment}</p>
          )}

          {/* Tags */}
          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {bookmark.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
              {bookmark.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{bookmark.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete bookmark?"
        message={`"${bookmark.title || bookmark.url}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
