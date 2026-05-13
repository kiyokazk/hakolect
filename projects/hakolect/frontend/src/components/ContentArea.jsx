import { useRef, useState } from 'react'
import { LayoutGrid, List, ChevronRight, Inbox, MoreHorizontal, GripVertical } from 'lucide-react'
import clsx from 'clsx'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import BookmarkCard from './BookmarkCard'
import TagFilterBar from './TagFilterBar'
import CardMenu from './CardMenu'
import ConfirmDialog from './ConfirmDialog'
import { useBookmarks, useDeleteBookmark } from '../hooks/useBookmarks'
import { useFolders } from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import { getBookmarkTags } from '../utils/bookmarkFormat'
import { getFolderPath } from '../utils/folderTree'
import { BookmarkSortableContext, useBookmarkDnd } from './dnd/BookmarkDndProvider'

export default function ContentArea() {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const selectedBookmarkId = useAppStore((s) => s.selectedBookmarkId)
  const searchKeyword = useAppStore((s) => s.searchKeyword)
  const activeTag = useAppStore((s) => s.activeTag)
  const setActiveTag = useAppStore((s) => s.setActiveTag)
  const viewMode = useAppStore((s) => s.viewMode)
  const toggleViewMode = useAppStore((s) => s.toggleViewMode)

  const { data: foldersData = [] } = useFolders()
  const { data, isLoading, isError } = useBookmarks({})
  const dnd = useBookmarkDnd()
  const bookmarks = dnd?.bookmarks || data?.bookmarks || data?.items || []
  const total = data?.total || 0
  const reorderEnabled = dnd?.canReorder && bookmarks.length > 1

  const activeFolderPath =
    selectedFolderId !== null && selectedFolderId !== 'unsorted'
      ? getFolderPath(foldersData, selectedFolderId)
      : []

  let breadcrumb = []
  if (searchKeyword) {
    breadcrumb = [{ label: `Search results for "${searchKeyword}"`, id: 'search' }]
  } else if (selectedFolderId === null) {
    breadcrumb = [{ label: 'All hakolect', id: null }]
  } else if (selectedFolderId === 'unsorted') {
    breadcrumb = [{ label: 'Unsorted', id: 'unsorted' }]
  } else {
    breadcrumb = activeFolderPath.map((f) => ({ label: f.name, id: f.id }))
  }

  let emptyState = {
    title: 'No bookmarks yet',
    description: 'Add your first bookmark with the + Add button, or drop a URL in the Slack channel.',
  }

  if (searchKeyword) {
    emptyState = {
      title: `No bookmarks found for "${searchKeyword}"`,
      description: 'Try a different search term.',
    }
  } else if (selectedFolderId === 'unsorted') {
    emptyState = {
      title: 'All caught up!',
      description: 'No unsorted bookmarks.',
    }
  } else if (selectedFolderId !== null) {
    const folderName = activeFolderPath[activeFolderPath.length - 1]?.name || 'This folder'
    emptyState = {
      title: `${folderName} is empty`,
      description: 'Use Move to... or drag-reorder items here after saving.',
    }
  }

  return (
    <main className="flex-1 min-w-0 p-4 lg:p-6">
      <div className="flex items-center gap-1 text-sm mb-3">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-gray-400" />}
            <span className={clsx(
              i === breadcrumb.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-500'
            )}>
              {crumb.label}
            </span>
          </span>
        ))}
        <span className="ml-2 text-xs text-gray-400">
          {isLoading ? '...' : `${total} items`}
        </span>
      </div>

      <TagFilterBar activeTag={activeTag} onTagClick={setActiveTag} />

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="text-xs text-gray-500">
          {reorderEnabled
            ? 'Drag cards to reorder within the current view.'
            : 'Reorder is available inside a specific folder or Unsorted after clearing tag/search filters.'}
        </div>
        <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          <button
            onClick={() => viewMode !== 'grid' && toggleViewMode()}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => viewMode !== 'list' && toggleViewMode()}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-36 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="font-medium mb-1">Failed to load bookmarks</p>
          <p className="text-sm">Check that the API is running.</p>
        </div>
      )}

      {!isLoading && !isError && bookmarks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center max-w-md mx-auto">
          <Inbox size={48} className="mb-4 opacity-30" />
          <p className="font-medium text-gray-600 mb-1">{emptyState.title}</p>
          <p className="text-sm">{emptyState.description}</p>
          {!searchKeyword && selectedFolderId === null && (
            <p className="text-xs mt-2">For local demo data: <code className="bg-gray-100 px-1.5 py-0.5 rounded">python seed_demo.py</code></p>
          )}
        </div>
      )}

      {!isLoading && !isError && bookmarks.length > 0 && (
        <BookmarkSortableContext>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bookmarks.map((bm) => (
                <SortableBookmarkCard
                  key={bm.id}
                  bookmark={bm}
                  isSelected={bm.id === selectedBookmarkId}
                  disabled={!dnd}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bm) => (
                <SortableBookmarkListItem
                  key={bm.id}
                  bookmark={bm}
                  isSelected={bm.id === selectedBookmarkId}
                  disabled={!dnd}
                />
              ))}
            </div>
          )}
        </BookmarkSortableContext>
      )}
    </main>
  )
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

