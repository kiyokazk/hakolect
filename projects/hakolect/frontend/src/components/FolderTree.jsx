import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Download,
  Folder,
  FolderInput,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useDroppable } from '@dnd-kit/core'
import {
  useCreateFolder,
  useDeleteFolder,
  useReorderFolders,
  useUpdateFolder,
} from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'
import {
  collectDescendantIds,
  flattenFolders,
  getNextFolderName,
  getSiblingFolders,
} from '../utils/folderTree'
import { useBookmarkDnd } from './dnd/BookmarkDndProvider'
import { exportFolderData } from '../api/data'

function DraftFolderRow({ depth = 0, parentId = null, initialName, onDone, onCreated }) {
  const createFolder = useCreateFolder()
  const { addToast } = useToast()
  const [name, setName] = useState(initialName)
  const inputRef = useRef(null)
  const submittedRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  async function submit(rawValue) {
    if (cancelledRef.current || submittedRef.current || createFolder.isPending) return

    submittedRef.current = true
    const nextName = rawValue.trim() || initialName

    try {
      const created = await createFolder.mutateAsync({ name: nextName, parent_id: parentId })
      addToast('Folder created', 'success')
      onCreated?.(created)
      onDone()
    } catch {
      submittedRef.current = false
      addToast('Failed to create folder', 'error')
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }

  return (
    <div style={{ paddingLeft: `${depth * 12 + 4}px` }} className="relative">
      <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1.5 text-sm shadow-sm">
        <span className="w-[14px] shrink-0" />
        <FolderOpen size={15} className="shrink-0 text-blue-600" />
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => submit(name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit(name)
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              cancelledRef.current = true
              onDone()
            }
          }}
          className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-sm outline-none ring-0 focus:border-blue-500"
        />
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
          New
        </span>
      </div>
    </div>
  )
}

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
  const [draftChildName, setDraftChildName] = useState(null)

  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()
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

  const isDragMode = Boolean(dnd?.activeBookmark)
  const dropActive = isDragMode && isOver
  const recentDrop = dnd?.recentDropTargetId === folder.id

  function handleSelect() {
    setSelectedFolder(folder.id)
    closeSidebar()
  }

  async function handleRename() {
    const normalizedName = newName.trim() || folder.name
    if (normalizedName === folder.name) {
      setRenaming(false)
      setNewName(folder.name)
      return
    }
    try {
      const updated = await updateFolder.mutateAsync({ id: folder.id, data: { name: normalizedName } })
      addToast(updated?.name !== normalizedName ? `Renamed to ${updated.name}` : 'Folder renamed', 'success')
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

  function handleNewSubfolder() {
    setMenuOpen(false)
    setExpanded(true)
    setMoving(false)
    setDraftChildName(getNextFolderName(getSiblingFolders(tree, folder.id)))
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

  async function handleExportFolder() {
    try {
      await exportFolderData(folder.id)
      setMenuOpen(false)
    } catch (error) {
      addToast(error?.userMessage || 'Failed to export folder', 'error')
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
            'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm transition-colors',
            isSelected
              ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
              : 'border-transparent text-gray-700 hover:bg-gray-100',
            isDragMode && 'border-dashed border-blue-200 bg-blue-50/30',
            dropActive && 'border-blue-400 bg-blue-100 ring-2 ring-blue-300',
            recentDrop && 'border-emerald-200 bg-emerald-50 text-emerald-700'
          )}
          onClick={handleSelect}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className={clsx('shrink-0', !hasChildren && !draftChildName && 'invisible')}
          >
            <ChevronRight
              size={14}
              className={clsx('transition-transform', expanded && 'rotate-90')}
            />
          </button>

          {isSelected ? (
            <FolderOpen size={15} className="shrink-0 text-blue-600" />
          ) : (
            <Folder size={15} className={clsx('shrink-0', recentDrop ? 'text-emerald-600' : 'text-gray-500')} />
          )}

          {renaming ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setRenaming(false)
                  setNewName(folder.name)
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm outline-none"
            />
          ) : (
            <span className="flex-1 truncate">{folder.name}</span>
          )}

          <span
            className={clsx(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
              recentDrop
                ? 'bg-emerald-100 text-emerald-700'
                : isSelected
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
            )}
          >
            {folder.bookmark_count ?? 0}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 max-md:opacity-100"
          >
            <MoreVertical size={13} />
          </button>
        </div>

        {moving && (
          <div className="ml-7 mt-2 space-y-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-blue-800">Move folder</p>
              <button
                onClick={() => {
                  setMoving(false)
                  setTargetParentId(folder.parent_id ?? '')
                }}
                className="rounded p-1 text-blue-700 hover:bg-blue-100"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-blue-700">Choose a new parent folder. Leave empty to move it to the top level.</p>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Check size={14} />
                {updateFolder.isPending ? 'Moving...' : 'Move'}
              </button>
              <button
                onClick={() => {
                  setMoving(false)
                  setTargetParentId(folder.parent_id ?? '')
                }}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="absolute right-2 top-8 z-30 w-44 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false); setMoving(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMoving(true)
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <FolderInput size={13} /> Move to...
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleExportFolder()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Download size={13} /> Export folder
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReorder('up') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <ArrowUp size={13} /> Move up
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReorder('down') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <ArrowDown size={13} /> Move down
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNewSubfolder() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Plus size={13} /> New subfolder
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
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

      {expanded && (
        <div>
          {folder.children?.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              tree={tree}
              flatFolders={flatFolders}
            />
          ))}
          {draftChildName && (
            <DraftFolderRow
              depth={depth + 1}
              parentId={folder.id}
              initialName={draftChildName}
              onDone={() => setDraftChildName(null)}
              onCreated={() => setExpanded(true)}
            />
          )}
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

export default function FolderTree({ folders, newFolderRequestKey = 0 }) {
  const flatFolders = useMemo(() => flattenFolders(folders || []), [folders])
  const [rootDraftName, setRootDraftName] = useState(null)
  const lastRequestRef = useRef(newFolderRequestKey)

  useEffect(() => {
    if (newFolderRequestKey === lastRequestRef.current) return
    lastRequestRef.current = newFolderRequestKey
    setRootDraftName(getNextFolderName(getSiblingFolders(folders || [], null)))
  }, [folders, newFolderRequestKey])

  if ((!folders || folders.length === 0) && !rootDraftName) return null

  return (
    <div className="space-y-0.5" data-folder-count={flatFolders.length}>
      {folders?.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          tree={folders}
          flatFolders={flatFolders}
        />
      ))}
      {rootDraftName && (
        <DraftFolderRow
          initialName={rootDraftName}
          onDone={() => setRootDraftName(null)}
        />
      )}
    </div>
  )
}
