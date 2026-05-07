import { useState, useRef } from 'react'
import { ChevronRight, Folder, FolderOpen, MoreVertical, Plus, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useUpdateFolder, useDeleteFolder, useCreateFolder } from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'

function FolderItem({ folder, depth = 0 }) {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const setSelectedFolder = useAppStore((s) => s.setSelectedFolder)
  const closeSidebar = useAppStore((s) => s.closeSidebar)
  const { addToast } = useToast()

  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()
  const createFolder = useCreateFolder()
  const menuRef = useRef(null)
  const isSelected = selectedFolderId === folder.id
  const hasChildren = folder.children && folder.children.length > 0

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
      await deleteFolder.mutateAsync(folder.id)
      addToast('Folder deleted. Bookmarks moved to Unsorted.', 'info')
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

  return (
    <>
      <div
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        className="group relative"
        onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true) }}
      >
        <div
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm',
            isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
          )}
          onClick={handleSelect}
        >
          {/* Expand toggle */}
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

          {/* Context menu trigger */}
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 shrink-0"
          >
            <MoreVertical size={13} />
          </button>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-2 top-8 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 text-sm"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={13} /> Rename
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
            {/* Close on outside click */}
            <div
              className="fixed inset-0 -z-10"
              onClick={() => setMenuOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete folder?"
        message={`"${folder.name}" will be deleted. Bookmarks inside will be moved to Unsorted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

export default function FolderTree({ folders }) {
  if (!folders || folders.length === 0) return null

  return (
    <div className="space-y-0.5">
      {folders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} />
      ))}
    </div>
  )
}