function getDropIndicatorPosition(dnd, sortableId) {
  if (!dnd?.activeBookmark || !dnd?.canReorder || dnd.overTargetId !== sortableId) return null

  const activeIndex = dnd.bookmarks.findIndex((item) => item.id === dnd.activeBookmark.id)
  const overId = Number(String(sortableId).replace('bookmark:', ''))
  const overIndex = dnd.bookmarks.findIndex((item) => item.id === overId)

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return null
  return activeIndex < overIndex ? 'after' : 'before'
}

function SortableBookmarkCard({ bookmark, isSelected, disabled }) {
  const dnd = useBookmarkDnd()
  const sortableId = dnd ? dnd.bookmarkTargetId(bookmark.id) : bookmark.id
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled,
  })
  const dropIndicatorPosition = getDropIndicatorPosition(dnd, sortableId)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('relative', isDragging && 'z-20 opacity-70')}
    >
      {dropIndicatorPosition === 'before' && (
        <div className="absolute inset-x-2 -top-2 z-10 h-1 rounded-full bg-blue-500 shadow-sm" />
      )}
      <BookmarkCard bookmark={bookmark} isSelected={isSelected} dragAttributes={attributes} dragListeners={listeners} />
      {dropIndicatorPosition === 'after' && (
        <div className="absolute inset-x-2 -bottom-2 z-10 h-1 rounded-full bg-blue-500 shadow-sm" />
      )}
    </div>
  )
}

function SortableBookmarkListItem({ bookmark, isSelected, disabled }) {
  const dnd = useBookmarkDnd()
  const sortableId = dnd ? dnd.bookmarkTargetId(bookmark.id) : bookmark.id
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled,
  })
  const dropIndicatorPosition = getDropIndicatorPosition(dnd, sortableId)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={clsx('relative', isDragging && 'z-20 opacity-70')}>
      {dropIndicatorPosition === 'before' && (
        <div className="absolute inset-x-2 -top-1 z-10 h-0.5 rounded-full bg-blue-500" />
      )}
      <BookmarkListItem
        bookmark={bookmark}
        isSelected={isSelected}
        dragAttributes={attributes}
        dragListeners={listeners}
        dragDisabled={disabled}
      />
      {dropIndicatorPosition === 'after' && (
        <div className="absolute inset-x-2 -bottom-1 z-10 h-0.5 rounded-full bg-blue-500" />
      )}
    </div>
  )
}

function BookmarkListItem({ bookmark, isSelected, dragAttributes, dragListeners, dragDisabled }) {
  const openDetail = useAppStore((s) => s.openDetail)
  const deleteMutation = useDeleteBookmark()
  const { addToast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const menuButtonRef = useRef(null)

  async function handleDelete() {
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(bookmark.id)
      addToast('Bookmark deleted', 'success')
    } catch {
      addToast('Failed to delete bookmark', 'error')
    }
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  }

  return (
    <div
      onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
      className={clsx(
        'flex items-center gap-3 bg-white rounded-xl border p-3 cursor-pointer hover:shadow-sm transition-all',
        isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
      )}
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700',
          dragDisabled && 'opacity-40 cursor-not-allowed'
        )}
        title={dragDisabled ? 'Clear tag/search filters to reorder' : 'Drag to reorder'}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical size={16} />
      </button>
      {bookmark.favicon_url && (
        <img
          src={bookmark.favicon_url}
          alt=""
          className="w-5 h-5 shrink-0 object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {bookmark.title || getDomain(bookmark.url)}
        </p>
        <p className="text-xs text-gray-400 truncate">{getDomain(bookmark.url)}</p>
      </div>
      {getBookmarkTags(bookmark).length > 0 && (
        <div className="hidden sm:flex gap-1">
          {getBookmarkTags(bookmark).slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
      <button
        ref={menuButtonRef}
        onClick={(e) => {
          e.stopPropagation()
          const nextOpen = !menuOpen
          if (nextOpen) {
            setAnchorRect(getMenuAnchorRect(e.currentTarget))
          } else {
            setAnchorRect(null)
          }
          setMenuOpen(nextOpen)
        }}
        className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors shrink-0 relative"
      >
        <MoreHorizontal size={16} />
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
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete bookmark?"
        message={`"${bookmark.title || bookmark.url}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
