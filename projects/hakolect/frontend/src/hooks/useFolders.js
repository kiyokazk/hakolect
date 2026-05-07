import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
} from '../api/folders'

export const FOLDERS_KEY = 'folders'

export function useFolders() {
  return useQuery({
    queryKey: [FOLDERS_KEY],
    queryFn: getFolders,
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDERS_KEY] })
    },
  })
}

export function useUpdateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateFolder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDERS_KEY] })
    },
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDERS_KEY] })
      // Bookmarks may have moved to unsorted
      qc.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })
}

export function useReorderFolders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderFolders,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FOLDERS_KEY] })
    },
  })
}
