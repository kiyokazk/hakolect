import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  FolderInput,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useDroppable } from '@dnd-kit/core'
import {
  useUpdateFolder,
  useDeleteFolder,
  useCreateFolder,
  useReorderFolders,
} from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import {
  collectDescendantIds,
  flattenFolders,
  getSiblingFolders,
} from '../utils/folderTree'
import { useBookmarkDnd } from './dnd/BookmarkDndProvider'

function FolderItem({ folder, depth = 0, tree, flatFolders }) {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const setSelectedFolder = useAppStore((s) => s.setSelectedFolder)
  const closeSidebar = useAppStore((s) => s.closeSidebar)
  const { addToast } = useToast()

  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [moving, setMoving] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [targetParentId, setTargetParentId] = useState(folder.parent_id ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()
  const createFolder = useCreateFolder()
  const reorderFolders = useReorderFolders()
  const dnd = useBookmarkDnd()
  const { isOver, setNodeRef } = useDroppable({ id: dnd ? dnd.folderTargetId(folder.id) : `folder:${folder.id}` })
  const isSelected = selectedFolderId === folder.id
  const hasChildren = folder.children && folder.children.length > 0
  const descendantIds = useMemo(() => new Set(collectDescendantIds(tree, folder.id)), [tree, folder.id])

  const moveCandidates = useMemo(
    () => flatFolders.filter((item) => !descendantIds.has(item.id)),
    [descendantIds, flatFolders]
  )

  function handleSelect() {
    setSelectedFolder(folder.id)
    closeSidebar()
  }

  async function handleRename() {
    if (newName.trim() === folder.name) {
      setRenaming(false)
      return
    }
    try {
      await updateFolder.mutateAsync({ id: folder.id, data: { name: newName.trim() } })
      addToast('Folder renamed', 'success')
    } catch {
      addToast('Failed to rename', 'error')
      setNewName(folder.name)
    }
    setRenaming(false)
  }

  async function handleDelete() {
    setConfirmDelete(false)
    try {
      const result = await deleteFolder.mutateAsync(folder.id)
      const movedCount = result?.moved_bookmarks_count ?? 0
      addToast(
        movedCount > 0
          ? `Folder deleted. ${movedCount} bookmark${movedCount === 1 ? '' : 's'} moved to Unsorted.`
          : 'Folder deleted.',
        'info'
      )
      if (selectedFolderId === folder.id) {
        setSelectedFolder(null)
      }
    } catch {
      addToast('Failed to delete folder', 'error')
    }
  }

  async function handleNewSubfolder() {
    setMenuOpen(false)
    try {
      await createFolder.mutateAsync({ name: 'New folder', parent_id: folder.id })
      setExpanded(true)
      addToast('Subfolder created', 'success')
    } catch {
      addToast('Failed to create subfolder', 'error')
    }
  }

  async function handleMoveFolder() {
    const normalizedParentId = targetParentId === '' ? null : Number(targetParentId)
    const siblingFolders = getSiblingFolders(tree, normalizedParentId)
    const nextSortOrder = siblingFolders.length > 0
      ? Math.max(...siblingFolders.map((item) => item.sort_order)) + 1
      : 0

    try {
      await updateFolder.mutateAsync({
        id: folder.id,
        data: { parent_id: normalizedParentId, sort_order: nextSortOrder },
      })
      addToast('Folder moved', 'success')
      setMoving(false)
      setMenuOpen(false)
    } catch {
      addToast('Failed to move folder', 'error')
    }
  }

  async function handleReorder(direction) {
    const siblings = getSiblingFolders(tree, folder.parent_id ?? null)
    const currentIndex = siblings.findIndex((item) => item.id === folder.id)
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= siblings.length) {
      return
    }

    const reordered = [...siblings]
    ;[reordered[currentIndex], reordered[swapIndex]] = [reordered[swapIndex], reordered[currentIndex]]

    try {
      await reorderFolders.mutateAsync(
        reordered.map((item, index) => ({ id: item.id, sort_order: index }))
      )
      addToast(direction === 'up' ? 'Folder moved up' : 'Folder moved down', 'success')
      setMenuOpen(false)
    } catch {
      addToast('Failed to reorder folder', 'error')
    }
  }

  return (
    <>
      <div
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        className="group relative"
        onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true) }}
      >
        <div
          ref={setNodeRef}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm',
            isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100',
            dnd?.activeBookmark && isOver && 'ring-2 ring-blue-400 bg-blue-50'
          )}
          onClick={handleSelect}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className={clsx('shrink-0', !hasChildren && 'invisible')}
          >
            <ChevronRight
              size={14}
              className={clsx('transition-transform', expanded && 'rotate-90')}
            />
          </button>

          {isSelected ? (
            <FolderOpen size={15} className="shrink-0 text-blue-600" />
          ) : (
            <Folder size={15} className="shrink-0 text-gray-500" />
          )}

          {renaming ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setRenaming(false); setNewName(folder.name) }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white border border-blue-400 rounded px-1 py-0 text-sm outline-none"
            />
          ) : (
            <span className="flex-1 truncate">{folder.name}</span>
          )}

          <span
            className={clsx(
              'text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
              isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            )}
          >
            {folder.bookmark_count ?? 0}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 shrink-0 max-md:opacity-100"
          >
            <MoreVertical size={13} />
          </button>
        </div>

        {moving && (
          <div className="mt-2 ml-7 rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-blue-800">Move folder</p>
              <button
                onClick={() => {
                  setMoving(false)
                  setTargetParentId(folder.parent_id ?? '')
                }}
                className="p-1 rounded text-blue-700 hover:bg-blue-100"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-blue-700">Choose a new parent folder. Leave empty to move it to the top level.</p>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Top level</option>
              {moveCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {'  '.repeat(candidate.depth)}{candidate.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleMoveFolder}
                disabled={updateFolder.isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Check size={14} />
                {updateFolder.isPending ? 'Moving...' : 'Move'}
              </button>
              <button
                onClick={() => {
                  setMoving(false)
                  setTargetParentId(folder.parent_id ?? '')
                }}
                className="px-3 py-2 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="absolute right-2 top-8 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 text-sm">
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false); setMoving(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMoving(true)
                setMenuOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <FolderInput size={13} /> Move to...
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReorder('up') }}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <ArrowUp size={13} /> Move up
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReorder('down') }}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <ArrowDown size={13} /> Move down
            </button>
            <button
              onClick={handleNewSubfolder}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Plus size={13} /> New subfolder
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete
            </button>
            <div
              className="fixed inset-0 -z-10"
              onClick={() => setMenuOpen(false)}
            />
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              tree={tree}
              flatFolders={flatFolders}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete folder?"
        message={`"${folder.name}" and all subfolders will be deleted. Items inside will be moved to Unsorted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

export default function FolderTree({ folders }) {
  if (!folders || folders.length === 0) return null

  const flatFolders = flattenFolders(folders)

  return (
    <div className="space-y-0.5" data-folder-count={flatFolders.length}>
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          tree={folders}
          flatFolders={flatFolders}
        />
      ))}
    </div>
  )
}
