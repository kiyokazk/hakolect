import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBookmarks, useReorderBookmarks, useUpdateBookmark } from '../../hooks/useBookmarks'
import { useFolders } from '../../hooks/useFolders'
import useAppStore from '../../store/useAppStore'
import { getFolderPath } from '../../utils/folderTree'
import { parseDropTarget, reorderBookmarksLocally, resolveFolderMove } from './bookmarkDndLogic'

const BookmarkDndContext = createContext(null)

export function useBookmarkDnd() {
  return useContext(BookmarkDndContext)
}

function folderTargetId(folderId) {
  return folderId === 'unsorted' ? 'folder:unsorted' : `folder:${folderId}`
}

function bookmarkTargetId(bookmarkId) {
  return `bookmark:${bookmarkId}`
}

export default function BookmarkDndProvider({ children }) {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const searchKeyword = useAppStore((s) => s.searchKeyword)
  const activeTag = useAppStore((s) => s.activeTag)
  const viewMode = useAppStore((s) => s.viewMode)

  const { data: folders = [] } = useFolders()
  const { data } = useBookmarks({})
  const updateBookmark = useUpdateBookmark()
  const reorderBookmarks = useReorderBookmarks()

  const [optimisticBookmarks, setOptimisticBookmarks] = useState([])
  const [activeBookmark, setActiveBookmark] = useState(null)
  const [overTargetId, setOverTargetId] = useState(null)
  const [recentDropTargetId, setRecentDropTargetId] = useState(null)
  const recentDropTimerRef = useRef(null)

  const bookmarks = data?.bookmarks || data?.items || []

  useEffect(() => {
    setOptimisticBookmarks(bookmarks)
  }, [bookmarks])

  useEffect(() => () => {
    if (recentDropTimerRef.current) {
      window.clearTimeout(recentDropTimerRef.current)
    }
  }, [])

  const canReorder = useMemo(() => {
    if (searchKeyword || activeTag) return false
    return selectedFolderId !== null
  }, [activeTag, searchKeyword, selectedFolderId])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  )

  const sortableIds = useMemo(
    () => optimisticBookmarks.map((bookmark) => bookmarkTargetId(bookmark.id)),
    [optimisticBookmarks]
  )

  function flashDropTarget(targetId) {
    if (recentDropTimerRef.current) {
      window.clearTimeout(recentDropTimerRef.current)
    }
    setRecentDropTargetId(targetId)
    recentDropTimerRef.current = window.setTimeout(() => {
      setRecentDropTargetId(null)
      recentDropTimerRef.current = null
    }, 1000)
  }

  async function handleFolderMove(bookmarkId, nextFolderId) {
    const targetFolderId = resolveFolderMove(nextFolderId)
    await updateBookmark.mutateAsync({
      id: bookmarkId,
      data: { folder_id: targetFolderId },
    })
    flashDropTarget(nextFolderId)
  }

  async function handleReorder(activeId, overId) {
    const oldIndex = optimisticBookmarks.findIndex((bookmark) => bookmark.id === activeId)
    const newIndex = optimisticBookmarks.findIndex((bookmark) => bookmark.id === overId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    const next = reorderBookmarksLocally(optimisticBookmarks, activeId, overId)
    setOptimisticBookmarks(next)
    await reorderBookmarks.mutateAsync(
      next.map((bookmark, index) => ({ id: bookmark.id, sort_order: index }))
    )
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveBookmark(null)
    setOverTargetId(null)
    if (!over) {
      setOptimisticBookmarks(bookmarks)
      return
    }

    const activeParsed = parseDropTarget(active.id)
    const overParsed = parseDropTarget(over.id)
    if (activeParsed.type !== 'bookmark') {
      setOptimisticBookmarks(bookmarks)
      return
    }

    if (overParsed.type === 'folder') {
      await handleFolderMove(activeParsed.value, overParsed.value)
      return
    }

    if (overParsed.type === 'bookmark' && canReorder) {
      await handleReorder(activeParsed.value, overParsed.value)
      return
    }

    setOptimisticBookmarks(bookmarks)
  }

  function handleDragStart(event) {
    const activeParsed = parseDropTarget(event.active.id)
    if (activeParsed.type !== 'bookmark') return
    const bookmark = optimisticBookmarks.find((item) => item.id === activeParsed.value)
    setActiveBookmark(bookmark || null)
    setOverTargetId(null)
  }

  function handleDragOver(event) {
    setOverTargetId(typeof event.over?.id === 'string' ? event.over.id : null)
  }

  function handleDragCancel() {
    setActiveBookmark(null)
    setOverTargetId(null)
    setOptimisticBookmarks(bookmarks)
  }

  const contextValue = {
    activeBookmark,
    bookmarks: optimisticBookmarks,
    canReorder,
    folders,
    folderTargetId,
    bookmarkTargetId,
    getFolderPath: (folderId) => getFolderPath(folders, folderId),
    overTargetId,
    recentDropTargetId,
    selectedFolderId,
    sortableIds,
    sortingStrategy: viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy,
  }

  return (
    <BookmarkDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay>
          {activeBookmark ? (
            <div className="max-w-xs rounded-xl border border-blue-300 bg-white px-3 py-2 shadow-xl opacity-95">
              <p className="truncate text-sm font-medium text-gray-900">
                {activeBookmark.title || activeBookmark.url}
              </p>
              <p className="truncate text-xs text-gray-500">{activeBookmark.url}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </BookmarkDndContext.Provider>
  )
}

export function BookmarkSortableContext({ children }) {
  const dnd = useBookmarkDnd()
  if (!dnd) return children

  return (
    <SortableContext items={dnd.sortableIds} strategy={dnd.sortingStrategy}>
      {children}
    </SortableContext>
  )
}
