import { useRef, useState } from 'react'
import { MoreHorizontal, ExternalLink, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import CardMenu from './CardMenu'
import ConfirmDialog from './ConfirmDialog'
import { useDeleteBookmark } from '../hooks/useBookmarks'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import { getBookmarkTags } from '../utils/bookmarkFormat'

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getMenuAnchorRect(button) {
  const rect = button?.getBoundingClientRect?.()
  if (!rect) return null
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left)) return null
  if (rect.width <= 0 || rect.height <= 0) return null
  if (rect.x === 0 && rect.y === 0 && rect.width === 0 && rect.height === 0) return null

  return {
    x: rect.x,
    y: rect.y,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }
}

export default function BookmarkCard({ bookmark, isSelected, dragAttributes, dragListeners }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const tagNames = getBookmarkTags(bookmark)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const menuButtonRef = useRef(null)
  const openDetail = useAppStore((s) => s.openDetail)
  const deleteMutation = useDeleteBookmark()
  const { addToast } = useToast()

  function handleCardClick() {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }

  function handleMenuClick(e) {
    e.stopPropagation()
    const nextOpen = !menuOpen
    if (nextOpen) {
      setAnchorRect(getMenuAnchorRect(e.currentTarget))
    } else {
      setAnchorRect(null)
    }
    setMenuOpen(nextOpen)
  }

  async function handleDelete() {
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(bookmark.id)
      addToast('Item deleted', 'success')
    } catch {
      addToast('Failed to delete item', 'error')
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
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1.5 top-1.5 p-1 rounded-md bg-white/90 text-gray-500 hover:text-gray-800 hover:bg-white transition-all shadow-sm opacity-0 group-hover:opacity-100 max-md:opacity-100"
            title="Drag to move or reorder"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical size={14} />
          </button>

          {/* Menu button */}
          <button
            ref={menuButtonRef}
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
              anchorRef={menuButtonRef}
              anchorRect={anchorRect}
              onDetail={() => openDetail(bookmark.id, 'detail')}
              onEdit={() => openDetail(bookmark.id, 'edit')}
              onMove={() => openDetail(bookmark.id, 'move')}
              onDelete={() => setConfirmDelete(true)}
              onClose={() => {
                setMenuOpen(false)
                setAnchorRect(null)
              }}
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
          {tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tagNames.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {tagNames.length > 3 && (
                <span className="text-xs text-gray-400">+{tagNames.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this item?"
        message={`"${bookmark.title || bookmark.url}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
