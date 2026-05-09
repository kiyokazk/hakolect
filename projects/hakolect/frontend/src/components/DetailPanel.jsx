import { useState, useEffect } from 'react'
import { X, ExternalLink, Pencil, Check, ChevronRight, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useBookmark, useUpdateBookmark, useDeleteBookmark } from '../hooks/useBookmarks'
import { useFolders } from '../hooks/useFolders'
import useAppStore from '../store/useAppStore'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

function flattenFolders(folders, depth = 0) {
  const result = []
  for (const f of folders) {
    result.push({ ...f, depth })
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolders(f.children, depth + 1))
    }
  }
  return result
}

export default function DetailPanel() {
  const selectedBookmarkId = useAppStore((s) => s.selectedBookmarkId)
  const detailPanelOpen = useAppStore((s) => s.detailPanelOpen)
  const closeDetail = useAppStore((s) => s.closeDetail)
  const isDesktop = useIsDesktop()

  const { data: bookmark, isLoading } = useBookmark(selectedBookmarkId)
  const { data: folders = [] } = useFolders()
  const updateMutation = useUpdateBookmark()
  const deleteMutation = useDeleteBookmark()
  const { addToast } = useToast()

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!bookmark) return

    setForm({
      title: bookmark.title || '',
      comment: bookmark.comment || '',
      folder_id: bookmark.folder_id ?? '',
      tags: bookmark.tags?.map((t) => t.name) || [],
    })
    setTagInput('')
    setEditMode(false)
  }, [bookmark])

  function resetForm() {
    if (!bookmark) return
    setForm({
      title: bookmark.title || '',
      comment: bookmark.comment || '',
      folder_id: bookmark.folder_id ?? '',
      tags: bookmark.tags?.map((t) => t.name) || [],
    })
    setTagInput('')
  }

  if (!detailPanelOpen || !selectedBookmarkId) return null

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id: selectedBookmarkId,
        data: {
          title: form.title || null,
          comment: form.comment || null,
          folder_id: form.folder_id === '' ? null : Number(form.folder_id),
          tags: form.tags,
        },
      })
      addToast('Saved', 'success')
      setEditMode(false)
    } catch {
      addToast('Failed to save', 'error')
    }
  }

  function addTag(name) {
    const trimmed = name.trim()
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }))
    }
    setTagInput('')
  }

  function removeTag(name) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== name) }))
  }

  async function handleDelete() {
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(selectedBookmarkId)
      closeDetail()
      addToast('Item deleted', 'success')
    } catch {
      addToast('Failed to delete item', 'error')
    }
  }

  const flatFolders = flattenFolders(folders)

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <span className="font-semibold text-gray-900 text-sm">
          {editMode ? 'Edit item' : 'Item details'}
        </span>
        <div className="flex items-center gap-1">
          {!editMode && (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          <button
            onClick={() => { resetForm(); closeDetail(); setEditMode(false) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {bookmark && (
          <>
            {/* OGP image */}
            {bookmark.ogp_image_url && (
              <img
                src={bookmark.ogp_image_url}
                alt=""
                className="w-full h-40 object-cover rounded-lg bg-gray-100"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}

            {/* Title */}
            {editMode ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <h2 className="font-semibold text-gray-900 text-base leading-snug">
                  {bookmark.title || bookmark.url}
                </h2>
              </div>
            )}

            {/* URL */}
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} className="shrink-0" />
              {bookmark.url}
            </a>

            {/* Description */}
            {bookmark.description && !editMode && (
              <p className="text-sm text-gray-600 leading-relaxed">{bookmark.description}</p>
            )}

            {/* Folder */}
            {editMode ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Folder</label>
                <select
                  value={form.folder_id}
                  onChange={(e) => setForm((f) => ({ ...f, folder_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unsorted</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {'  '.repeat(f.depth)}{f.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              bookmark.folder_id && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ChevronRight size={12} />
                  {flatFolders.find((f) => f.id === bookmark.folder_id)?.name || 'Folder'}
                </div>
              )
            )}

            {/* Tags */}
            {editMode ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-blue-900">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  placeholder="Add tag (Enter or comma)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              bookmark.tags && bookmark.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bookmark.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )
            )}

            {/* Comment */}
            {editMode ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comment</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            ) : (
              bookmark.comment && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Comment</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{bookmark.comment}</p>
                </div>
              )
            )}

            {/* Metadata */}
            {!editMode && (
              <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t border-gray-100">
                {bookmark.source && <p>Source: {bookmark.source}</p>}
                <p>Added: {new Date(bookmark.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(bookmark.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer (edit mode) */}
      {editMode && (
        <div className="flex gap-2 p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Check size={14} />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { resetForm(); setEditMode(false) }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this item?"
        message={`"${bookmark?.title || bookmark?.url || 'This item'}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )

  // Desktop: slide-in right panel
  if (isDesktop) {
    return (
      <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col transition-transform">
        {content}
      </div>
    )
  }

  // Mobile: modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => { resetForm(); closeDetail(); setEditMode(false) }} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
        {content}
      </div>
    </div>
  )
}
