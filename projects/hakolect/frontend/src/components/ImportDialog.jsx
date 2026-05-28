import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, X } from 'lucide-react'
import { importData, parseImportFile } from '../api/data'
import { useToast } from './Toast'
import { BOOKMARKS_KEY } from '../hooks/useBookmarks'
import { FOLDERS_KEY } from '../hooks/useFolders'

export default function ImportDialog({ onClose }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'confirming' | 'importing'
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)
  const { addToast } = useToast()
  const qc = useQueryClient()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    parseImportFile(file)
      .then((nextPreview) => {
        setPreview(nextPreview)
        setPhase('confirming')
      })
      .catch((error) => {
        addToast(error?.message || 'Invalid file format. Please use a Hakolect export file.', 'error')
      })
      .finally(() => {
        e.target.value = ''
      })
  }

  async function handleConfirmImport() {
    if (!preview?.file) return
    setPhase('importing')
    try {
      const result = await importData(preview.file)
      qc.invalidateQueries({ queryKey: [BOOKMARKS_KEY] })
      qc.invalidateQueries({ queryKey: [FOLDERS_KEY] })
      addToast(
        `Imported: ${result.imported?.bookmarks ?? 0} bookmarks, ${result.imported?.folders ?? 0} folders, ${result.imported?.tags ?? 0} tags. Skipped: ${result.skipped?.bookmarks ?? 0} duplicates.`,
        'success'
      )
      onClose()
    } catch (error) {
      addToast(error?.userMessage || 'Import failed. Please try again.', 'error')
      setPhase('confirming')
    }
  }

  const stats = preview?.stats || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={phase !== 'importing' ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        {phase === 'idle' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Import bookmarks</h2>
              <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a Hakolect JSON export file to import.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-8 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Upload size={18} />
              Choose JSON file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        {(phase === 'confirming' || phase === 'importing') && stats && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Import bookmarks?</h2>
              {phase !== 'importing' && (
                <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3 truncate" title={preview?.fileName}>
              {preview?.fileName}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Bookmarks</span>
                <span className="font-medium">{stats.bookmarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Folders</span>
                <span className="font-medium">{stats.folders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tags</span>
                <span className="font-medium">{stats.tags}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Duplicates (same URL) will be skipped.
              <br />
              Existing folders with the same name will be merged.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                disabled={phase === 'importing'}
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={phase === 'importing'}
                onClick={handleConfirmImport}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 min-w-[80px] flex items-center justify-center transition-colors"
              >
                {phase === 'importing' ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  'Import'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
