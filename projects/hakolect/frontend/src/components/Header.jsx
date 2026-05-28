import { useState, useEffect, useRef } from 'react'
import { BookmarkIcon, Search, Plus, Menu, Database, Download, Upload } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import QuickAddModal from './QuickAddModal'
import ImportDialog from './ImportDialog'
import { exportAllData } from '../api/data'
import { useToast } from './Toast'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function Header() {
  const searchKeyword = useAppStore((s) => s.searchKeyword)
  const setSearchKeyword = useAppStore((s) => s.setSearchKeyword)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const [inputValue, setInputValue] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [dataMenuOpen, setDataMenuOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const dataMenuRef = useRef(null)
  const { addToast } = useToast()

  const debouncedSearch = useDebounce(inputValue, 300)

  useEffect(() => {
    setSearchKeyword(debouncedSearch)
  }, [debouncedSearch, setSearchKeyword])

  useEffect(() => {
    setInputValue(searchKeyword)
  }, [searchKeyword])

  // Close data menu on outside click
  useEffect(() => {
    if (!dataMenuOpen) return
    function handler(e) {
      if (!dataMenuRef.current?.contains(e.target)) setDataMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dataMenuOpen])

  async function handleExport() {
    setDataMenuOpen(false)
    try {
      await exportAllData()
    } catch (error) {
      addToast(error?.userMessage || 'Export failed. Please try again.', 'error')
    }
  }

  function handleImport() {
    setDataMenuOpen(false)
    setImportOpen(true)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <BookmarkIcon size={20} className="text-blue-600" />
          <span className="font-bold text-gray-900 text-lg hidden sm:block">hakolect</span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search saved links..."
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Data management button (secondary, left of Add) */}
        <div className="relative shrink-0" ref={dataMenuRef}>
          <button
            onClick={() => setDataMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-colors"
            title="Data management"
          >
            <Database size={15} />
            <span className="hidden md:block text-xs">Data</span>
          </button>
          {dataMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
              <button
                onClick={handleExport}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} className="shrink-0" />
                Export all data
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={14} className="shrink-0" />
                Import data
              </button>
            </div>
          )}
        </div>

        {/* Add button (primary) */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:block">Add</span>
        </button>
      </header>

      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
    </>
  )
}
