export function parseDropTarget(id) {
  if (typeof id !== 'string') return { type: null, value: null }
  if (id.startsWith('folder:')) {
    const value = id.slice('folder:'.length)
    return { type: 'folder', value: value === 'unsorted' ? 'unsorted' : Number(value) }
  }
  if (id.startsWith('bookmark:')) {
    return { type: 'bookmark', value: Number(id.slice('bookmark:'.length)) }
  }
  return { type: null, value: null }
}

export function reorderBookmarksLocally(bookmarks, activeId, overId) {
  const oldIndex = bookmarks.findIndex((bookmark) => bookmark.id === activeId)
  const newIndex = bookmarks.findIndex((bookmark) => bookmark.id === overId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return bookmarks

  const next = [...bookmarks]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  return next
}

export function resolveFolderMove(nextFolderId) {
  return nextFolderId === 'unsorted' ? null : nextFolderId
}
