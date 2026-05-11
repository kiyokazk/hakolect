import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { useCreateBookmark, useFetchMeta } from '../hooks/useBookmarks'
import { useToast } from './Toast'
import useAppStore from '../store/useAppStore'

function normalizeUrlInput(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export default function QuickAddModal({ onClose }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [duplicateId, setDuplicateId] = useState(null)

  const createMutation = useCreateBookmark()
  const fetchMetaMutation = useFetchMeta()
  const openDetail = useAppStore((s) => s.openDetail)
  const { addToast } = useToast()

  async function handleAdd() {
    setError(null)
    setDuplicateId(null)

    const normalizedUrl = normalizeUrlInput(url)
    if (!normalizedUrl) {
      setError('Please enter a valid http(s) URL')
      return
    }

    let meta = {
      title: null,
      description: null,
      ogp_image_url: null,
      favicon_url: null,
    }
    let metadataSkipped = false

    try {
      meta = await fetchMetaMutation.mutateAsync(normalizedUrl)
    } catch {
      metadataSkipped = true
    }

    try {
      await createMutation.mutateAsync({
        url: normalizedUrl,
        title: meta.title || null,
        description: meta.description || null,
        ogp_image_url: meta.ogp_image_url || null,
        favicon_url: meta.favicon_url || null,
        folder_id: null,
        tags: [],
      })
      setSuccess(true)
      addToast(
        metadataSkipped ? 'Saved to Unsorted (without metadata)' : 'Saved to Unsorted',
        'success'
      )
      setTimeout(onClose, 1200)
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        const existingId = err.response?.data?.detail?.existing_bookmark_id
        setDuplicateId(existingId)
        setError('This URL is already saved.')
      } else {
        setError(err.userMessage || 'Failed to save link')
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }

  const isLoading = fetchMetaMutation.isPending || createMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Quick Add</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-green-600 font-medium mb-1">Saved!</div>
            <p className="text-sm text-gray-500">Saved to Unsorted. Open the item to organize it later.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                autoFocus
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleAdd}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 mt-1">
                {error}
                {duplicateId && (
                  <button
                    onClick={() => { openDetail(duplicateId); onClose() }}
                    className="ml-2 text-blue-600 underline"
                  >
                    View existing
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Saved to Unsorted. Save first, organize later.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
