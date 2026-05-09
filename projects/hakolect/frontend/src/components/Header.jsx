import { useState, useEffect, useCallback } from 'react'
import { BookmarkIcon, Search, Plus, Menu } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import QuickAddModal from './QuickAddModal'

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

  const debouncedSearch = useDebounce(inputValue, 300)

  useEffect(() => {
    setSearchKeyword(debouncedSearch)
  }, [debouncedSearch, setSearchKeyword])

  useEffect(() => {
    setInputValue(searchKeyword)
  }, [searchKeyword])

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

        {/* Add button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:block">Add</span>
        </button>
      </header>

      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}
    </>
  )
}
