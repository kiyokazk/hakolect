import { useState } from 'react'
import { Bookmark, InboxIcon, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { useDroppable } from '@dnd-kit/core'
import FolderTree from './FolderTree'
import { useFolders } from '../hooks/useFolders'
import { useBookmarksStats } from '../hooks/useBookmarks'
import useAppStore from '../store/useAppStore'
import { useBookmarkDnd } from './dnd/BookmarkDndProvider'

function NavItem({ icon, label, count, active, onClick, dropId, recentDrop = false }) {
  const dnd = useBookmarkDnd()
  const { isOver, setNodeRef } = useDroppable({ id: dropId })
  const dropReady = Boolean(dnd?.activeBookmark) && dropId !== 'noop:all'
  const dropActive = dropReady && isOver

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700 font-medium'
          : 'border-transparent text-gray-700 hover:bg-gray-100',
        dropReady && 'border-dashed border-blue-200 bg-blue-50/30',
        dropActive && 'bg-blue-100 ring-2 ring-blue-300 border-blue-400',
        recentDrop && 'border-emerald-200 bg-emerald-50 text-emerald-700'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count != null && (
        <span className={clsx(
          'rounded-full px-1.5 py-0.5 text-xs font-medium',
          recentDrop
            ? 'bg-emerald-100 text-emerald-700'
            : active
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

function SidebarContent() {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const setSelectedFolder = useAppStore((s) => s.setSelectedFolder)
  const closeSidebar = useAppStore((s) => s.closeSidebar)
  const [newFolderRequestKey, setNewFolderRequestKey] = useState(0)

  const { data: foldersData = [] } = useFolders()
  const { data: allData } = useBookmarksStats()
  const dnd = useBookmarkDnd()

  const totalCount = allData?.total
  const unsortedCount = allData?.unsorted_count
  const isDragMode = Boolean(dnd?.activeBookmark)

  function handleNewFolder() {
    setNewFolderRequestKey((current) => current + 1)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto py-3">
      <div className="space-y-0.5 px-3">
        <NavItem
          icon={<Bookmark size={15} />}
          label="All hakolect"
          count={totalCount}
          active={selectedFolderId === null}
          dropId="noop:all"
          onClick={() => { setSelectedFolder(null); closeSidebar() }}
        />
        <NavItem
          icon={<InboxIcon size={15} />}
          label="Unsorted"
          count={unsortedCount}
          active={selectedFolderId === 'unsorted'}
          recentDrop={dnd?.recentDropTargetId === 'unsorted'}
          dropId="folder:unsorted"
          onClick={() => { setSelectedFolder('unsorted'); closeSidebar() }}
        />
      </div>

      <div className="mx-3 my-3 border-t border-gray-200" />
      <div className="px-3">
        <div className="mb-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {isDragMode
            ? 'Drop on a folder or Unsorted to move this item.'
            : 'Items can be dragged into folders. Use Move to... when drag is unavailable.'}
        </div>
        <FolderTree folders={foldersData} newFolderRequestKey={newFolderRequestKey} />
        {foldersData.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">
            No folders yet. Create one below, then drag items here to organize them.
          </p>
        )}
      </div>

      <div className="mx-3 my-3 border-t border-gray-200" />
      <div className="px-3">
        <button
          onClick={handleNewFolder}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Plus size={14} />
          New folder
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const closeSidebar = useAppStore((s) => s.closeSidebar)

  return (
    <>
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeSidebar} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">hakolect</span>
              <button onClick={closeSidebar} className="rounded p-1 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
