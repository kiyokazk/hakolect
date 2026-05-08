import { useState } from 'react'
import { Bookmark, InboxIcon, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import FolderTree from './FolderTree'
import { useFolders, useCreateFolder } from '../hooks/useFolders'
import { useBookmarksStats } from '../hooks/useBookmarks'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'

function NavItem({ icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count != null && (
        <span className={clsx(
          'text-xs px-1.5 py-0.5 rounded-full font-medium',
          active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
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
  const { addToast } = useToast()

  const { data: foldersData = [] } = useFolders()
  const { data: allData } = useBookmarksStats()
  const createFolder = useCreateFolder()

  const totalCount = allData?.total
  const unsortedCount = allData?.unsorted_count

  async function handleNewFolder() {
    try {
      await createFolder.mutateAsync({ name: 'New folder', parent_id: null })
      addToast('Folder created', 'success')
    } catch {
      addToast('Failed to create folder', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full py-3 overflow-y-auto">
      <div className="px-3 space-y-0.5">
        <NavItem
          icon={<Bookmark size={15} />}
          label="All hakolect"
          count={totalCount}
          active={selectedFolderId === null}
          onClick={() => { setSelectedFolder(null); closeSidebar() }}
        />
        <NavItem
          icon={<InboxIcon size={15} />}
          label="Unsorted"
          count={unsortedCount}
          active={selectedFolderId === 'unsorted'}
          onClick={() => { setSelectedFolder('unsorted'); closeSidebar() }}
        />
      </div>

      {foldersData.length > 0 && (
        <>
          <div className="mx-3 my-3 border-t border-gray-200" />
          <div className="px-3">
            <FolderTree folders={foldersData} />
          </div>
        </>
      )}

      <div className="mx-3 my-3 border-t border-gray-200" />
      <div className="px-3">
        <button
          onClick={handleNewFolder}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={closeSidebar} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-900 text-sm">hakolect</span>
              <button onClick={closeSidebar} className="p-1 rounded hover:bg-gray-100">
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
