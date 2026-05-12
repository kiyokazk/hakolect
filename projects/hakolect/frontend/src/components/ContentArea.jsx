import { useRef, useState } from 'react'
import { LayoutGrid, List, ChevronRight, Inbox, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import BookmarkCard from './BookmarkCard'
import TagFilterBar from './TagFilterBar'
import CardMenu from './CardMenu'
import ConfirmDialog from './ConfirmDialog'
import { useBookmarks, useDeleteBookmark } from '../hooks/useBookmarks'
import { useFolders } from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'

function flattenFolders(folders, depth = 0) {
  const result = []
  for (const f of folders) {
    result.push(f)
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolders(f.children, depth + 1))
    }
  }
  return result
}

function getFolderPath(folders, folderId) {
  const flat = flattenFolders(folders)
  const folder = flat.find((f) => f.id === folderId)
  if (!folder) return []
  const path = [folder]
  let current = folder
  while (current.parent_id) {
    const parent = flat.find((f) => f.id === current.parent_id)
    if (!parent) break
    path.unshift(parent)
    current = parent
  }
  return path
}

export default function ContentArea() {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const selectedBookmarkId = useAppStore((s) => s.selectedBookmarkId)
  const searchKeyword = useAppStore((s) => s.searchKeyword)
  const viewMode = useAppStore((s) => s.viewMode)
  const toggleViewMode = useAppStore((s) => s.toggleViewMode)
  const [activeTag, setActiveTag] = useState(null)

  const { data: foldersData = [] } = useFolders()

  const queryParams = {}
  if (activeTag) queryParams.tag = activeTag

  const { data, isLoading, isError } = useBookmarks(queryParams)
  const bookmarks = data?.items || []
  const total = data?.total || 0

  const activeFolderPath =
    selectedFolderId !== null && selectedFolderId !== 'unsorted'
      ? getFolderPath(foldersData, selectedFolderId)
      : []

  // Breadcrumb
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
      description: 'Drag bookmarks here or add new ones.',
    }
  }

  return (
    <main className="flex-1 min-w-0 p-4 lg:p-6">
      {/* Breadcrumb */}
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

      {/* Tag filter bar */}
      <TagFilterBar activeTag={activeTag} onTagClick={setActiveTag} />

      {/* View toggle */}
      <div className="flex justify-end mb-4">
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

      {/* States */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {bookmarks.map((bm) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                isSelected={bm.id === selectedBookmarkId}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bm) => (
              <BookmarkListItem
                key={bm.id}
                bookmark={bm}
                isSelected={bm.id === selectedBookmarkId}
              />
            ))}
          </div>
        )
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

function BookmarkListItem({ bookmark, isSelected }) {
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
      {bookmark.tags && bookmark.tags.length > 0 && (
        <div className="hidden sm:flex gap-1">
          {bookmark.tags.slice(0, 2).map((t) => (
            <span key={t.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
              {t.name}
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
