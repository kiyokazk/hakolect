import { create } from 'zustand'

const useAppStore = create((set) => ({
  // Sidebar/navigation state
  selectedFolderId: null, // null = All, 'unsorted' = Unsorted, number = folder id
  searchKeyword: '',
  sidebarOpen: false, // mobile drawer

  // Detail panel
  selectedBookmarkId: null,
  detailPanelOpen: false,
  detailPanelMode: 'detail',

  // View
  viewMode: 'grid', // 'grid' | 'list'

  // Actions
  setSelectedFolder: (folderId) =>
    set({ selectedFolderId: folderId, searchKeyword: '' }),

  setSearchKeyword: (keyword) =>
    set({ searchKeyword: keyword }),

  openDetail: (bookmarkId, mode = 'detail') =>
    set({ selectedBookmarkId: bookmarkId, detailPanelOpen: true, detailPanelMode: mode }),

  closeDetail: () =>
    set({ selectedBookmarkId: null, detailPanelOpen: false, detailPanelMode: 'detail' }),

  toggleViewMode: () =>
    set((state) => ({ viewMode: state.viewMode === 'grid' ? 'list' : 'grid' })),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  closeSidebar: () =>
    set({ sidebarOpen: false }),
}))

export default useAppStore
