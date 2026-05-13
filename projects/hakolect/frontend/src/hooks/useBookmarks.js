import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  fetchMeta,
  reorderBookmarks,
} from '../api/bookmarks'
import useAppStore from '../store/useAppStore'

export const BOOKMARKS_KEY = 'bookmarks'

export function useBookmarks(params = {}) {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId)
  const searchKeyword = useAppStore((s) => s.searchKeyword)
  const activeTag = useAppStore((s) => s.activeTag)

  const queryParams = {
    ...(selectedFolderId !== null ? { folder_id: selectedFolderId } : {}),
    ...(searchKeyword ? { keyword: searchKeyword } : {}),
    ...(activeTag ? { tag: activeTag } : {}),
    // Use manual sort_order when viewing a specific folder or Unsorted to persist drag-reorder
    ...((typeof selectedFolderId === 'number' || selectedFolderId === 'unsorted')
      ? { sort: 'sort_order' }
      : {}),
    ...params,
  }

  return useQuery({
    queryKey: [BOOKMARKS_KEY, queryParams],
    queryFn: () => getBookmarks(queryParams),
  })
}

export function useBookmark(id) {
  return useQuery({
    queryKey: [BOOKMARKS_KEY, id],
    queryFn: () => getBookmark(id),
    enabled: !!id,
  })
}

export function useCreateBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBookmark,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOOKMARKS_KEY] })
    },
  })
}

export function useUpdateBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateBookmark(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOOKMARKS_KEY] })
    },
  })
}

export function useDeleteBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOOKMARKS_KEY] })
    },
  })
}

// Always fetches global stats (total + unsorted_count) regardless of current folder selection
export function useBookmarksStats() {
  return useQuery({
    queryKey: [BOOKMARKS_KEY, '__stats__'],
    queryFn: () => getBookmarks({ limit: 1 }),
  })
}

export function useFetchMeta() {
  return useMutation({
    mutationFn: fetchMeta,
  })
}

export function useReorderBookmarks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderBookmarks,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOOKMARKS_KEY] })
    },
  })
}
