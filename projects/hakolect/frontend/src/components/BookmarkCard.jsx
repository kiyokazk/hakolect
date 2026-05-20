import { useRef, useState } from 'react'
import { MoreHorizontal, ExternalLink, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import CardMenu from './CardMenu'
import ConfirmDialog from './ConfirmDialog'
import { useDeleteBookmark } from '../hooks/useBookmarks'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import { getBookmarkTags } from '../utils/bookmarkFormat'
import { useBookmarkDnd } from './dnd/BookmarkDndProvider'

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
  const dnd = useBookmarkDnd()

  const dragTitle = dnd?.canReorder
    ? 'Drag this card to move or reorder'
    : dnd?.selectedFolderId === null
      ? 'Drag this card into a folder to move it. Reorder is not available in All hakolect.'
      : 'Drag this card to move. Reorder is available after clearing search or tag filters.'

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
          'relative group overflow-hidden rounded-xl border bg-white cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
          isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-gray-200'
        )}
      >
        <div className="relative h-14 overflow-hidden bg-gray-100">
          {bookmark.ogp_image_url ? (
            <img
              src={bookmark.ogp_image_url}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {bookmark.favicon_url && (
                <img
                  src={bookmark.favicon_url}
                  alt=""
                  className="h-8 w-8 object-contain opacity-30"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1.5 top-1.5 rounded-md bg-white/90 p-1 text-gray-500 shadow-sm transition-all hover:bg-white hover:text-gray-800 opacity-70 hover:opacity-100 cursor-grab active:cursor-grabbing"
            title={dragTitle}
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical size={14} />
          </button>

          <button
            ref={menuButtonRef}
            onClick={handleMenuClick}
            onPointerDown={(e) => e.stopPropagation()}
            className={clsx(
              'absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-gray-600 shadow-sm transition-all hover:bg-white hover:text-gray-900',
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

        <div className="p-3">
          <div className="mb-1 flex items-start gap-1.5">
            {bookmark.favicon_url && (
              <img
                src={bookmark.favicon_url}
                alt=""
                className="mt-0.5 h-4 w-4 shrink-0 object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="flex-1 line-clamp-1 text-sm font-medium leading-snug text-gray-900">
              {bookmark.title || getDomain(bookmark.url)}
            </span>
            <ExternalLink size={12} className="mt-0.5 shrink-0 text-gray-400" />
          </div>

          <p className="mb-1.5 truncate text-xs text-gray-400">{getDomain(bookmark.url)}</p>

          {bookmark.comment && (
            <p className="mb-1.5 line-clamp-2 text-xs text-gray-600">{bookmark.comment}</p>
          )}

          {tagNames.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tagNames.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
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
